# backend/users/models.py

from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    email = models.EmailField(
        unique=True,
        verbose_name="correo electrónico",
    )

    maternal_last_name = models.CharField(
        max_length=150,
        blank=True,
        verbose_name="apellido materno",
    )

    accepted_terms = models.BooleanField(
        default=False,
        verbose_name="aceptó términos y condiciones",
    )

    accepted_privacy_notice = models.BooleanField(
        default=False,
        verbose_name="aceptó aviso de privacidad",
    )

    terms_accepted_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    privacy_notice_accepted_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    def __str__(self):
        return self.email

class Profile(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="profile",
        verbose_name="usuario",
    )

    state = models.ForeignKey(
        "catalogs.State",
        on_delete=models.PROTECT,
        related_name="profiles",
        null=True,
        blank=True,
        verbose_name="estado",
    )

    institution = models.ForeignKey(
        "catalogs.Institution",
        on_delete=models.PROTECT,
        related_name="profiles",
        null=True,
        blank=True,
        verbose_name="institución",
    )

    academic_level = models.ForeignKey(
        "catalogs.AcademicLevel",
        on_delete=models.PROTECT,
        related_name="profiles",
        null=True,
        blank=True,
        verbose_name="nivel académico",
    )

    profile_picture = models.ImageField(
        upload_to="profiles/",
        null=True,
        blank=True,
        verbose_name="foto de perfil",
    )

    mobile_phone = models.CharField(
        max_length=20,
        blank=True,
        verbose_name="teléfono móvil",
    )

    phone = models.CharField(
        max_length=20,
        blank=True,
        verbose_name="teléfono fijo",
    )

    biography = models.TextField(
        blank=True,
        verbose_name="semblanza",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    def __str__(self):
        return f"Perfil de {self.user.username}"

    class Meta:
        verbose_name = "perfil"
        verbose_name_plural = "perfiles"

class UserArea(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="user_areas",
        verbose_name="usuario",
    )

    area = models.ForeignKey(
        "catalogs.Area",
        on_delete=models.PROTECT,
        related_name="user_areas",
        verbose_name="área",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    def __str__(self):
        return f"{self.user.username} - {self.area.name}"

    class Meta:
        verbose_name = "área de usuario"
        verbose_name_plural = "áreas de usuario"

        constraints = [
            models.UniqueConstraint(
                fields=["user", "area"],
                name="unique_user_area",
            )
        ]

class Role(models.Model):
    name = models.CharField(
        max_length=100,
        unique=True,
        verbose_name="nombre del rol",
    )

    description = models.TextField(
        blank=True,
        verbose_name="descripción",
    )

    is_active = models.BooleanField(
        default=True,
        verbose_name="activo",
    )

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "rol"
        verbose_name_plural = "roles"
        ordering = ["name"]

class Privilege(models.Model):
    code = models.CharField(
        max_length=100,
        unique=True,
        verbose_name="clave del privilegio",
    )

    name = models.CharField(
        max_length=150,
        verbose_name="nombre del privilegio",
    )

    description = models.TextField(
        blank=True,
        verbose_name="descripción",
    )

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "privilegio"
        verbose_name_plural = "privilegios"
        ordering = ["name"]

class UserRole(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="user_roles",
        verbose_name="usuario",
    )

    role = models.ForeignKey(
        Role,
        on_delete=models.PROTECT,
        related_name="user_roles",
        verbose_name="rol",
    )

    assigned_at = models.DateTimeField(
        auto_now_add=True,
    )

    def __str__(self):
        return f"{self.user.username} - {self.role.name}"

    class Meta:
        verbose_name = "rol de usuario"
        verbose_name_plural = "roles de usuario"

        constraints = [
            models.UniqueConstraint(
                fields=["user", "role"],
                name="unique_user_role",
            )
        ]

class RolePrivilege(models.Model):
    role = models.ForeignKey(
        Role,
        on_delete=models.CASCADE,
        related_name="role_privileges",
        verbose_name="rol",
    )

    privilege = models.ForeignKey(
        Privilege,
        on_delete=models.PROTECT,
        related_name="role_privileges",
        verbose_name="privilegio",
    )

    def __str__(self):
        return f"{self.role.name} - {self.privilege.name}"

    class Meta:
        verbose_name = "privilegio de rol"
        verbose_name_plural = "privilegios de rol"

        constraints = [
            models.UniqueConstraint(
                fields=["role", "privilege"],
                name="unique_role_privilege",
            )
        ]