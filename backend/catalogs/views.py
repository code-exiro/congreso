from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    AcademicLevel,
    AcademicStatus,
    Area,
    Campus,
    Country,
    DialingCode,
    Institution,
    State,
)


class ProfileCatalogsView(APIView):
    """
    Devuelve todos los catálogos reales requeridos por el formulario de perfil
    (excepto los estados, que se consultan de forma dependiente por país).
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        countries = list(Country.objects.all().order_by("name").values("id", "name"))
        academic_levels = list(
            AcademicLevel.objects.all().order_by("id").values("id", "degree", "description")
        )
        academic_statuses = list(
            AcademicStatus.objects.all().order_by("id").values("id", "code", "name")
        )
        institutions = sorted(
            Institution.objects.all().order_by("name").values("id", "name", "acronym"),
            key=lambda item: (item["name"].strip().lower() == "otro", item["name"].lower()),
        )
        dialing_codes = list(
            DialingCode.objects.all()
            .order_by("country_name", "code")
            .values("id", "code", "country_name", "country_id")
        )
        areas = list(Area.objects.all().order_by("name").values("id", "code", "name"))

        return Response(
            {
                "countries": countries,
                "academic_levels": academic_levels,
                "academic_statuses": academic_statuses,
                "institutions": institutions,
                "dialing_codes": dialing_codes,
                "areas": areas,
            }
        )


class StatesByCountryView(APIView):
    """
    Devuelve los estados pertenecientes al país indicado (?country=<id>).
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        country_param = request.query_params.get("country")
        if not country_param:
            return Response([])
        try:
            country_id = int(country_param)
        except (TypeError, ValueError):
            return Response([])
        states = list(
            State.objects.filter(country_id=country_id)
            .order_by("name")
            .values("id", "name", "country_id")
        )
        return Response(states)


class CampusesByInstitutionView(APIView):
    """
    Devuelve los campus pertenecientes a la institución indicada (?institution=<id>).
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        inst_param = request.query_params.get("institution")
        if not inst_param:
            return Response([])
        try:
            inst_id = int(inst_param)
        except (TypeError, ValueError):
            return Response([])
        campuses = list(
            Campus.objects.filter(institution_id=inst_id)
            .order_by("name")
            .values("id", "name", "acronym", "institution_id")
        )
        return Response(campuses)
