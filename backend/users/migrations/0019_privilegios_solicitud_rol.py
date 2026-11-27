from django.db import migrations

# BORRADOR local: privilegios y menús de "Solicitud de rol" (ponente) y de la bandeja del coordinador (22-nov-2026).
PRIVILEGIOS = {
    "solicitar_rol": ("permite pedir al coordinador un rol adicional y ver el historial de esas solicitudes", ["ponente"]),
    "gestionar_solicitudes_rol": ("permite aceptar (asignando el rol al instante) o rechazar las solicitudes de rol de los usuarios", ["coordinador"]),
}
MENUS = [
    ("/configuraciones/solicitud-rol", "Solicitud de Rol", "badge", 44, "solicitar_rol"),
    ("/configuraciones/solicitudes-roles", "Solicitudes de Roles", "rule", 45, "gestionar_solicitudes_rol"),
]


def crear(apps, schema_editor):
    alias = schema_editor.connection.alias
    Privilege = apps.get_model("users", "Privilege")
    Role = apps.get_model("users", "Role")
    RolePrivilege = apps.get_model("users", "RolePrivilege")
    Menu = apps.get_model("users", "Menu")
    MenuPrivilege = apps.get_model("users", "MenuPrivilege")
    privs = {}
    for codigo, (descripcion, roles) in PRIVILEGIOS.items():
        privs[codigo], _ = Privilege.objects.using(alias).get_or_create(code=codigo, defaults={"name": codigo, "description": descripcion})
        for rol in Role.objects.using(alias).filter(name__in=roles + [r.title() for r in roles]):
            RolePrivilege.objects.using(alias).get_or_create(role=rol, privilege=privs[codigo])
    for ruta, nombre, icono, orden, codigo in MENUS:
        menu, _ = Menu.objects.using(alias).update_or_create(route=ruta, defaults={"name": nombre, "icon": icono, "order": orden, "is_active": True})
        MenuPrivilege.objects.using(alias).get_or_create(menu=menu, privilege=privs[codigo])


def quitar(apps, schema_editor):
    alias = schema_editor.connection.alias
    apps.get_model("users", "Menu").objects.using(alias).filter(route__in=[m[0] for m in MENUS]).delete()
    apps.get_model("users", "RolePrivilege").objects.using(alias).filter(privilege__code__in=list(PRIVILEGIOS)).delete()
    apps.get_model("users", "Privilege").objects.using(alias).filter(code__in=list(PRIVILEGIOS)).delete()


class Migration(migrations.Migration):
    dependencies = [("users", "0018_solicitudrol")]
    operations = [migrations.RunPython(crear, quitar)]
