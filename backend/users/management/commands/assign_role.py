from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from users.models import Role, User, UserRole


class Command(BaseCommand):
    help = "Asigna un rol a un usuario por correo electrónico."

    def add_arguments(self, parser):
        parser.add_argument("--email", required=True, help="Correo electrónico del usuario")
        parser.add_argument("--role", required=True, help="Nombre del rol a asignar (Administrador, Coordinador, Ponente, Evaluador)")

    @transaction.atomic
    def handle(self, *args, **options):
        email = options["email"]
        role_name = options["role"]

        user = User.objects.filter(email__iexact=email).first()
        if not user:
            raise CommandError(f"No existe ningún usuario con el correo: {email}")

        role = Role.objects.filter(name__iexact=role_name).first()
        if not role:
            valid_roles = list(Role.objects.values_list("name", flat=True))
            raise CommandError(f"El rol '{role_name}' no existe. Roles válidos: {valid_roles}")

        user_role, created = UserRole.objects.get_or_create(user=user, role=role)
        if created:
            self.stdout.write(self.style.SUCCESS(f"Rol '{role.name}' asignado correctamente al usuario {user.email}."))
        else:
            self.stdout.write(self.style.WARNING(f"El usuario {user.email} ya contaba con el rol '{role.name}'."))
