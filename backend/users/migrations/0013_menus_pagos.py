from django.db import migrations

# BORRADOR local: menús del módulo de pagos (proceso «ADMIN PAGOS» del Drive).
MENUS_PAGOS = [
    ("/pagos/mis-pagos", "Mis Pagos", "payments", 32, ("solicitud_pago",)),
    ("/pagos/validacion", "Validación de Pagos", "fact_check", 33, ("admin_pagos",)),
]


def crear_menus_pagos(apps, schema_editor):
    alias = schema_editor.connection.alias
    Menu = apps.get_model("users", "Menu")
    MenuPrivilege = apps.get_model("users", "MenuPrivilege")
    Privilege = apps.get_model("users", "Privilege")
    for route, name, icon, order, codes in MENUS_PAGOS:
        menu, _ = Menu.objects.using(alias).update_or_create(
            route=route, defaults={"name": name, "icon": icon, "order": order, "is_active": True}
        )
        for priv in Privilege.objects.using(alias).filter(code__in=codes):
            MenuPrivilege.objects.using(alias).get_or_create(menu=menu, privilege=priv)


def quitar_menus_pagos(apps, schema_editor):
    Menu = apps.get_model("users", "Menu")
    Menu.objects.using(schema_editor.connection.alias).filter(route__in=[m[0] for m in MENUS_PAGOS]).delete()


class Migration(migrations.Migration):
    dependencies = [("users", "0012_link_menus_to_real_privileges")]
    operations = [migrations.RunPython(crear_menus_pagos, quitar_menus_pagos)]
