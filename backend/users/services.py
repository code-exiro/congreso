from .models import Menu, Privilege


def get_user_privilege_codes(user):
    if not user.is_authenticated or not user.is_active:
        return []
    return list(
        Privilege.objects.filter(
            role_privileges__role__user_roles__user=user,
            role_privileges__role__is_active=True,
        ).order_by("code").values_list("code", flat=True).distinct()
    )


def get_user_menus(user):
    # Un menú se habilita si el usuario tiene alguno de sus privilegios.
    return Menu.objects.filter(
        is_active=True,
        menu_privileges__privilege__code__in=get_user_privilege_codes(user),
    ).distinct().order_by("order", "id")
