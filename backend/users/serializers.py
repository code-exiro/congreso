# backend/users/serializers.py

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import serializers

from .models import Role, UserRole


User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        min_length=8,
    )

    password_confirm = serializers.CharField(
        write_only=True,
    )

    class Meta:
        model = User
        fields = (
            "username",
            "email",
            "first_name",
            "last_name",
            "maternal_last_name",
            "password",
            "password_confirm",
            "accepted_terms",
            "accepted_privacy_notice",
        )

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({
                "password_confirm": "Las contraseñas no coinciden."
            })

        if not attrs.get("accepted_terms"):
            raise serializers.ValidationError({
                "accepted_terms": "Debes aceptar los términos y condiciones."
            })

        if not attrs.get("accepted_privacy_notice"):
            raise serializers.ValidationError({
                "accepted_privacy_notice": "Debes aceptar el aviso de privacidad."
            })

        return attrs

    def create(self, validated_data):
        validated_data.pop("password_confirm")

        password = validated_data.pop("password")

        now = timezone.now()

        validated_data["terms_accepted_at"] = now
        validated_data["privacy_notice_accepted_at"] = now

        user = User.objects.create_user(
            password=password,
            **validated_data
        )

        role, _ = Role.objects.get_or_create(
            name="Ponente",
            defaults={
                "description": "Rol asignado automáticamente a usuarios registrados.",
                "is_active": True,
            }
        )

        UserRole.objects.get_or_create(
            user=user,
            role=role,
        )

        return user

class UserSerializer(serializers.ModelSerializer):
    roles = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "maternal_last_name",
            "roles",
        )

    def get_roles(self, obj):
        return [
            user_role.role.name
            for user_role in obj.user_roles.select_related("role").all()
        ]


