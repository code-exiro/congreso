from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from .models import LegalDocument, Menu, Profile, Role, UserLegalDocument, UserRole
from .services import effective_profile_status, get_user_menus, get_user_privilege_codes


User = get_user_model()


class ProfileSerializer(serializers.ModelSerializer):
    country = serializers.IntegerField(source="state.country_id", read_only=True, default=None)
    is_complete = serializers.SerializerMethodField()
    basic_profile_complete = serializers.SerializerMethodField()
    legal_complete = serializers.SerializerMethodField()
    pending_legal_document_ids = serializers.SerializerMethodField()
    unavailable_legal_types = serializers.SerializerMethodField()

    def _status(self, obj):
        return effective_profile_status(obj.user, obj)

    def get_is_complete(self, obj):
        return self._status(obj)["is_complete"]

    def get_basic_profile_complete(self, obj):
        return self._status(obj)["basic_profile_complete"]

    def get_legal_complete(self, obj):
        return self._status(obj)["legal_complete"]

    def get_pending_legal_document_ids(self, obj):
        return self._status(obj)["pending_legal_document_ids"]

    def get_unavailable_legal_types(self, obj):
        return self._status(obj)["unavailable_legal_types"]

    class Meta:
        model = Profile
        fields = (
            "id", "state", "country", "institution", "academic_level", "dialing_code",
            "profile_picture", "mobile_phone", "phone", "biography", "is_complete",
            "basic_profile_complete", "legal_complete", "pending_legal_document_ids", "unavailable_legal_types",
            "created_at", "updated_at",
        )
        read_only_fields = ("id", "country", "is_complete", "basic_profile_complete", "legal_complete", "pending_legal_document_ids", "unavailable_legal_types", "created_at", "updated_at")


class MenuSerializer(serializers.ModelSerializer):
    class Meta:
        model = Menu
        fields = ("id", "name", "route", "icon", "order")


class LegalDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = LegalDocument
        fields = ("id", "type", "version", "name", "file", "published_at")
        read_only_fields = fields


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8, trim_whitespace=False)
    password_confirm = serializers.CharField(write_only=True, trim_whitespace=False)
    accepted_terms = serializers.BooleanField(write_only=True, required=True)
    accepted_privacy_notice = serializers.BooleanField(write_only=True, required=True)
    terms_document_id = serializers.IntegerField(write_only=True, min_value=1)
    privacy_document_id = serializers.IntegerField(write_only=True, min_value=1)

    class Meta:
        model = User
        fields = (
            "email", "first_name", "last_name", "maternal_last_name", "password",
            "password_confirm", "accepted_terms", "accepted_privacy_notice",
            "terms_document_id", "privacy_document_id",
        )
        extra_kwargs = {
            "first_name": {"required": True, "allow_blank": False},
            "last_name": {"required": True, "allow_blank": False},
        }

    def validate_email(self, value):
        value = User.objects.normalize_email(value)
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Ya existe una cuenta con este correo electrónico.")
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": "Las contraseñas no coinciden."})
        if not attrs["accepted_terms"]:
            raise serializers.ValidationError({"accepted_terms": "Debes aceptar los términos y condiciones."})
        if not attrs["accepted_privacy_notice"]:
            raise serializers.ValidationError({"accepted_privacy_notice": "Debes aceptar el aviso de privacidad."})
        candidate = User(**{
            key: attrs.get(key, "")
            for key in ("email", "first_name", "last_name", "maternal_last_name")
        })
        try:
            validate_password(attrs["password"], user=candidate)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"password": exc.messages}) from exc
        return attrs

    def create(self, validated_data):
        data = dict(validated_data)
        data.pop("password_confirm")
        data.pop("accepted_terms")
        data.pop("accepted_privacy_notice")
        terms_id = data.pop("terms_document_id")
        privacy_id = data.pop("privacy_document_id")
        password = data.pop("password")
        try:
            with transaction.atomic():
                now = timezone.now()
                documents = {
                    document.type: document
                    for document in LegalDocument.objects.select_for_update().filter(
                        is_active=True, published_at__lte=now,
                    ).order_by("id")
                }
                expected = (
                    (LegalDocument.Type.TERMS, terms_id, "terms_document_id"),
                    (LegalDocument.Type.PRIVACY_NOTICE, privacy_id, "privacy_document_id"),
                )
                for document_type, document_id, field in expected:
                    document = documents.get(document_type)
                    if document is None:
                        raise serializers.ValidationError({field: "No hay un documento vigente publicado para el registro."})
                    if document.pk != document_id:
                        raise serializers.ValidationError({field: "El documento cambió. Consulta y acepta la versión vigente."})

                role, _ = Role.objects.get_or_create(
                    name="Ponente",
                    defaults={"description": "Rol asignado automáticamente a usuarios registrados.", "is_active": True},
                )
                role = Role.objects.select_for_update().get(pk=role.pk)
                if not role.is_active:
                    raise serializers.ValidationError({"role": "El registro está temporalmente deshabilitado: el rol Ponente está inactivo."})

                user = User.objects.create_user(password=password, **data)
                Profile.objects.create(user=user)
                UserRole.objects.create(user=user, role=role)
                for document_type, _, _ in expected:
                    UserLegalDocument.objects.create(user=user, document=documents[document_type], accepted_at=now)
                return user
        except IntegrityError as exc:
            if User.objects.filter(email__iexact=data["email"]).exists():
                raise serializers.ValidationError({"email": "Ya existe una cuenta con este correo electrónico."}) from exc
            raise


class UserSerializer(serializers.ModelSerializer):
    roles = serializers.SerializerMethodField()
    privileges = serializers.SerializerMethodField()
    menus = serializers.SerializerMethodField()
    profile = ProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ("id", "email", "first_name", "last_name", "maternal_last_name", "roles", "privileges", "menus", "profile")
        read_only_fields = fields

    def get_roles(self, obj):
        if not obj.is_active:
            return []
        return list(obj.user_roles.filter(role__is_active=True).order_by("role__name").values_list("role__name", flat=True))

    def get_privileges(self, obj):
        return get_user_privilege_codes(obj)

    def get_menus(self, obj):
        return MenuSerializer(get_user_menus(obj), many=True).data


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        user = authenticate(
            request=self.context.get("request"),
            email=User.objects.normalize_email(attrs["email"]),
            password=attrs["password"],
        )
        if user is None or not user.is_active:
            raise serializers.ValidationError("Correo o contraseña incorrectos.")
        refresh = RefreshToken.for_user(user)
        return {"user": user, "access": str(refresh.access_token), "refresh": str(refresh)}


class AdminLegalDocumentSerializer(serializers.ModelSerializer):
    has_acceptances = serializers.SerializerMethodField()

    class Meta:
        model = LegalDocument
        fields = ("id", "type", "version", "name", "file", "published_at", "is_active", "has_acceptances")
        read_only_fields = ("id", "is_active", "has_acceptances")
        validators = []
        extra_kwargs = {
            "type": {"validators": []},
        }

    def get_has_acceptances(self, obj):
        return obj.user_acceptances.exists()

    def validate(self, attrs):
        if self.instance and self.instance.user_acceptances.exists():
            raise serializers.ValidationError("Un documento con aceptaciones no puede editarse.")
        doc_type = attrs.get("type", self.instance.type if self.instance else None)
        version = attrs.get("version", self.instance.version if self.instance else None)
        if doc_type and version:
            existing = LegalDocument.objects.filter(type=doc_type, version=version)
            if self.instance:
                existing = existing.exclude(pk=self.instance.pk)
            if existing.exists():
                raise serializers.ValidationError({"version": "Ya existe esta versión para este tipo de documento."})
        return attrs


class OwnLegalAcceptanceSerializer(serializers.Serializer):
    document_id = serializers.IntegerField(min_value=1)
