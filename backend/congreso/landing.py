"""Landing pública del congreso: lectura abierta, edición solo para el administrador."""
import os
import uuid

from django.core.files.storage import default_storage
from django.db import transaction
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny, BasePermission
from rest_framework.response import Response
from rest_framework.views import APIView

from users.services import get_user_privilege_codes

from .models import Congreso, Pagina

PRIVILEGIO = "diseño_pagina"
EXT_PERMITIDAS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".pdf"}
MAX_MB = 8
MAX_CONTENIDO_KB = 512


class PuedeEditarLanding(BasePermission):
    message = "Solo el administrador puede editar la página."

    def has_permission(self, request, view):
        u = request.user
        if not (u and u.is_authenticated and u.is_active):
            return False
        return u.is_superuser or PRIVILEGIO in get_user_privilege_codes(u)


def congreso_vigente():
    return Congreso.objects.order_by("-edicion_congreso", "-pk").first()


def pagina_vigente():
    c = congreso_vigente()
    if not c:
        return None
    pagina, _ = Pagina.objects.get_or_create(congreso=c)
    return pagina


def heredar_contenido(congreso, origen=None):
    """Copia el contenido de la landing del congreso anterior al nuevo (sin pedir los archivos otra vez)."""
    if origen is None:
        previo = Congreso.objects.exclude(pk=congreso.pk).order_by("-edicion_congreso", "-pk").first()
        origen = getattr(previo, "pagina", None) if previo else None
    if not origen:
        return
    pagina, _ = Pagina.objects.get_or_create(congreso=congreso)
    pagina.contenido = origen.contenido or {}
    pagina.save(update_fields=["contenido"])


MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]


def _periodo(inicio, fin):
    """«del 31 de agosto al 4 de septiembre de 2026.» (o «el 4 de septiembre de 2026.» si es un solo día)."""
    if inicio == fin:
        return f"el {inicio.day} de {MESES[inicio.month - 1]} de {inicio.year}."
    if inicio.year == fin.year:
        return f"del {inicio.day} de {MESES[inicio.month - 1]} al {fin.day} de {MESES[fin.month - 1]} de {fin.year}."
    return f"del {inicio.day} de {MESES[inicio.month - 1]} de {inicio.year} al {fin.day} de {MESES[fin.month - 1]} de {fin.year}."


def conectar_datos_congreso(congreso):
    """Escribe en la landing los datos que ya se capturaron al crear el congreso (edición, modalidad, sede y periodo).

    Lo demás (título, descripción, imágenes, fechas del calendario…) se conserva tal como lo tenía el congreso anterior
    y el administrador lo puede seguir editando desde el modo administrador.
    """
    pagina, _ = Pagina.objects.get_or_create(congreso=congreso)
    contenido = dict(pagina.contenido or {})
    conv = dict(contenido.get("convocatoria") or {})
    conv["edition"] = f"{congreso.edicion_congreso}°"
    conv["modality"] = congreso.modalidad_congreso
    if congreso.ubicacion_sede:
        conv["venue"] = congreso.ubicacion_sede
    realizacion = (congreso.fechas_importantes.select_related("fecha_importante")
                   .filter(fecha_importante__nombre__icontains="realizaci").order_by("fecha_inicio").first())
    if realizacion:
        conv["period"] = _periodo(realizacion.fecha_inicio, realizacion.fecha_fin)
    contenido["convocatoria"] = conv
    pagina.contenido = contenido
    pagina.save(update_fields=["contenido"])


class LandingView(APIView):
    """GET /api/landing/ (público) · PUT /api/landing/ (admin)."""

    def get_permissions(self):
        return [AllowAny()] if self.request.method == "GET" else [PuedeEditarLanding()]

    def get_authenticators(self):
        # GET es público: no exige token (y no falla si el token expiró).
        if self.request.method == "GET":
            return []
        return super().get_authenticators()

    def get(self, request):
        pagina = pagina_vigente()
        c = pagina.congreso if pagina else None
        return Response({
            "congreso": {"id": c.pk, "nombre": c.nombre_congreso, "edicion": c.edicion_congreso} if c else None,
            "contenido": (pagina.contenido if pagina else {}) or {},
        })

    def put(self, request):
        pagina = pagina_vigente()
        if not pagina:
            return Response({"detail": "Aún no hay un congreso registrado."}, status=status.HTTP_400_BAD_REQUEST)
        contenido = request.data.get("contenido")
        if not isinstance(contenido, dict):
            return Response({"detail": "El contenido debe ser un objeto."}, status=status.HTTP_400_BAD_REQUEST)
        import json
        if len(json.dumps(contenido)) > MAX_CONTENIDO_KB * 1024:
            return Response({"detail": "El contenido es demasiado grande; sube las imágenes como archivos."}, status=status.HTTP_400_BAD_REQUEST)
        with transaction.atomic():
            pagina.contenido = contenido
            pagina.save(update_fields=["contenido"])
        return Response({"detail": "Página actualizada.", "contenido": pagina.contenido})


class LandingArchivoView(APIView):
    """POST /api/landing/archivos/ — sube una imagen o PDF y devuelve su URL."""

    permission_classes = [PuedeEditarLanding]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        archivo = request.FILES.get("archivo")
        if not archivo:
            return Response({"detail": "Falta el archivo."}, status=status.HTTP_400_BAD_REQUEST)
        ext = os.path.splitext(archivo.name)[1].lower()
        if ext not in EXT_PERMITIDAS:
            return Response({"detail": "Formato no permitido (png, jpg, webp, gif, svg o pdf)."}, status=status.HTTP_400_BAD_REQUEST)
        if archivo.size > MAX_MB * 1024 * 1024:
            return Response({"detail": f"El archivo supera {MAX_MB} MB."}, status=status.HTTP_400_BAD_REQUEST)
        nombre = default_storage.save(f"landing/{uuid.uuid4().hex}{ext}", archivo)
        return Response({"url": request.build_absolute_uri(default_storage.url(nombre)), "nombre": archivo.name}, status=status.HTTP_201_CREATED)
