from django.db import transaction, IntegrityError
from django.utils import timezone
from rest_framework.exceptions import ValidationError, PermissionDenied, NotFound
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import LegalDocument, Privilege, Profile, Role, RolePrivilege, User, UserLegalDocument, UserPrivilege, UserRole
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



class AdminPrivilegesListView(APIView):
    permission_classes = [IsAuthenticated, HasPrivilege]
    required_privilege = "modificar_privilegios"

    def get(self, request):
        from .serializers import PrivilegeSerializer

        privileges = Privilege.objects.all().order_by("id")
        return Response(PrivilegeSerializer(privileges, many=True).data)


class AdminRolesView(APIView):
    permission_classes = [IsAuthenticated, HasPrivilege]
    required_privilege = "modificar_privilegios"

    def get(self, request):
        from .serializers import AdminRoleSerializer

        roles = Role.objects.all().order_by("name")
        return Response(AdminRoleSerializer(roles, many=True).data)

    def post(self, request):
        from .serializers import AdminRoleSerializer

        serializer = AdminRoleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        role = serializer.save()
        return Response(AdminRoleSerializer(role).data, status=status.HTTP_201_CREATED)


class AdminRoleDetailView(APIView):
    permission_classes = [IsAuthenticated, HasPrivilege]
    required_privilege = "modificar_privilegios"

    def patch(self, request, pk):
        from .serializers import AdminRoleSerializer
        from .services import get_user_privilege_codes

        with transaction.atomic():
            role = Role.objects.select_for_update().filter(pk=pk).first()
            if not role:
                raise NotFound("Rol inexistente.")
            is_admin_role = role.name.strip().lower() == "administrador"
            is_own_admin_role = is_admin_role and UserRole.objects.filter(user=request.user, role=role).exists()
            previous_codes = set(get_user_privilege_codes(request.user))

            serializer = AdminRoleSerializer(role, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            role = serializer.save()

            remaining_codes = set(get_user_privilege_codes(request.user))
            if (is_own_admin_role and (not role.is_active or not previous_codes.issubset(remaining_codes))) or (
                "modificar_privilegios" not in remaining_codes
            ):
                raise ValidationError(
                    "No puedes desactivar el rol de administrador ni quitarle sus privilegios base."
                )

        return Response(AdminRoleSerializer(role).data)


class AdminUsersRolesView(APIView):
    permission_classes = [IsAuthenticated, HasPrivilege]
    required_privilege = "modificar_privilegios"

    def get(self, request):
        from .serializers import AdminUserRolesSerializer

        users = User.objects.prefetch_related("user_roles__role", "user_privileges").order_by("email")
        return Response(AdminUserRolesSerializer(users, many=True).data)


class AdminUserRoleUpdateView(APIView):
    permission_classes = [IsAuthenticated, HasPrivilege]
    required_privilege = "modificar_privilegios"

    def put(self, request, pk):
        from .serializers import AdminUserRolesSerializer, UserRoleAssignmentUpdateSerializer
        from .services import get_user_privilege_codes

        serializer = UserRoleAssignmentUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        desired_role_ids = set(serializer.validated_data["role_ids"])
        has_revoked = "revoked_privilege_ids" in serializer.validated_data
        has_granted = "granted_privilege_ids" in serializer.validated_data
        revoked_ids = set(serializer.validated_data.get("revoked_privilege_ids") or [])
        granted_ids = set(serializer.validated_data.get("granted_privilege_ids") or [])

        with transaction.atomic():
            target_user = User.objects.select_for_update().filter(pk=pk).first()
            if not target_user:
                raise NotFound("Usuario inexistente.")

            existing_ids = set(
                UserRole.objects.filter(user=target_user).values_list("role_id", flat=True)
            )

            if target_user.pk == request.user.pk:
                admin_role_ids = set(
                    Role.objects.filter(name__iexact="administrador").values_list("id", flat=True)
                )
                protected_role_ids = existing_ids & admin_role_ids
                if not protected_role_ids.issubset(desired_role_ids):
                    raise ValidationError(
                        "No puedes quitarte el rol de administrador jamás."
                    )
                admin_priv_ids = set(
                    RolePrivilege.objects.filter(
                        role_id__in=(protected_role_ids or admin_role_ids)
                    ).values_list("privilege_id", flat=True)
                )
                if revoked_ids & admin_priv_ids:
                    raise ValidationError(
                        "No puedes deshabilitar los privilegios propios del rol de administrador."
                    )
                admin_priv_codes = set(
                    Privilege.objects.filter(id__in=admin_priv_ids).values_list("code", flat=True)
                )

            UserRole.objects.filter(user=target_user).exclude(role_id__in=desired_role_ids).delete()
            for role_id in desired_role_ids - existing_ids:
                UserRole.objects.create(user=target_user, role_id=role_id)

            if has_revoked or has_granted:
                keep_ids = revoked_ids | granted_ids
                UserPrivilege.objects.filter(user=target_user).exclude(privilege_id__in=keep_ids).delete()
                for priv_id in revoked_ids:
                    UserPrivilege.objects.update_or_create(
                        user=target_user,
                        privilege_id=priv_id,
                        defaults={"is_enabled": False},
                    )
                for priv_id in granted_ids:
                    UserPrivilege.objects.update_or_create(
                        user=target_user,
                        privilege_id=priv_id,
                        defaults={"is_enabled": True},
                    )

            if target_user.pk == request.user.pk:
                remaining_codes = set(get_user_privilege_codes(request.user))
                if (
                    "modificar_privilegios" not in remaining_codes
                    or (protected_role_ids and not admin_priv_codes.issubset(remaining_codes))
                ):
                    raise ValidationError(
                        "No puedes quitarte el rol de administrador ni deshabilitar los privilegios del rol administrador."
                    )

        target_user.refresh_from_db()
        return Response(AdminUserRolesSerializer(target_user).data)
