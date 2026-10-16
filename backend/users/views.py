from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import LegalDocument, Profile
from .serializers import (
    LegalDocumentSerializer, LoginSerializer, ProfileSerializer,
    RegisterSerializer, UserSerializer,
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
