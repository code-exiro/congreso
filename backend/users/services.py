from django.utils import timezone
from .models import LegalDocument, Menu, Privilege, UserLegalDocument


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
    data["basic_profile_complete"] = bool(profile and profile.calculate_is_complete())
    data["is_complete"] = data["basic_profile_complete"] and data["legal_complete"]
    return data
