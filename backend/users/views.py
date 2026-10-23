from django.db import transaction, IntegrityError
from django.utils import timezone
from rest_framework.exceptions import ValidationError, PermissionDenied, NotFound
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import LegalDocument, Profile, UserLegalDocument
from .permissions import HasPrivilege
from .serializers import (
    LegalDocumentSerializer, LoginSerializer, ProfileSerializer,
    RegisterSerializer, UserSerializer, AdminLegalDocumentSerializer, OwnLegalAcceptanceSerializer,
)


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response({
            "message": "Usuario registrado correctamente.",
            "user": UserSerializer(user, context={"request": request}).data,
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        return Response({
            "message": "Inicio de sesión correcto.",
            "access": data["access"], "refresh": data["refresh"],
            "user": UserSerializer(data["user"], context={"request": request}).data,
        })


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Las cuentas creadas por vías distintas al registro pueden no tener perfil.
        Profile.objects.get_or_create(user=request.user)
        return Response(UserSerializer(request.user, context={"request": request}).data)


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user)
        return Response(ProfileSerializer(profile, context={"request": request}).data)

    def patch(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user)
        serializer = ProfileSerializer(profile, data=request.data, partial=True, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class LegalDocumentsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        documents = LegalDocument.objects.filter(is_active=True, published_at__lte=timezone.now())
        return Response(LegalDocumentSerializer(documents, many=True, context={"request": request}).data)


class LegalAdminPermissionMixin:
    permission_classes = [IsAuthenticated, HasPrivilege]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def check_privilege(self, request, code):
        from .services import get_user_privilege_codes
        if code not in get_user_privilege_codes(request.user):
            raise PermissionDenied("No tienes el privilegio necesario para realizar esta acción.")


class AdminLegalDocumentsView(LegalAdminPermissionMixin, APIView):
    required_privilege = "documentos_legales.ver"

    def get_permissions(self):
        self.required_privilege = "documentos_legales.crear" if self.request.method == "POST" else "documentos_legales.ver"
        return super().get_permissions()

    def get(self, request):
        return Response(AdminLegalDocumentSerializer(LegalDocument.objects.all(), many=True, context={"request": request}).data)

    def post(self, request):
        serializer = AdminLegalDocumentSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        obj = serializer.save(is_active=False)
        return Response(AdminLegalDocumentSerializer(obj, context={"request": request}).data, status=status.HTTP_201_CREATED)


class AdminLegalDocumentDetailView(LegalAdminPermissionMixin, APIView):
    required_privilege = "documentos_legales.editar"

    def patch(self, request, pk):
        with transaction.atomic():
            obj = LegalDocument.objects.select_for_update().filter(pk=pk).first()
            if not obj:
                raise NotFound("Documento inexistente.")
            if obj.user_acceptances.exists():
                raise ValidationError("Los documentos aceptados son inmutables.")
            if obj.is_active:
                raise ValidationError("Desactiva primero el documento antes de editarlo.")
            serializer = AdminLegalDocumentSerializer(obj, data=request.data, partial=True, context={"request": request})
            serializer.is_valid(raise_exception=True)
            serializer.save()
        return Response(serializer.data)


class AdminLegalDocumentPublishView(LegalAdminPermissionMixin, APIView):
    required_privilege = "documentos_legales.publicar"

    def post(self, request, pk):
        # Lock all rows of this type and the target before replacing the active version.
        # PostgreSQL serializes concurrent publications via advisory transaction lock per type.
        from django.db import connection
        with transaction.atomic():
            obj = LegalDocument.objects.filter(pk=pk).first()
            if obj is None:
                raise NotFound("Documento inexistente.")
            if obj.published_at > timezone.now():
                raise ValidationError("Todavía no llega la fecha de publicación. Publica cuando comience su vigencia.")
            if connection.vendor == "postgresql":
                with connection.cursor() as cursor:
                    cursor.execute("SELECT pg_advisory_xact_lock(%s, %s)", [42781, 1 if obj.type == LegalDocument.Type.TERMS else 2])
            obj = LegalDocument.objects.select_for_update().get(pk=pk)
            LegalDocument.objects.filter(type=obj.type, is_active=True).exclude(pk=obj.pk).update(is_active=False)
            if not obj.is_active:
                obj.is_active = True
                obj.save(update_fields=["is_active"])
        return Response(AdminLegalDocumentSerializer(obj, context={"request": request}).data)


class AdminLegalDocumentDeactivateView(LegalAdminPermissionMixin, APIView):
    required_privilege = "documentos_legales.desactivar"

    def post(self, request, pk):
        with transaction.atomic():
            obj = LegalDocument.objects.select_for_update().filter(pk=pk).first()
            if obj is None:
                raise NotFound("Documento inexistente.")
            if obj.is_active:
                obj.is_active = False
                obj.save(update_fields=["is_active"])
        return Response(AdminLegalDocumentSerializer(obj, context={"request": request}).data)


class OwnLegalAcceptanceView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = OwnLegalAcceptanceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        document_id = serializer.validated_data["document_id"]
        with transaction.atomic():
            doc = LegalDocument.objects.select_for_update().filter(pk=document_id).first()
            if doc is None:
                raise NotFound("Documento inexistente.")
            now = timezone.now()
            if not doc.is_active or doc.published_at > now:
                raise ValidationError("Este documento no está vigente. Actualiza los documentos legales.")
            obj, created = UserLegalDocument.objects.get_or_create(user=request.user, document=doc)
        return Response({"document_id": doc.pk, "accepted_at": obj.accepted_at, "already_accepted": not created}, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
