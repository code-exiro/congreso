# backend/users/admin.py

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import Profile, User, UserArea

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        (
            "Información adicional",
            {
                "fields": (
                    "maternal_last_name",
                    "accepted_terms",
                    "accepted_privacy_notice",
                    "terms_accepted_at",
                    "privacy_notice_accepted_at",
                    "created_at",
                )
            },
        ),
    )

    readonly_fields = (
        "created_at",
        "terms_accepted_at",
        "privacy_notice_accepted_at",
    )


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "academic_level",
        "institution",
        "state",
    )

    search_fields = (
        "user__username",
        "user__email",
        "institution__name",
    )

    list_filter = (
        "academic_level",
        "institution",
        "state",
    )


@admin.register(UserArea)
class UserAreaAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "area",
        "created_at",
    )

    search_fields = (
        "user__username",
        "user__email",
        "area__name",
    )

    list_filter = ("area",)






