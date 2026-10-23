from rest_framework.permissions import BasePermission

from .services import get_user_privilege_codes


class HasPrivilege(BasePermission):
    """La vista declara required_privilege = 'clave_del_privilegio'."""

    message = "No tienes el privilegio necesario para realizar esta acción."

    def has_permission(self, request, view):
        required = getattr(view, "required_privilege", None)
        return bool(required and required in get_user_privilege_codes(request.user))


class HasCompleteProfile(BasePermission):
    """Opt-in: attach to actions that require a complete basic and legal profile."""
    message = "Completa tu perfil y acepta los documentos legales vigentes para continuar."

    def has_permission(self, request, view):
        from .services import effective_profile_status
        return bool(request.user.is_authenticated and request.user.is_active and effective_profile_status(request.user)["is_complete"])
