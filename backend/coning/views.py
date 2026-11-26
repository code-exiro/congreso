import base64
import binascii
import re
import uuid
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.core.files.uploadedfile import UploadedFile
from django.db import transaction
from rest_framework import serializers, status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    Actividad,
    Area,
    Congreso,
    CongresoActividad,
    CongresoFecha,
    CongresoPatrocinador,
    FechaImportante,
    Pagina,
    Patrocinador,
    TipoPatrocinador,
)
from users.permissions import HasPrivilege


LANDING_IMAGE_LIMIT = 5 * 1024 * 1024
LANDING_IMAGE_TYPES = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
}


class LandingCongressUpdateSerializer(serializers.Serializer):
    edition = serializers.IntegerField(required=False, allow_null=True)
    name = serializers.CharField(max_length=500, required=False)
    description = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    registrationDate = serializers.CharField(
        max_length=150, required=False, allow_blank=True, allow_null=True
    )
    venue = serializers.CharField(max_length=200, required=False, allow_blank=True, allow_null=True)
    address = serializers.CharField(max_length=255, required=False, allow_blank=True, allow_null=True)
    mapQuery = serializers.CharField(max_length=255, required=False, allow_blank=True, allow_null=True)
    modality = serializers.ChoiceField(choices=Congreso.Modalidad.choices, required=False)
    contactEmail = serializers.EmailField(max_length=150, required=False, allow_blank=True)


class LandingAssetField(serializers.CharField):
    def __init__(self, **kwargs):
        super().__init__(max_length=255, **kwargs)

    def to_internal_value(self, data):
        if isinstance(data, UploadedFile):
            if data.size > LANDING_IMAGE_LIMIT:
                raise serializers.ValidationError("La imagen no puede superar 5 MB.")
            if data.content_type not in LANDING_IMAGE_TYPES:
                raise serializers.ValidationError("Formato de imagen no permitido.")
            return data
        if isinstance(data, str) and data.startswith("data:"):
            return data
        return super().to_internal_value(data)


class LandingPageUpdateSerializer(serializers.Serializer):
    banner = LandingAssetField(required=False, allow_blank=True, allow_null=True)
    poster = LandingAssetField(required=False, allow_blank=True, allow_null=True)
    program = LandingAssetField(required=False, allow_blank=True, allow_null=True)
    programUrl = serializers.URLField(max_length=500, required=False, allow_blank=True, allow_null=True)
    logo = LandingAssetField(required=False, allow_blank=True, allow_null=True)
    color = serializers.RegexField(r"^#[0-9a-fA-F]{6}$", required=False)


class LandingDateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=200, required=False)
    startDate = serializers.DateField(required=False)
    endDate = serializers.DateField(required=False, allow_null=True)

    def validate(self, attrs):
        start = attrs.get("startDate")
        end = attrs.get("endDate")
        if start and end and end < start:
            raise serializers.ValidationError(
                {"endDate": "La fecha final no puede ser anterior a la fecha inicial."}
            )
        return attrs


class LandingSponsorSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=200, required=False)
    src = LandingAssetField(required=False, allow_blank=True, allow_null=True)


class LandingAdminPermissionMixin:
    permission_classes = [IsAuthenticated, HasPrivilege]
    required_privilege = "diseño_pagina"


def current_congress():
    congress = Congreso.objects.order_by("-edicion_congreso", "-id_congreso").first()
    if congress is None:
        raise NotFound("No hay un congreso vigente registrado.")
    return congress


def validate_known_fields(serializer_class, data, *, partial):
    unknown = set(data) - set(serializer_class().fields)
    if unknown:
        raise ValidationError(
            {"detail": f"Campos no permitidos: {', '.join(sorted(unknown))}."}
        )
    serializer = serializer_class(data=data, partial=partial)
    serializer.is_valid(raise_exception=True)
    return serializer.validated_data


def persist_landing_image(value, congress_id, field_name):
    if isinstance(value, UploadedFile):
        extension = LANDING_IMAGE_TYPES.get(value.content_type)
        if extension is None:
            raise ValidationError({field_name: "Formato de imagen no permitido."})
        filename = f"landing/congress_{congress_id}/{field_name}_{uuid.uuid4().hex}.{extension}"
        return default_storage.save(filename, value)
    if not isinstance(value, str) or not value.startswith("data:"):
        if value is not None and len(value) > 255:
            raise ValidationError({field_name: "La ruta no puede superar 255 caracteres."})
        return value

    match = re.fullmatch(r"data:(image/[^;]+);base64,(.+)", value, re.DOTALL)
    if not match:
        raise ValidationError({field_name: "La imagen debe ser una imagen base64 válida."})
    content_type, encoded = match.groups()
    extension = LANDING_IMAGE_TYPES.get(content_type.lower())
    if extension is None:
        raise ValidationError({field_name: "Formato de imagen no permitido."})

    try:
        content = base64.b64decode(encoded, validate=True)
    except (binascii.Error, ValueError) as error:
        raise ValidationError({field_name: "La imagen base64 no es válida."}) from error
    if len(content) > LANDING_IMAGE_LIMIT:
        raise ValidationError({field_name: "La imagen no puede superar 5 MB."})

    filename = f"landing/congress_{congress_id}/{field_name}_{uuid.uuid4().hex}.{extension}"
    return default_storage.save(filename, ContentFile(content))


def public_asset_url(value):
    if value and not value.startswith(("http://", "https://", "/")):
        return default_storage.url(value)
    return value


def page_payload(page):
    return {
        "banner": public_asset_url(page.banner or ""),
        "poster": public_asset_url(page.cartel or ""),
        "program": public_asset_url(page.programa or ""),
        "programUrl": page.enlace_programa or "",
        "logo": public_asset_url(page.logo_congreso or ""),
        "color": page.color_banner or "",
    }


def date_payload(link):
    return {
        "id": link.fecha_id,
        "title": link.fecha.nombre_fecha,
        "startDate": link.fecha_inicio.isoformat() if link.fecha_inicio else "",
        "endDate": (link.fecha_fin or link.fecha_inicio).isoformat() if link.fecha_inicio else "",
    }


def sponsor_payload(link):
    return {
        "id": link.patrocinador_id,
        "name": link.patrocinador.nombre_patrocinador,
        "src": public_asset_url(link.patrocinador.logo_patrocinador or ""),
    }


class LandingCongressUpdateView(LandingAdminPermissionMixin, APIView):
    def patch(self, request):
        fields = validate_known_fields(LandingCongressUpdateSerializer, request.data, partial=True)
        if not fields:
            raise ValidationError({"detail": "Debes enviar al menos un campo para actualizar."})
        mapping = {
            "edition": "edicion_congreso",
            "name": "nombre_congreso",
            "description": "descripcion_congreso",
            "registrationDate": "fecha_cierre_registro",
            "venue": "ubicacion_sede",
            "address": "direccion_sede",
            "mapQuery": "google_maps_query",
            "modality": "modalidad_congreso",
            "contactEmail": "contacto_correo",
        }
        with transaction.atomic():
            congress_id = current_congress().pk
            congress = Congreso.objects.select_for_update().filter(pk=congress_id).first()
            if congress is None:
                raise NotFound("No hay un congreso vigente registrado.")
            for key, value in fields.items():
                setattr(congress, mapping[key], value)
            congress.save(update_fields=[mapping[key] for key in fields])
        return Response(
            {
                "congress": {
                    "edition": congress.edicion_congreso,
                    "name": congress.nombre_congreso,
                    "description": congress.descripcion_congreso or "",
                    "registrationDate": congress.fecha_cierre_registro or "",
                    "venue": congress.ubicacion_sede or "",
                    "address": congress.direccion_sede or "",
                    "mapQuery": congress.google_maps_query or "",
                    "modality": congress.modalidad_congreso,
                    "contactEmail": congress.contacto_correo or congress.correo_congreso,
                }
            }
        )


class LandingPageUpdateView(LandingAdminPermissionMixin, APIView):
    def patch(self, request):
        fields = validate_known_fields(LandingPageUpdateSerializer, request.data, partial=True)
        if not fields:
            raise ValidationError({"detail": "Debes enviar al menos un campo para actualizar."})
        mapping = {
            "banner": "banner",
            "poster": "cartel",
            "program": "programa",
            "programUrl": "enlace_programa",
            "logo": "logo_congreso",
            "color": "color_banner",
        }
        with transaction.atomic():
            congress = current_congress()
            congress = Congreso.objects.select_for_update().get(pk=congress.pk)
            page = Pagina.objects.select_for_update().filter(congreso=congress).order_by(
                "id_pagina"
            ).first()
            if page is None:
                page = Pagina.objects.create(congreso=congress)
            for key, value in fields.items():
                if key in {"banner", "poster", "program", "logo"}:
                    value = persist_landing_image(value, congress.pk, key)
                setattr(page, mapping[key], value)
            page.save(update_fields=[mapping[key] for key in fields])
        return Response({"page": page_payload(page)})


class LandingDateCollectionView(LandingAdminPermissionMixin, APIView):
    def post(self, request):
        fields = validate_known_fields(LandingDateSerializer, request.data, partial=False)
        if "title" not in fields or "startDate" not in fields:
            raise ValidationError({"detail": "El título y la fecha inicial son obligatorios."})
        end_date = fields.get("endDate") or fields["startDate"]
        with transaction.atomic():
            congress = current_congress()
            important_date = FechaImportante.objects.create(nombre_fecha=fields["title"])
            link = CongresoFecha.objects.create(
                congreso=congress,
                fecha=important_date,
                fecha_inicio=fields["startDate"],
                fecha_fin=end_date,
            )
        return Response({"date": date_payload(link)}, status=status.HTTP_201_CREATED)


class LandingDateDetailView(LandingAdminPermissionMixin, APIView):
    def get_object(self, fecha_id):
        congress = current_congress()
        link = (
            CongresoFecha.objects.select_for_update()
            .select_related("fecha")
            .filter(congreso=congress, fecha_id=fecha_id)
            .first()
        )
        if link is None:
            raise NotFound("La fecha no pertenece al congreso vigente.")
        return link

    def patch(self, request, fecha_id):
        fields = validate_known_fields(LandingDateSerializer, request.data, partial=True)
        if not fields:
            raise ValidationError({"detail": "Debes enviar al menos un campo para actualizar."})
        with transaction.atomic():
            link = self.get_object(fecha_id)
            start_date = fields.get("startDate", link.fecha_inicio)
            end_date = fields.get("endDate", link.fecha_fin)
            if end_date and start_date and end_date < start_date:
                raise ValidationError(
                    {"endDate": "La fecha final no puede ser anterior a la fecha inicial."}
                )
            if "title" in fields:
                shared_date = CongresoFecha.objects.filter(fecha_id=link.fecha_id).exclude(
                    congreso_id=link.congreso_id
                ).exists()
                if shared_date:
                    new_date = FechaImportante.objects.create(nombre_fecha=fields["title"])
                    congress_id = link.congreso_id
                    link.delete()
                    link = CongresoFecha.objects.create(
                        congreso_id=congress_id,
                        fecha=new_date,
                        fecha_inicio=link.fecha_inicio,
                        fecha_fin=link.fecha_fin,
                    )
                else:
                    link.fecha.nombre_fecha = fields["title"]
                    link.fecha.save(update_fields=["nombre_fecha"])
            if "startDate" in fields:
                link.fecha_inicio = fields["startDate"]
            if "endDate" in fields:
                link.fecha_fin = fields["endDate"] or start_date
            link.save(update_fields=["fecha_inicio", "fecha_fin"])
            link = CongresoFecha.objects.select_related("fecha").get(
                congreso_id=link.congreso_id, fecha_id=link.fecha_id
            )
        return Response({"date": date_payload(link)})

    def delete(self, request, fecha_id):
        with transaction.atomic():
            link = self.get_object(fecha_id)
            important_date = link.fecha
            link.delete()
            if not CongresoFecha.objects.filter(fecha=important_date).exists():
                important_date.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class LandingSponsorCollectionView(LandingAdminPermissionMixin, APIView):
    def post(self, request):
        fields = validate_known_fields(LandingSponsorSerializer, request.data, partial=False)
        if not fields.get("name") or not fields.get("src"):
            raise ValidationError({"detail": "El nombre y el logotipo son obligatorios."})
        sponsor_type = TipoPatrocinador.objects.order_by("id_tipopa").first()
        if sponsor_type is None:
            raise ValidationError(
                {"detail": "Registra un tipo de patrocinador antes de agregar patrocinadores."}
            )
        with transaction.atomic():
            congress = current_congress()
            sponsor = Patrocinador.objects.create(
                tipopa=sponsor_type,
                nombre_patrocinador=fields["name"],
                logo_patrocinador=persist_landing_image(fields["src"], congress.pk, "sponsor"),
            )
            link = CongresoPatrocinador.objects.create(congreso=congress, patrocinador=sponsor)
        return Response({"sponsor": sponsor_payload(link)}, status=status.HTTP_201_CREATED)


class LandingSponsorDetailView(LandingAdminPermissionMixin, APIView):
    def get_object(self, patrocinador_id):
        link = (
            CongresoPatrocinador.objects.select_for_update()
            .select_related("patrocinador")
            .filter(congreso=current_congress(), patrocinador_id=patrocinador_id)
            .first()
        )
        if link is None:
            raise NotFound("El patrocinador no pertenece al congreso vigente.")
        return link

    def patch(self, request, patrocinador_id):
        fields = validate_known_fields(LandingSponsorSerializer, request.data, partial=True)
        if not fields:
            raise ValidationError({"detail": "Debes enviar al menos un campo para actualizar."})
        with transaction.atomic():
            link = self.get_object(patrocinador_id)
            sponsor = link.patrocinador
            if CongresoPatrocinador.objects.filter(patrocinador=sponsor).exclude(
                congreso_id=link.congreso_id
            ).exists():
                congress_id = link.congreso_id
                sponsor = Patrocinador.objects.create(
                    tipopa=sponsor.tipopa,
                    nombre_patrocinador=sponsor.nombre_patrocinador,
                    logo_patrocinador=sponsor.logo_patrocinador,
                    activo=sponsor.activo,
                )
                link.delete()
                link = CongresoPatrocinador.objects.create(
                    congreso_id=congress_id,
                    patrocinador=sponsor,
                )
            if "name" in fields:
                sponsor.nombre_patrocinador = fields["name"]
            if "src" in fields:
                sponsor.logo_patrocinador = persist_landing_image(
                    fields["src"], link.congreso_id, "sponsor"
                )
            update_fields = []
            if "name" in fields:
                update_fields.append("nombre_patrocinador")
            if "src" in fields:
                update_fields.append("logo_patrocinador")
            sponsor.save(update_fields=update_fields)
            link = CongresoPatrocinador.objects.select_related("patrocinador").get(
                congreso_id=link.congreso_id, patrocinador_id=sponsor.pk
            )
        return Response({"sponsor": sponsor_payload(link)})

    def delete(self, request, patrocinador_id):
        with transaction.atomic():
            link = self.get_object(patrocinador_id)
            sponsor = link.patrocinador
            link.delete()
            if not CongresoPatrocinador.objects.filter(patrocinador=sponsor).exists():
                sponsor.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


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
                "src": public_asset_url(item.patrocinador.logo_patrocinador or ""),
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
                    "banner": public_asset_url(page.banner or "") if page else "",
                    "poster": public_asset_url(page.cartel or "") if page else "",
                    "program": public_asset_url(page.programa or "") if page else "",
                    "programUrl": page.enlace_programa or "" if page else "",
                    "logo": public_asset_url(page.logo_congreso or "") if page else "",
                    "color": page.color_banner or "" if page else "",
                },
                "dates": dates,
                "sponsors": sponsors,
                "activities": activities,
                "areas": areas,
            }
        )
