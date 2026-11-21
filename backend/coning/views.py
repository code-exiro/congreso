from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    Actividad,
    Area,
    Congreso,
    CongresoActividad,
    CongresoFecha,
    CongresoPatrocinador,
    Pagina,
)


class LandingDataView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        congreso = Congreso.objects.order_by("-edicion_congreso", "-id_congreso").first()
        if congreso is None:
            return Response(
                {
                    "congress": None,
                    "page": None,
                    "dates": [],
                    "sponsors": [],
                    "activities": [],
                    "areas": [],
                }
            )

        page = Pagina.objects.filter(congreso=congreso).order_by("id_pagina").first()
        dates = [
            {
                "id": item.fecha_id,
                "title": item.fecha.nombre_fecha,
                "startDate": item.fecha_inicio.isoformat(),
                "endDate": (item.fecha_fin or item.fecha_inicio).isoformat(),
            }
            for item in CongresoFecha.objects.filter(
                congreso=congreso,
                fecha_inicio__isnull=False,
            ).select_related("fecha").order_by("fecha_inicio", "fecha_id")
        ]
        sponsors = [
            {
                "id": item.patrocinador_id,
                "name": item.patrocinador.nombre_patrocinador,
                "src": item.patrocinador.logo_patrocinador or "",
                "type": item.patrocinador.tipopa.nombre_tipopa,
            }
            for item in CongresoPatrocinador.objects.filter(
                congreso=congreso,
                patrocinador__activo=True,
            ).select_related("patrocinador", "patrocinador__tipopa").order_by(
                "patrocinador_id"
            )
        ]
        activities = [
            {
                "id": item.actividad_id,
                "name": item.actividad.nombre_actividad,
                "reviewers": item.actividad.num_evaluadores,
            }
            for item in CongresoActividad.objects.filter(
                congreso=congreso,
                activo=True,
            ).select_related("actividad").order_by("actividad__nombre_actividad")
        ]
        areas = list(
            Area.objects.filter(trabajo__congreso=congreso)
            .order_by("nombre_area")
            .values("id_area", "clave_area", "nombre_area")
            .distinct()
        )

        return Response(
            {
                "congress": {
                    "edition": congreso.edicion_congreso,
                    "name": congreso.nombre_congreso,
                    "description": congreso.descripcion_congreso or "",
                    "registrationDate": congreso.fecha_cierre_registro or "",
                    "venue": congreso.ubicacion_sede or "",
                    "address": congreso.direccion_sede or "",
                    "mapQuery": congreso.google_maps_query or "",
                    "modality": congreso.modalidad_congreso,
                    "contactEmail": congreso.contacto_correo or congreso.correo_congreso,
                },
                "page": {
                    "banner": page.banner or "" if page else "",
                    "poster": page.cartel or "" if page else "",
                    "program": page.programa or "" if page else "",
                    "programUrl": page.enlace_programa or "" if page else "",
                    "logo": page.logo_congreso or "" if page else "",
                    "color": page.color_banner or "" if page else "",
                },
                "dates": dates,
                "sponsors": sponsors,
                "activities": activities,
                "areas": areas,
            }
        )
