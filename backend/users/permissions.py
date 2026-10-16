from rest_framework.permissions import BasePermission

from .services import get_user_privilege_codes


class HasPrivilege(BasePermission):
    """La vista declara required_privilege = 'clave_del_privilegio'."""

    message = "No tienes el privilegio necesario para realizar esta acción."

    def has_permission(self, request, view):
        required = getattr(view, "required_privilege", None)
        return bool(required and required in get_user_privilege_codes(request.user))
