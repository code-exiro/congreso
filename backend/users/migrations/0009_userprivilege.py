from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0008_roles_and_privileges_catalog"),
    ]

    operations = [
        migrations.CreateModel(
            name="UserPrivilege",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "is_enabled",
                    models.BooleanField(
                        default=True,
                        verbose_name="habilitado para este usuario",
                    ),
                ),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "privilege",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="user_privileges",
                        to="users.privilege",
                        verbose_name="privilegio",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="user_privileges",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="usuario",
                    ),
                ),
            ],
            options={
                "verbose_name": "privilegio personalizado de usuario",
                "verbose_name_plural": "privilegios personalizados de usuario",
                "constraints": [
                    models.UniqueConstraint(
                        fields=("user", "privilege"),
                        name="unique_user_privilege",
                    )
                ],
            },
        ),
    ]
