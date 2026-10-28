from django.db import migrations

ROLES = [
    ("Administrador", "Administrador del sistema con acceso total a configuraciones y documentos legales."),
    ("Coordinador", "Coordinador de área o evento."),
    ("Ponente", "Rol asignado automáticamente a usuarios registrados."),
    ("Evaluador", "Evaluador de ponencias y trabajos."),
]

LEGAL_PRIVILEGES = [
    "documentos_legales.ver",
    "documentos_legales.crear",
    "documentos_legales.editar",
    "documentos_legales.publicar",
    "documentos_legales.desactivar",
]


def create_roles_and_menus(apps, schema_editor):
    alias = schema_editor.connection.alias
    Role = apps.get_model("users", "Role")
    Privilege = apps.get_model("users", "Privilege")
    RolePrivilege = apps.get_model("users", "RolePrivilege")
    Menu = apps.get_model("users", "Menu")
    MenuPrivilege = apps.get_model("users", "MenuPrivilege")
    User = apps.get_model("users", "User")
    UserRole = apps.get_model("users", "UserRole")

    # 1. Crear roles iniciales requeridos
    roles_dict = {}
    for name, description in ROLES:
        role, _ = Role.objects.using(alias).get_or_create(
            name=name,
            defaults={"description": description, "is_active": True},
        )
        if not role.is_active:
            role.is_active = True
            role.save(using=alias)
        roles_dict[name] = role

    # 2. Asignar privilegios legales al rol Administrador
    admin_role = roles_dict["Administrador"]
    for code in LEGAL_PRIVILEGES:
        privilege = Privilege.objects.using(alias).filter(code=code).first()
        if privilege:
            RolePrivilege.objects.using(alias).get_or_create(
                role=admin_role,
                privilege=privilege,
            )

    # 3. Crear menú de Documentos legales
    menu, _ = Menu.objects.using(alias).get_or_create(
        route="/configuraciones/documentos-legales",
        defaults={
            "name": "Documentos legales",
            "icon": "description",
            "order": 1,
            "is_active": True,
        },
    )
    if not menu.is_active:
        menu.is_active = True
        menu.save(using=alias)

    ver_priv = Privilege.objects.using(alias).filter(code="documentos_legales.ver").first()
    if ver_priv:
        MenuPrivilege.objects.using(alias).get_or_create(
            menu=menu,
            privilege=ver_priv,
        )

    # 4. Asignar rol Administrador a superusuarios y usuarios con rol Admin previo
    for user in User.objects.using(alias).filter(is_superuser=True):
        UserRole.objects.using(alias).get_or_create(user=user, role=admin_role)

    for legacy_name in ("Admin", "Administrador global"):
        legacy_role = Role.objects.using(alias).filter(name=legacy_name).first()
        if legacy_role:
            for ur in UserRole.objects.using(alias).filter(role=legacy_role):
                UserRole.objects.using(alias).get_or_create(user=ur.user, role=admin_role)


class Migration(migrations.Migration):
    dependencies = [("users", "0007_legal_document_privileges")]
    operations = [migrations.RunPython(create_roles_and_menus, migrations.RunPython.noop)]
