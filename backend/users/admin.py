from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .forms import CustomUserChangeForm, CustomUserCreationForm
from .models import (
    LegalDocument, Menu, MenuPrivilege, Privilege, Profile, Role,
    RolePrivilege, User, UserArea, UserLegalDocument, UserRole,
)


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    form = CustomUserChangeForm
    add_form = CustomUserCreationForm
    list_display = ("email", "first_name", "last_name", "is_active", "is_staff")
    ordering = ("email",)
    search_fields = ("email", "first_name", "last_name", "maternal_last_name")
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Información personal", {"fields": ("first_name", "last_name", "maternal_last_name")}),
        ("Permisos de Django", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Fechas", {"fields": ("last_login", "date_joined", "created_at")}),
        ("Aceptaciones anteriores al versionado (histórico)", {
            "classes": ("collapse",),
            "fields": ("accepted_terms", "accepted_privacy_notice", "terms_accepted_at", "privacy_notice_accepted_at"),
        }),
    )
    add_fieldsets = ((None, {"classes": ("wide",), "fields": (
        "email", "first_name", "last_name", "maternal_last_name", "password1", "password2",
    )}),)
    readonly_fields = (
        "last_login", "date_joined", "created_at", "accepted_terms",
        "accepted_privacy_notice", "terms_accepted_at", "privacy_notice_accepted_at",
    )

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        Profile.objects.get_or_create(user=obj)


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "academic_level", "institution", "state", "is_complete")
    search_fields = ("user__email", "institution__name")
    list_filter = ("is_complete", "academic_level", "institution", "state")
    readonly_fields = ("is_complete", "created_at", "updated_at")


@admin.register(UserArea)
class UserAreaAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "area", "created_at")
    search_fields = ("user__email", "area__name")
    list_filter = ("area",)


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "is_active")
    search_fields = ("name",)


@admin.register(Privilege)
class PrivilegeAdmin(admin.ModelAdmin):
    list_display = ("id", "code", "name")
    search_fields = ("code", "name")


@admin.register(UserRole)
class UserRoleAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "role", "assigned_at")
    list_filter = ("role",)
    search_fields = ("user__email", "role__name")


@admin.register(RolePrivilege)
class RolePrivilegeAdmin(admin.ModelAdmin):
    list_display = ("id", "role", "privilege")
    list_filter = ("role",)
    search_fields = ("role__name", "privilege__name", "privilege__code")


@admin.register(Menu)
class MenuAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "route", "order", "is_active")
    list_filter = ("is_active",)
    search_fields = ("name", "route")
    ordering = ("order", "id")


@admin.register(MenuPrivilege)
class MenuPrivilegeAdmin(admin.ModelAdmin):
    list_display = ("id", "menu", "privilege")
    list_filter = ("menu",)
    search_fields = ("menu__name", "privilege__code")


@admin.register(LegalDocument)
class LegalDocumentAdmin(admin.ModelAdmin):
    list_display = ("id", "type", "version", "name", "published_at", "is_active")
    list_filter = ("type", "is_active")
    search_fields = ("name", "version")

    def get_readonly_fields(self, request, obj=None):
        if obj and obj.user_acceptances.exists():
            return ("type", "version", "name", "file", "published_at")
        return ()


@admin.register(UserLegalDocument)
class UserLegalDocumentAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "document", "accepted_at")
    list_filter = ("document__type",)
    search_fields = ("user__email", "document__name", "document__version")
    readonly_fields = ("user", "document", "accepted_at")

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
