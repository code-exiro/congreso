from rest_framework.permissions import BasePermission

from users.services import get_user_privilege_codes


class TieneAlgunPrivilegio(BasePermission):
    """La vista declara privilegios_por_metodo = {"GET": ("codigo_a", "codigo_b"), "POST": ("codigo",)}.

    Basta con tener uno de los privilegios del método.
    """

    message = "No tienes el privilegio necesario para realizar esta acción."

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated and user.is_active):
            return False
        if request.method == "OPTIONS":
            return True
        requeridos = getattr(view, "privilegios_por_metodo", {}).get(request.method, ())
        return bool(set(requeridos) & set(get_user_privilege_codes(user)))
