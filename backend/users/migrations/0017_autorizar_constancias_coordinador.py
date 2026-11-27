from django.db import migrations

# BORRADOR local: la autorización de constancias corresponde al COORDINADOR, no al administrador (aclaración del 22-nov-2026).
CODIGO = "autorizar_constancias"


def mover(apps, schema_editor):
    alias = schema_editor.connection.alias
    Privilege = apps.get_model("users", "Privilege")
    Role = apps.get_model("users", "Role")
    RolePrivilege = apps.get_model("users", "RolePrivilege")
    priv = Privilege.objects.using(alias).filter(code=CODIGO).first()
    if not priv:
        return
    RolePrivilege.objects.using(alias).filter(privilege=priv, role__name__iexact="administrador").delete()
    for rol in Role.objects.using(alias).filter(name__iexact="coordinador"):
        RolePrivilege.objects.using(alias).get_or_create(role=rol, privilege=priv)


class Migration(migrations.Migration):
    dependencies = [("users", "0016_quitar_menu_personalizacion")]
    operations = [migrations.RunPython(mover, migrations.RunPython.noop)]
