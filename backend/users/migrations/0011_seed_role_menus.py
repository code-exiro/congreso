from django.db import migrations

SECTIONS_CONFIG = [
    ('Mi Perfil', '/perfil', 'Principal', 'person', 2, ['perfil.ver'], ['administrador', 'coordinador', 'evaluador', 'ponente', 'Administrador', 'Coordinador', 'Evaluador', 'Ponente']),
    ('Mis Solicitudes y Trabajos', '/trabajos/mis-solicitudes', 'Trabajos y Solicitudes', 'description', 10, ['trabajos.mis_solicitudes'], ['ponente', 'Ponente']),
    ('Listado de Solicitudes', '/trabajos/solicitudes', 'Trabajos y Solicitudes', 'list_alt', 11, ['trabajos.listado_solicitudes'], ['coordinador', 'Coordinador']),
    ('Trabajos Activos', '/trabajos/activos', 'Trabajos y Solicitudes', 'task_alt', 12, ['trabajos.activos'], ['coordinador', 'Coordinador']),
    ('Mis Evaluaciones Asignadas', '/evaluaciones/asignadas', 'Evaluaciones', 'rate_review', 20, ['evaluaciones.mis_asignadas'], ['evaluador', 'Evaluador']),
    ('Registro de Asistencia', '/eventos/asistencia', 'Eventos y Constancias', 'how_to_reg', 30, ['eventos.asistencia'], ['ponente', 'Ponente']),
    ('Mis Constancias', '/eventos/constancias', 'Eventos y Constancias', 'workspace_premium', 31, ['eventos.mis_constancias'], ['ponente', 'Ponente']),
    ('Roles y Usuarios', '/configuraciones/roles-usuarios', 'Configuraciones', 'manage_accounts', 40, ['configuraciones.roles_usuarios'], ['administrador', 'Administrador']),
    ('Límite de Evaluaciones', '/configuraciones/limite-evaluaciones', 'Configuraciones', 'tune', 41, ['configuraciones.limite_evaluaciones'], ['coordinador', 'administrador', 'Coordinador', 'Administrador']),
    ('Documentos Legales', '/configuraciones/documentos-legales', 'Configuraciones', 'gavel', 42, ['documentos_legales.ver'], ['administrador', 'Administrador']),
    ('Personalización del Sitio', '/configuraciones/personalizacion', 'Configuraciones', 'palette', 43, ['configuraciones.personalizacion'], ['coordinador', 'administrador', 'Coordinador', 'Administrador']),
]


def seed_menus(apps, schema_editor):
    alias = schema_editor.connection.alias
    Role = apps.get_model('users', 'Role')
    Privilege = apps.get_model('users', 'Privilege')
    RolePrivilege = apps.get_model('users', 'RolePrivilege')
    Menu = apps.get_model('users', 'Menu')
    MenuPrivilege = apps.get_model('users', 'MenuPrivilege')

    for name, route, category, icon, order, priv_codes, role_names in SECTIONS_CONFIG:
        menu, _ = Menu.objects.using(alias).get_or_create(
            route=route,
            defaults={'name': name, 'icon': icon, 'order': order, 'is_active': True},
        )
        menu.name = name
        menu.icon = icon
        menu.order = order
        menu.is_active = True
        menu.save(using=alias)

        for priv_code in priv_codes:
            priv, _ = Privilege.objects.using(alias).get_or_create(
                code=priv_code,
                defaults={'name': name},
            )
            MenuPrivilege.objects.using(alias).get_or_create(menu=menu, privilege=priv)

            for r_name in role_names:
                role = Role.objects.using(alias).filter(name__iexact=r_name, is_active=True).first()
                if role:
                    RolePrivilege.objects.using(alias).get_or_create(role=role, privilege=priv)


class Migration(migrations.Migration):
    dependencies = [
        ('users', '0010_merge_20261106_0048'),
    ]

    operations = [
        migrations.RunPython(seed_menus, migrations.RunPython.noop),
    ]
