from django.db import migrations

# BORRADOR local: se retira el menú "Personalización del Sitio" (decisión del 22-nov-2026). La landing se edita con el
# privilegio `diseño_pagina` directamente desde la página de inicio, así que ese privilegio se conserva.
RUTA = "/configuraciones/personalizacion"


def quitar(apps, schema_editor):
    alias = schema_editor.connection.alias
    Menu = apps.get_model("users", "Menu")
    apps.get_model("users", "MenuPrivilege").objects.using(alias).filter(menu__route=RUTA).delete()
    Menu.objects.using(alias).filter(route=RUTA).delete()


class Migration(migrations.Migration):
    dependencies = [("users", "0015_autorizar_constancias")]
    operations = [migrations.RunPython(quitar, migrations.RunPython.noop)]
