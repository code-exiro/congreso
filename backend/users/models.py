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