from django.db import migrations


OLD_TEMP_CODES = (
    "solicitudes.ver",
    "solicitudes.dictaminar",
    "solicitudes.invitar",
    "trabajos.ver_activos",
    "trabajos.asignar_evaluadores",
    "evaluadores.configurar_limite",
    "trabajos_finales.publicar_revista",
    "software.editar",
    "ponencias.solicitar",
    "ponencias.cargar_extenso",
    "ponencias.subir_video",
    "asistencia.registrar_activa",
    "perfil.editar_propio",
    "pagos.gestionar_comprobante",
    "constancias.descargar_previas",
    "evaluacion.ver_asignados",
    "evaluacion.descargar_archivos",
    "evaluacion.cargar_observaciones",
    "evaluacion.ver_observaciones_previas",
    "roles_privilegios.ver",
    "roles_privilegios.gestionar_usuarios",
    "roles_privilegios.gestionar_roles",
)

PRIVILEGES = {
    "inicio_sesion": (
        "inicio_sesion",
        "permite el acceso del usuario al módulo de login, permitiéndole registrarse, crear un perfil e iniciar sesión con su correo y contraseña",
    ),
    "modificar_perfil": (
        "modificar_perfil",
        "permite el acceso del usuario al módulo de perfil, siendo capaz de modificar sus datos personales, actualizar su información, subir archivos curriculares, etc",
    ),
    "subir_trabajo": (
        "subir_trabajo",
        "permite el acceso del usuario al módulo de trabajos, siendo capaz en dicha estancia de realizar el registro de un trabajo y subir los diversos archivos correspondientes al trabajo",
    ),
    "ver_sus_trabajos": (
        "ver_sus_trabajos",
        "permite al usuario ver el listado de trabajos que haya registrado en el congreso actual",
    ),
    "ver_su_historial": (
        "ver_su_historial",
        "permite el acceso del usuario al módulo de historial de trabajos, siendo capaz de visualizar el listado de trabajos en los que participó como autor o coautor en congresos previos",
    ),
    "solicitud_pago": (
        "solicitud_pago",
        "permite el acceso del usuario al módulo de pagos, siendo capaz de realizar una solicitud para la expedición de una orden de pago por concepto de máximo 2 trabajos, así como de subir el comprobante cuando el pago ya haya sido realizado",
    ),
    "evaluar_trabajo": (
        "evaluar_trabajo",
        "permite el acceso del usuario al módulo de evaluación, volviéndolo susceptible a poderle asignar trabajos para su evaluación y siendo capaz de visualizar el listado de asignaciones activas así como de realizar revisiones/observaciones a dichos trabajos asignados",
    ),
    "ver_sus_evaluaciones": (
        "ver_sus_evaluaciones",
        "permite el acceso del usuario al módulo de historial de evaluaciones, siendo capaz de ver el listado de evaluaciones realizadas de congresos previos o en su defecto que se le hayan asignado",
    ),
    "ver_sus_constancias": (
        "ver_sus_constancias",
        "permite el acceso del usuario al módulo de constancias, siendo capaz de visualizar el listado de constancias tanto del congreso actual como de congresos previos",
    ),
    "admin_pagos": (
        "admin_pagos",
        "permite el acceso del usuario al módulo de administración de pagos, siendo capaz de poder visualizar el listado de pagos registrados, el estatus, sus respectivos baucher adjuntos y el/los trabajo(s) que le corresponden, además de poder validar que el pago sea correcto para poder habilitar la descarga de constancias",
    ),
    "evaluar_general": (
        "evaluar_general",
        "permite el acceso del usuario al módulo de evaluaciones generales, siendo capaz de visualizar el listado de resúmenes, videos, presentaciones y artículos a publicar en la revista, para poder evaluarlos o autorizar su publicación o presentación final",
    ),
    "asignar_evaluador": (
        "asignar_evaluador",
        "permite el acceso del usuario al módulo de asignaciones, siendo capaz de poder seleccionar un trabajo activo y asignarlo al evaluador de su preferencia, siempre que el evaluador no haya superado su límite",
    ),
    "modificar_privilegios": (
        "modificar_privilegios",
        "permite el acceso del usuario al módulo de administración de privilegios, siendo capaz de asignar o remover los privilegios de su elección a un usuario seleccionado así como de asignarles roles a los usuarios registrados",
    ),
    "ver_reportes": (
        "ver_reportes",
        "permite el acceso del usuario al módulo de reportes, siendo capaz de poder visualizar el historial de reportes generados por la plataforma así como descargarlos de forma local",
    ),
    "crear_congreso": (
        "crear_congreso",
        "permite el acceso del usuario al módulo de congreso, haciéndolo capaz de dictaminar el comienzo o finalización de un nuevo congreso y asignarle los atributos con los que contará",
    ),
    "modificar_fechas": (
        "modificar_fechas",
        "permite el acceso del usuario al módulo de fechas, siendo capaz de modificar las fechas de inicio y fin de las diferentes actividades del congreso",
    ),
    "diseño_pagina": (
        "diseño_pagina",
        "permite el acceso del usuario al módulo de personalización de la página, siendo capaz de modificar el aspecto y los contenidos que se visualizan en la plataforma del congreso",
    ),
    "documentos_legales.ver": (
        "ver_documentos_legales",
        "consultar todas las versiones de documentos legales registrados en la plataforma",
    ),
    "documentos_legales.crear": (
        "crear_documentos_legales",
        "capturar nuevas versiones de documentos legales en borrador sin publicarlas",
    ),
    "documentos_legales.editar": (
        "editar_documentos_legales",
        "modificar borradores de documentos legales que aún no tienen aceptaciones",
    ),
    "documentos_legales.publicar": (
        "publicar_documentos_legales",
        "activar y publicar una versión vigente de documento legal",
    ),
    "documentos_legales.desactivar": (
        "desactivar_documentos_legales",
        "retirar una versión de documento legal sin eliminar su historial",
    ),
}

ROLES_SPEC = {
    "ponente": {
        "description": (
            "todo académico que desee participar en el congreso con algún trabajo"
        ),
        "privileges": (
            "inicio_sesion",
            "modificar_perfil",
            "subir_trabajo",
            "ver_sus_trabajos",
            "ver_su_historial",
            "solicitud_pago",
            "ver_sus_constancias",
        ),
    },
    "evaluador": {
        "description": (
            "docentes que brindan su apoyo para realizar observaciones a los trabajos que se les asignen"
        ),
        "privileges": (
            "inicio_sesion",
            "modificar_perfil",
            "evaluar_trabajo",
            "ver_sus_evaluaciones",
            "ver_sus_constancias",
        ),
    },
    "administrador": {
        "description": (
            "es el encargado de administrar el contenido y los registros de la página del congreso"
        ),
        "privileges": (
            "inicio_sesion",
            "modificar_perfil",
            "modificar_privilegios",
            "diseño_pagina",
            "ver_reportes",
            "crear_congreso",
            "modificar_fechas",
            "documentos_legales.ver",
            "documentos_legales.crear",
            "documentos_legales.editar",
            "documentos_legales.publicar",
            "documentos_legales.desactivar",
        ),
    },
    "coordinador": {
        "description": (
            "es el fundador y coordinador del evento en general"
        ),
        "privileges": (
            "inicio_sesion",
            "modificar_perfil",
            "evaluar_general",
            "asignar_evaluador",
            "ver_reportes",
            "crear_congreso",
            "modificar_fechas",
        ),
    },
    "admin pagos": {
        "description": (
            "es el encargado de validar los registros de los pagos correspondientes a los trabajos inscritos"
        ),
        "privileges": (
            "inicio_sesion",
            "modificar_perfil",
            "admin_pagos",
        ),
    },
}


def seed_roles_and_privileges(apps, schema_editor):
    alias = schema_editor.connection.alias
    Privilege = apps.get_model("users", "Privilege")
    Role = apps.get_model("users", "Role")
    RolePrivilege = apps.get_model("users", "RolePrivilege")
    User = apps.get_model("users", "User")
    UserRole = apps.get_model("users", "UserRole")
    Menu = apps.get_model("users", "Menu")
    MenuPrivilege = apps.get_model("users", "MenuPrivilege")

    # Limpiar privilegios temporales anteriores si existían
    old_priv_ids = list(
        Privilege.objects.using(alias)
        .filter(code__in=OLD_TEMP_CODES)
        .values_list("id", flat=True)
    )
    if old_priv_ids:
        MenuPrivilege.objects.using(alias).filter(privilege_id__in=old_priv_ids).delete()
        RolePrivilege.objects.using(alias).filter(privilege_id__in=old_priv_ids).delete()
        Privilege.objects.using(alias).filter(id__in=old_priv_ids).delete()

    privilege_map = {}
    for code, (name, description) in PRIVILEGES.items():
        priv, _ = Privilege.objects.using(alias).update_or_create(
            code=code,
            defaults={"name": name, "description": description},
        )
        privilege_map[code] = priv

    for existing_priv in Privilege.objects.using(alias).all():
        privilege_map[existing_priv.code] = existing_priv

    # Si existía "Administrador global", renombrarlo o migrar sus usuarios a "administrador"
    old_global_admin = Role.objects.using(alias).filter(name__iexact="Administrador global").first()
    existing_admin = Role.objects.using(alias).filter(name__iexact="administrador").first()
    if old_global_admin:
        if existing_admin is None:
            old_global_admin.name = "administrador"
            old_global_admin.save(using=alias, update_fields=["name"])
        else:
            for ur in UserRole.objects.using(alias).filter(role=old_global_admin):
                UserRole.objects.using(alias).get_or_create(user_id=ur.user_id, role=existing_admin)
            RolePrivilege.objects.using(alias).filter(role=old_global_admin).delete()
            UserRole.objects.using(alias).filter(role=old_global_admin).delete()
            old_global_admin.delete(using=alias)

    for role_name, spec in ROLES_SPEC.items():
        role = Role.objects.using(alias).filter(name__iexact=role_name).first()
        if role is None:
            role = Role.objects.using(alias).create(
                name=role_name,
                description=spec["description"],
                is_active=True,
            )
        else:
            role.name = role_name
            role.description = spec["description"]
            role.save(using=alias, update_fields=["name", "description"])

        desired_privs = [
            privilege_map[code]
            for code in spec["privileges"]
            if code in privilege_map
        ]
        desired_ids = {p.id for p in desired_privs}
        RolePrivilege.objects.using(alias).filter(role=role).exclude(
            privilege_id__in=desired_ids
        ).delete()
        for priv in desired_privs:
            RolePrivilege.objects.using(alias).get_or_create(
                role=role,
                privilege=priv,
            )

    # Asegurar que cualquier usuario existente sin roles tenga el rol ponente por defecto
    ponente_role = Role.objects.using(alias).filter(name__iexact="ponente").first()
    if ponente_role:
        for user_id in User.objects.using(alias).values_list("pk", flat=True):
            if not UserRole.objects.using(alias).filter(user_id=user_id).exists():
                UserRole.objects.using(alias).create(user_id=user_id, role=ponente_role)

    # Registrar menú de Roles y privilegios bajo /configuraciones/
    roles_menu, _ = Menu.objects.using(alias).update_or_create(
        route="/configuraciones/roles-privilegios",
        defaults={
            "name": "Roles y privilegios",
            "icon": "shield",
            "order": 20,
            "is_active": True,
        },
    )
    mod_priv = privilege_map.get("modificar_privilegios")
    if mod_priv:
        MenuPrivilege.objects.using(alias).filter(menu=roles_menu).exclude(
            privilege=mod_priv
        ).delete()
        MenuPrivilege.objects.using(alias).get_or_create(
            menu=roles_menu,
            privilege=mod_priv,
        )

    # Asegurar que el menú de Documentos legales exista también
    legal_menu, _ = Menu.objects.using(alias).update_or_create(
        route="/configuraciones/documentos-legales",
        defaults={
            "name": "Documentos legales",
            "icon": "description",
            "order": 10,
            "is_active": True,
        },
    )
    ver_legal_priv = privilege_map.get("documentos_legales.ver")
    if ver_legal_priv:
        MenuPrivilege.objects.using(alias).get_or_create(
            menu=legal_menu,
            privilege=ver_legal_priv,
        )


class Migration(migrations.Migration):
    dependencies = [("users", "0007_legal_document_privileges")]
    operations = [migrations.RunPython(seed_roles_and_privileges, migrations.RunPython.noop)]
