from rest_framework.permissions import BasePermission

from users.services import get_user_privilege_codes

PRIVILEGIO_CREAR_CONGRESO = "congresos.crear"
PRIVILEGIOS_CREAR = {PRIVILEGIO_CREAR_CONGRESO, "crear_congreso"}


class PuedeGestionarCongresos(BasePermission):
    """Superusuario o usuario con el privilegio 'congresos.crear' (BORRADOR: falta darlo de alta en el catálogo de privilegios)."""

    message = "No tienes permiso para registrar congresos."

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated and user.is_active):
            return False
        return user.is_superuser or bool(PRIVILEGIOS_CREAR & set(get_user_privilege_codes(user)))
