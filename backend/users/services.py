from django.utils import timezone
from .models import LegalDocument, Menu, Privilege, Role, RolePrivilege, UserLegalDocument, UserRole


PONENTE_DEFAULT_PRIVILEGES = {
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
    "ver_sus_constancias": (
        "ver_sus_constancias",
        "permite el acceso del usuario al módulo de constancias, siendo capaz de visualizar el listado de constancias tanto del congreso actual como de congresos previos",
    ),
}


def ensure_default_ponente_role():
    role = Role.objects.filter(name__iexact="ponente").first()
    if role is None:
        role = Role.objects.create(
            name="ponente",
            description="todo académico que desee participar en el congreso con algún trabajo",
            is_active=True,
        )
    elif role.name != "ponente":
        role.name = "ponente"
        role.description = "todo académico que desee participar en el congreso con algún trabajo"
        role.save(update_fields=["name", "description"])
    for code, (name, description) in PONENTE_DEFAULT_PRIVILEGES.items():
        priv, _ = Privilege.objects.update_or_create(
            code=code,
            defaults={"name": name, "description": description},
        )
        RolePrivilege.objects.get_or_create(role=role, privilege=priv)
    return role


def assign_default_ponente_role(user):
    role = ensure_default_ponente_role()
    if role.is_active:
        UserRole.objects.get_or_create(user=user, role=role)
    return role


def get_user_privilege_codes(user):
    if not user.is_authenticated or not user.is_active:
        return []
    role_codes = set(
        Privilege.objects.filter(
            role_privileges__role__user_roles__user=user,
            role_privileges__role__is_active=True,
        ).values_list("code", flat=True)
    )
    granted_codes = set(
        Privilege.objects.filter(
            user_privileges__user=user,
            user_privileges__is_enabled=True,
        ).values_list("code", flat=True)
    )
    revoked_codes = set(
        Privilege.objects.filter(
            user_privileges__user=user,
            user_privileges__is_enabled=False,
        ).values_list("code", flat=True)
    )
    return sorted((role_codes | granted_codes) - revoked_codes)


def get_user_menus(user):
    # Un menú se habilita si el usuario tiene alguno de sus privilegios.
    return Menu.objects.filter(
        is_active=True,
        menu_privileges__privilege__code__in=get_user_privilege_codes(user),
    ).distinct().order_by("order", "id")


REQUIRED_LEGAL_TYPES = (LegalDocument.Type.TERMS, LegalDocument.Type.PRIVACY_NOTICE)


def legal_status(user):
    """Real-time legal status; absence of a mandatory document is never success."""
    now = timezone.now()
    active = {
        d.type: d for d in LegalDocument.objects.filter(is_active=True, published_at__lte=now)
    }
    accepted = set(UserLegalDocument.objects.filter(user=user, document_id__in=[d.pk for d in active.values()]).values_list("document_id", flat=True))
    missing = [active[t].pk for t in REQUIRED_LEGAL_TYPES if t in active and active[t].pk not in accepted]
    unavailable = [t for t in REQUIRED_LEGAL_TYPES if t not in active]
    return {"legal_complete": not missing and not unavailable, "pending_legal_document_ids": missing, "unavailable_legal_types": unavailable}


def effective_profile_status(user, profile=None):
    if profile is None:
        profile = getattr(user, "profile", None)

    data = legal_status(user)

    data["basic_profile_complete"] = bool(
        profile and profile.calculate_is_complete()
    )

    # La completitud depende solo de los datos básicos.
    # Las nuevas versiones legales no bloquean el perfil.
    data["is_complete"] = data["basic_profile_complete"]

    return data
