from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import AcademicLevel, Area, Campus, Country, Institution, Lada, State


class CatalogosView(APIView):
    """GET /api/catalogos/ — catálogos de usuario (públicos, de solo lectura)."""

    permission_classes = [AllowAny]
    authentication_classes: list = []

    def get(self, request):
        return Response({
            "paises": [{"id": p.pk, "nombre": p.name} for p in Country.objects.order_by("name")],
            "estados": [
                {"id": e.pk, "nombre": e.name, "pais_id": e.country_id, "pais": e.country.name}
                for e in State.objects.select_related("country").order_by("country__name", "name")
            ],
            "instituciones": [
                {"id": i.pk, "nombre": i.name, "acronimo": i.acronym} for i in Institution.objects.order_by("name")
            ],
            "niveles_academicos": [
                {"id": n.pk, "nombre": n.degree, "descripcion": n.description} for n in AcademicLevel.objects.order_by("id")
            ],
            "areas": [{"id": a.pk, "clave": a.code, "nombre": a.name} for a in Area.objects.order_by("name")],
            "ladas": [{"id": l.pk, "codigo": l.digitos, "pais": l.pais} for l in Lada.objects.order_by("pais")],
        })


class CampusView(APIView):
    """GET /api/catalogos/campus/?institucion=<id> — campus de una institución."""

    permission_classes = [AllowAny]
    authentication_classes: list = []

    def get(self, request):
        qs = Campus.objects.order_by("name")
        institucion = request.query_params.get("institucion")
        if institucion and institucion.isdigit():
            qs = qs.filter(institution_id=int(institucion))
        return Response([
            {"id": c.pk, "nombre": c.name, "acronimo": c.acronym, "institucion_id": c.institution_id} for c in qs
        ])
