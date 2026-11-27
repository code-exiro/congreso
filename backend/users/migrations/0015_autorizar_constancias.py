from django.db import migrations

# BORRADOR local: privilegio y menú para que el administrador autorice la liberación de constancias (minuta 1-oct-2026).
CODIGO = "autorizar_constancias"
DESCRIPCION = ("permite autorizar, después de validar el pago y la culminación del trabajo, la liberación de las constancias "
               "de cada participante, y retirar esa autorización")
RUTA = "/eventos/autorizacion-constancias"


def crear(apps, schema_editor):
    alias = schema_editor.connection.alias
    Privilege = apps.get_model("users", "Privilege")
    Role = apps.get_model("users", "Role")
    RolePrivilege = apps.get_model("users", "RolePrivilege")
    Menu = apps.get_model("users", "Menu")
    MenuPrivilege = apps.get_model("users", "MenuPrivilege")
    priv, _ = Privilege.objects.using(alias).get_or_create(code=CODIGO, defaults={"name": CODIGO, "description": DESCRIPCION})
    for rol in Role.objects.using(alias).filter(name__iexact="coordinador"):
        RolePrivilege.objects.using(alias).get_or_create(role=rol, privilege=priv)
    menu, _ = Menu.objects.using(alias).update_or_create(
        route=RUTA, defaults={"name": "Autorización de Constancias", "icon": "verified", "order": 34, "is_active": True}
    )
    MenuPrivilege.objects.using(alias).get_or_create(menu=menu, privilege=priv)


def quitar(apps, schema_editor):
    alias = schema_editor.connection.alias
    apps.get_model("users", "Menu").objects.using(alias).filter(route=RUTA).delete()
    Privilege = apps.get_model("users", "Privilege")
    apps.get_model("users", "RolePrivilege").objects.using(alias).filter(privilege__code=CODIGO).delete()
    Privilege.objects.using(alias).filter(code=CODIGO).delete()


class Migration(migrations.Migration):
    dependencies = [("users", "0014_user_confirmed_adult")]
    operations = [migrations.RunPython(crear, quitar)]
