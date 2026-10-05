# backend/users/admin.py

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


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