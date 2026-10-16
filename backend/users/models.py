from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models.functions import Lower
from django.utils import timezone

from .managers import UserManager


class User(AbstractUser):
    username = None
    email = models.EmailField(unique=True, verbose_name="correo electrónico")
    maternal_last_name = models.CharField(max_length=150, blank=True, verbose_name="apellido materno")

    # Histórico anterior al versionado. Las nuevas aceptaciones se guardan en
    # UserLegalDocument; estos campos se conservan para no perder información.
    accepted_terms = models.BooleanField(default=False, verbose_name="aceptó términos y condiciones")
    accepted_privacy_notice = models.BooleanField(default=False, verbose_name="aceptó aviso de privacidad")
    terms_accepted_at = models.DateTimeField(null=True, blank=True)
    privacy_notice_accepted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []
    objects = UserManager()

    def clean(self):
        super().clean()
        self.email = self.__class__.objects.normalize_email(self.email)

    def save(self, *args, **kwargs):
        self.email = self.__class__.objects.normalize_email(self.email)
        return super().save(*args, **kwargs)

    def __str__(self):
        return self.email

    class Meta(AbstractUser.Meta):
        constraints = [models.UniqueConstraint(Lower("email"), name="unique_user_email_ci")]


class Profile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile", verbose_name="usuario")
    state = models.ForeignKey("catalogs.State", on_delete=models.PROTECT, related_name="profiles", null=True, blank=True, verbose_name="estado")
    institution = models.ForeignKey("catalogs.Institution", on_delete=models.PROTECT, related_name="profiles", null=True, blank=True, verbose_name="institución")
    academic_level = models.ForeignKey("catalogs.AcademicLevel", on_delete=models.PROTECT, related_name="profiles", null=True, blank=True, verbose_name="nivel académico")
    dialing_code = models.CharField(max_length=10, blank=True, verbose_name="lada")
    profile_picture = models.ImageField(upload_to="profiles/", null=True, blank=True, verbose_name="foto de perfil")
    mobile_phone = models.CharField(max_length=20, blank=True, verbose_name="teléfono móvil")
    phone = models.CharField(max_length=20, blank=True, verbose_name="teléfono fijo")
    biography = models.TextField(blank=True, verbose_name="semblanza")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_complete = models.BooleanField(default=False, editable=False, verbose_name="perfil completo")

    def calculate_is_complete(self):
        return bool(
            self.state_id and self.institution_id and self.academic_level_id
            and self.dialing_code.strip() and self.mobile_phone.strip()
        )

    def save(self, *args, **kwargs):
        self.is_complete = self.calculate_is_complete()
        if kwargs.get("update_fields") is not None:
            kwargs["update_fields"] = set(kwargs["update_fields"]) | {"is_complete"}
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"Perfil de {self.user.email}"

    class Meta:
        verbose_name = "perfil"
        verbose_name_plural = "perfiles"


class UserArea(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="user_areas", verbose_name="usuario")
    area = models.ForeignKey("catalogs.Area", on_delete=models.PROTECT, related_name="user_areas", verbose_name="área")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.email} - {self.area.name}"

    class Meta:
        verbose_name = "área de usuario"
        verbose_name_plural = "áreas de usuario"
        constraints = [models.UniqueConstraint(fields=["user", "area"], name="unique_user_area")]


class Role(models.Model):
    name = models.CharField(max_length=100, unique=True, verbose_name="nombre del rol")
    description = models.TextField(blank=True, verbose_name="descripción")
    is_active = models.BooleanField(default=True, verbose_name="activo")

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "rol"
        verbose_name_plural = "roles"
        ordering = ["name"]


class Privilege(models.Model):
    code = models.CharField(max_length=100, unique=True, verbose_name="clave del privilegio")
    name = models.CharField(max_length=150, verbose_name="nombre del privilegio")
    description = models.TextField(blank=True, verbose_name="descripción")

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "privilegio"
        verbose_name_plural = "privilegios"
        ordering = ["name"]


class UserRole(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="user_roles", verbose_name="usuario")
    role = models.ForeignKey(Role, on_delete=models.PROTECT, related_name="user_roles", verbose_name="rol")
    assigned_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.email} - {self.role.name}"

    class Meta:
        verbose_name = "rol de usuario"
        verbose_name_plural = "roles de usuario"
        constraints = [models.UniqueConstraint(fields=["user", "role"], name="unique_user_role")]


class RolePrivilege(models.Model):
    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name="role_privileges", verbose_name="rol")
    privilege = models.ForeignKey(Privilege, on_delete=models.PROTECT, related_name="role_privileges", verbose_name="privilegio")

    def __str__(self):
        return f"{self.role.name} - {self.privilege.name}"

    class Meta:
        verbose_name = "privilegio de rol"
        verbose_name_plural = "privilegios de rol"
        constraints = [models.UniqueConstraint(fields=["role", "privilege"], name="unique_role_privilege")]


class Menu(models.Model):
    name = models.CharField(max_length=150, verbose_name="nombre del menú")
    route = models.CharField(max_length=255, unique=True, verbose_name="ruta")
    icon = models.CharField(max_length=100, blank=True, verbose_name="icono")
    order = models.PositiveIntegerField(default=0, verbose_name="orden")
    is_active = models.BooleanField(default=True, verbose_name="activo")

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "menú"
        verbose_name_plural = "menús"
        ordering = ["order", "id"]


class MenuPrivilege(models.Model):
    menu = models.ForeignKey(Menu, on_delete=models.CASCADE, related_name="menu_privileges", verbose_name="menú")
    privilege = models.ForeignKey(Privilege, on_delete=models.PROTECT, related_name="menu_privileges", verbose_name="privilegio")

    def __str__(self):
        return f"{self.menu.name} - {self.privilege.code}"

    class Meta:
        verbose_name = "privilegio de menú"
        verbose_name_plural = "privilegios de menú"
        constraints = [models.UniqueConstraint(fields=["menu", "privilege"], name="unique_menu_privilege")]


class LegalDocument(models.Model):
    class Type(models.TextChoices):
        TERMS = "TERMS", "Términos y condiciones"
        PRIVACY_NOTICE = "PRIVACY_NOTICE", "Aviso de privacidad"

    type = models.CharField(max_length=30, choices=Type.choices, verbose_name="tipo")
    version = models.CharField(max_length=50, verbose_name="versión")
    name = models.CharField(max_length=255, verbose_name="nombre del documento")
    file = models.FileField(upload_to="legal_documents/%Y/%m/", verbose_name="archivo")
    published_at = models.DateTimeField(default=timezone.now, verbose_name="fecha de publicación")
    is_active = models.BooleanField(default=True, verbose_name="activo")

    def clean(self):
        super().clean()
        if not self.pk or not self.user_acceptances.exists():
            return
        previous = type(self).objects.get(pk=self.pk)
        frozen_fields = ("type", "version", "name", "file", "published_at")
        if any(getattr(previous, field) != getattr(self, field) for field in frozen_fields) or not self.file._committed:
            raise ValidationError("Este documento ya tiene aceptaciones. Publica una versión nueva para cambiar su contenido.")

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.get_type_display()} — {self.version}"

    class Meta:
        verbose_name = "documento legal"
        verbose_name_plural = "documentos legales"
        ordering = ["type", "-published_at", "-id"]
        constraints = [
            models.UniqueConstraint(fields=["type", "version"], name="unique_legal_document_version"),
            models.UniqueConstraint(fields=["type"], condition=models.Q(is_active=True), name="unique_active_legal_document_type"),
        ]


class UserLegalDocument(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="legal_acceptances", verbose_name="usuario")
    document = models.ForeignKey(LegalDocument, on_delete=models.PROTECT, related_name="user_acceptances", verbose_name="documento legal")
    accepted_at = models.DateTimeField(default=timezone.now, editable=False, verbose_name="fecha de aceptación")

    def clean(self):
        super().clean()
        if self.pk:
            previous = type(self).objects.get(pk=self.pk)
            if any(getattr(previous, field) != getattr(self, field) for field in ("user_id", "document_id", "accepted_at")):
                raise ValidationError("Una aceptación registrada no se puede modificar.")

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user.email} — {self.document}"

    class Meta:
        verbose_name = "aceptación de documento legal"
        verbose_name_plural = "aceptaciones de documentos legales"
        constraints = [models.UniqueConstraint(fields=["user", "document"], name="unique_user_legal_document")]
