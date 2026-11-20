from django.db import migrations


MENU_REAL_PRIVILEGES = [
    ("/perfil", "Mi Perfil", "person", 2, ("modificar_perfil",)),
    (
        "/trabajos/mis-solicitudes",
        "Mis Solicitudes y Trabajos",
        "description",
        10,
        ("subir_trabajo", "ver_sus_trabajos", "ver_su_historial", "solicitud_pago"),
    ),
    (
        "/trabajos/solicitudes",
        "Listado de Solicitudes",
        "list_alt",
        11,
        ("evaluar_general", "asignar_evaluador"),
    ),
    (
        "/trabajos/activos",
        "Trabajos Activos",
        "task_alt",
        12,
        ("evaluar_general", "asignar_evaluador"),
    ),
    (
        "/evaluaciones/asignadas",
        "Mis Evaluaciones Asignadas",
        "rate_review",
        20,
        ("evaluar_trabajo", "ver_sus_evaluaciones"),
    ),
    (
        "/eventos/asistencia",
        "Registro de Asistencia",
        "how_to_reg",
        30,
        ("subir_trabajo", "ver_sus_trabajos", "ver_su_historial"),
    ),
    (
        "/eventos/constancias",
        "Mis Constancias",
        "workspace_premium",
        31,
        ("ver_sus_constancias",),
    ),
    (
        "/configuraciones/roles-privilegios",
        "Roles y privilegios",
        "shield",
        40,
        ("modificar_privilegios",),
    ),
    (
        "/configuraciones/limite-evaluaciones",
        "Límite de Evaluaciones",
        "tune",
        41,
        ("asignar_evaluador", "crear_congreso", "modificar_fechas"),
    ),
    (
        "/configuraciones/documentos-legales",
        "Documentos Legales",
        "gavel",
        42,
        ("documentos_legales.ver",),
    ),
    (
        "/configuraciones/personalizacion",
        "Personalización del Sitio",
        "palette",
        43,
        ("diseño_pagina", "crear_congreso", "modificar_fechas"),
    ),
]

AUXILIARY_PRIVILEGE_CODES = (
    "perfil.ver",
    "trabajos.mis_solicitudes",
    "trabajos.listado_solicitudes",
    "trabajos.activos",
    "evaluaciones.mis_asignadas",
    "eventos.asistencia",
    "eventos.mis_constancias",
    "configuraciones.roles_usuarios",
    "configuraciones.limite_evaluaciones",
    "configuraciones.personalizacion",
)


def link_menus_to_real_privileges(apps, schema_editor):
    alias = schema_editor.connection.alias
    Menu = apps.get_model("users", "Menu")
    MenuPrivilege = apps.get_model("users", "MenuPrivilege")
    Privilege = apps.get_model("users", "Privilege")
    RolePrivilege = apps.get_model("users", "RolePrivilege")
    UserPrivilege = apps.get_model("users", "UserPrivilege")

    # 1. Enlazar cada menú directamente a los privilegios reales del sistema
    for route, name, icon, order, priv_codes in MENU_REAL_PRIVILEGES:
        menu, _ = Menu.objects.using(alias).update_or_create(
            route=route,
            defaults={
                "name": name,
                "icon": icon,
                "order": order,
                "is_active": True,
            },
        )
        privs = list(Privilege.objects.using(alias).filter(code__in=priv_codes))
        priv_ids = [p.pk for p in privs]
        MenuPrivilege.objects.using(alias).filter(menu=menu).exclude(
            privilege_id__in=priv_ids
        ).delete()
        for priv in privs:
            MenuPrivilege.objects.using(alias).get_or_create(
                menu=menu,
                privilege=priv,
            )

    # 2. Desactivar el menú duplicado obsoleto /configuraciones/roles-usuarios
    obsolete_menus = Menu.objects.using(alias).filter(
        route="/configuraciones/roles-usuarios"
    )
    MenuPrivilege.objects.using(alias).filter(menu__in=obsolete_menus).delete()
    obsolete_menus.update(is_active=False)

    # 3. Limpiar los 10 códigos auxiliares artificiales creados en 0011
    aux_ids = list(
        Privilege.objects.using(alias)
        .filter(code__in=AUXILIARY_PRIVILEGE_CODES)
        .values_list("id", flat=True)
    )
    if aux_ids:
        MenuPrivilege.objects.using(alias).filter(privilege_id__in=aux_ids).delete()
        RolePrivilege.objects.using(alias).filter(privilege_id__in=aux_ids).delete()
        UserPrivilege.objects.using(alias).filter(privilege_id__in=aux_ids).delete()
        Privilege.objects.using(alias).filter(id__in=aux_ids).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0011_seed_role_menus"),
    ]

    operations = [
        migrations.RunPython(link_menus_to_real_privileges, migrations.RunPython.noop),
    ]
