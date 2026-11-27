import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0017_autorizar_constancias_coordinador"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="SolicitudRol",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("motivo", models.TextField(blank=True, max_length=500, verbose_name="motivo de la solicitud")),
                ("estado", models.CharField(choices=[("pendiente", "Pendiente"), ("aprobada", "Aprobada"), ("rechazada", "Rechazada")], default="pendiente", max_length=10, verbose_name="estado")),
                ("comentario_resolucion", models.TextField(blank=True, max_length=500, verbose_name="comentario de la resolución")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="fecha de solicitud")),
                ("resuelta_at", models.DateTimeField(blank=True, null=True, verbose_name="fecha de resolución")),
                ("resuelta_por", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="solicitudes_rol_resueltas", to=settings.AUTH_USER_MODEL, verbose_name="resuelta por")),
                ("rol", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="solicitudes", to="users.role", verbose_name="rol solicitado")),
                ("usuario", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="solicitudes_rol", to=settings.AUTH_USER_MODEL, verbose_name="usuario")),
            ],
            options={
                "verbose_name": "solicitud de rol",
                "verbose_name_plural": "solicitudes de rol",
                "ordering": ["-created_at"],
                "constraints": [models.UniqueConstraint(condition=models.Q(("estado", "pendiente")), fields=("usuario", "rol"), name="unica_solicitud_rol_pendiente")],
            },
        ),
    ]
