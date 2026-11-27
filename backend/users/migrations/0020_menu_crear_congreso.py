from django.db import migrations

# BORRADOR local: acceso desde el menú a la pantalla de crear congreso (privilegio ya existente `crear_congreso`).
RUTA = "/configuraciones/crear-congreso"


def crear(apps, schema_editor):
    alias = schema_editor.connection.alias
    Privilege = apps.get_model("users", "Privilege")
    Menu = apps.get_model("users", "Menu")
    MenuPrivilege = apps.get_model("users", "MenuPrivilege")
    priv, _ = Privilege.objects.using(alias).get_or_create(code="crear_congreso", defaults={"name": "crear_congreso"})
    menu, _ = Menu.objects.using(alias).update_or_create(
        route=RUTA, defaults={"name": "Crear Congreso", "icon": "add_circle", "order": 46, "is_active": True})
    MenuPrivilege.objects.using(alias).get_or_create(menu=menu, privilege=priv)


def quitar(apps, schema_editor):
    apps.get_model("users", "Menu").objects.using(schema_editor.connection.alias).filter(route=RUTA).delete()


class Migration(migrations.Migration):
    dependencies = [("users", "0019_privilegios_solicitud_rol")]
    operations = [migrations.RunPython(crear, quitar)]
