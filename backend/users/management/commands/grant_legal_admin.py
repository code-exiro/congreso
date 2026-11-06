
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from users.models import Privilege, Role, RolePrivilege, User, UserRole

CODES = (
    "inicio_sesion",
    "modificar_perfil",
    "modificar_privilegios",
    "ver_reportes",
    "crear_congreso",
    "modificar_fechas",
    "diseño_pagina",
    "documentos_legales.ver",
    "documentos_legales.crear",
    "documentos_legales.editar",
    "documentos_legales.publicar",
    "documentos_legales.desactivar",
)


class Command(BaseCommand):
    help = "Asigna explícitamente permisos de documentos legales y administración a un superusuario existente (idempotente)."

    def add_arguments(self, parser):
        parser.add_argument("--email", required=True, help="Correo de superusuario ya creado")

    @transaction.atomic
    def handle(self, *args, **options):
        user = User.objects.filter(
            email__iexact=options["email"],
            is_active=True,
            is_superuser=True
        ).first()

        if not user:
            raise CommandError("Debe existir un superusuario activo con ese correo. No se creó ninguna cuenta.")

        privs = list(Privilege.objects.filter(code__in=CODES))

        if len(privs) != len(CODES):
            raise CommandError("Faltan privilegios; ejecuta las migraciones primero.")

        role, _ = Role.objects.get_or_create(
            name="administrador",
            defaults={
                "description": "Administrador del sistema encargado de administrar el contenido, las configuraciones y los documentos legales del congreso.",
                "is_active": True,
            },
        )

        if not role.is_active:
            raise CommandError("El rol administrador está desactivado.")

        for privilege in privs:
            RolePrivilege.objects.get_or_create(role=role, privilege=privilege)

        UserRole.objects.get_or_create(user=user, role=role)

        self.stdout.write(
            self.style.SUCCESS(
                "Permisos legales y rol Administrador asignados a la cuenta indicada."
            )
        )
