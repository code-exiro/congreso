from django.db import migrations

# BORRADOR local: pantalla para capturar las fechas importantes (plazos del proceso) de cada congreso.
RUTA = "/configuraciones/fechas-importantes"


def crear(apps, schema_editor):
    alias = schema_editor.connection.alias
    Privilege = apps.get_model("users", "Privilege")
    Menu = apps.get_model("users", "Menu")
    MenuPrivilege = apps.get_model("users", "MenuPrivilege")
    priv, _ = Privilege.objects.using(alias).get_or_create(code="modificar_fechas", defaults={"name": "modificar_fechas"})
    menu, _ = Menu.objects.using(alias).update_or_create(
        route=RUTA, defaults={"name": "Fechas Importantes", "icon": "event", "order": 47, "is_active": True})
    MenuPrivilege.objects.using(alias).get_or_create(menu=menu, privilege=priv)


def quitar(apps, schema_editor):
    apps.get_model("users", "Menu").objects.using(schema_editor.connection.alias).filter(route=RUTA).delete()


class Migration(migrations.Migration):
    dependencies = [("users", "0020_menu_crear_congreso")]
    operations = [migrations.RunPython(crear, quitar)]
