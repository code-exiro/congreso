"""Une las dos ramas de migraciones de `users`: la del equipo (perfil: estatus académico y campus) y la de trabajos/evaluación."""
from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0014_profile_campus"),
        ("users", "0021_menu_fechas_importantes"),
    ]
    operations = []
