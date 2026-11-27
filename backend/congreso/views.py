"""APIs que consume la pantalla /admin/nuevo-congreso (borrador local)."""
import json
from datetime import date

from django.db import transaction
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    Actividad, ConceptoCuota, Congreso, CongresoActividad, CongresoFechaImportante,
    CongresoPatrocinador, Cuota, FechaImportante, Patrocinador,
)
from .landing import conectar_datos_congreso, heredar_contenido
from .ventanas import NOMBRES, ORDEN, errores_de_orden

NOMBRES_ORDEN = [NOMBRES[k] for k in ORDEN]
from .permissions import PuedeGestionarCongresos
from .serializers import MODALIDADES, CongresoSerializer, PaginaSerializer

# Nombres de campo de la pantalla -> nombre del campo del modelo (los que difieren).
ALIAS_CAMPOS = {
    "contraseña_aplicacion": "contrasena_aplicacion",
    "imagen_contraseña": "imagen_contrasena",
    "imagen_crearCuenta": "imagen_crear_cuenta",
}


class CatalogosCongresoView(APIView):
    """GET /api/catalogos-congreso/ — catálogos para llenar el formulario."""

    permission_classes = [AllowAny]
    authentication_classes: list = []

    def get(self, request):
        return Response({
            "fechas": [
                {"id_fechas": f.pk, "nombre_fecha": f.nombre} for f in sorted(FechaImportante.objects.all(), key=_orden_fecha)
            ],
            "actividades": [
                {"id_actividad": a.pk, "nombre_actividad": a.nombre} for a in Actividad.objects.all()
            ],
            "cuotas": [
                {"id_cuota": c.pk, "concepto_cuota": c.nombre} for c in ConceptoCuota.objects.all()
            ],
            "patrocinadores": [
                {"id_patrocinador": p.pk, "nombre_patrocinador": p.nombre}
                for p in Patrocinador.objects.filter(activo=True)
            ],
        })


def _lista_json(request, clave):
    """Lee una lista serializada en JSON dentro del FormData."""
    crudo = request.data.get(clave)
    if not crudo:
        return []
    try:
        valor = json.loads(crudo)
    except (TypeError, ValueError):
        raise ValueError(f"El campo «{clave}» no tiene un formato válido.")
    if not isinstance(valor, list):
        raise ValueError(f"El campo «{clave}» debe ser una lista.")
    return valor


def _texto_errores(errores):
    partes = []
    for campo, mensajes in errores.items():
        if isinstance(mensajes, (list, tuple)):
            mensajes = " ".join(str(m) for m in mensajes)
        partes.append(f"{campo}: {mensajes}")
    return " | ".join(partes)


def _orden_fecha(f):
    """Las fechas del proceso salen en su orden natural; cualquier otra va al final."""
    return (NOMBRES_ORDEN.index(f.nombre) if f.nombre in NOMBRES_ORDEN else len(NOMBRES_ORDEN), f.pk)


class CrearCongresoView(APIView):
    """POST /api/congresos/crear/ — crea congreso + página + fechas, actividades, cuotas y patrocinadores."""

    permission_classes = [PuedeGestionarCongresos]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        datos = {ALIAS_CAMPOS.get(k, k): v for k, v in request.data.items()}
        archivos = {ALIAS_CAMPOS.get(k, k): v for k, v in request.FILES.items()}
        datos.update(archivos)

        modalidad = datos.get("modalidad_congreso")
        datos["modalidad_congreso"] = MODALIDADES.get(modalidad, modalidad)

        ser_congreso = CongresoSerializer(data=datos)
        ser_pagina = PaginaSerializer(data=datos)
        errores = {}
        if not ser_congreso.is_valid():
            errores.update(ser_congreso.errors)
        if not ser_pagina.is_valid():
            errores.update(ser_pagina.errors)
        if errores:
            return Response({"detail": _texto_errores(errores), "errors": errores}, status=status.HTTP_400_BAD_REQUEST)

        try:
            fechas = _lista_json(request, "fechas")
            actividades = _lista_json(request, "actividades")
            cuotas = _lista_json(request, "cuotas")
            patrocinadores = _lista_json(request, "patrocinadores")
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        try:
            nombres = {fi.pk: fi.nombre for fi in FechaImportante.objects.all()}
            items = [(nombres.get(f.get("id_fecha")), date.fromisoformat(str(f["fecha_inicio"])), date.fromisoformat(str(f["fecha_fin"]))) for f in fechas]
            errores_orden = errores_de_orden(i for i in items if i[0])
        except (KeyError, ValueError, TypeError, AttributeError):
            errores_orden = []  # fechas mal formadas: las reporta la validación del modelo más abajo
        if errores_orden:
            return Response({"detail": " ".join(errores_orden)}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                congreso = ser_congreso.save()
                ser_pagina.save(congreso=congreso)
                heredar_contenido(congreso)

                for f in fechas:
                    fecha = CongresoFechaImportante(
                        congreso=congreso,
                        fecha_importante=FechaImportante.objects.get(pk=f["id_fecha"]),
                        fecha_inicio=f["fecha_inicio"],
                        fecha_fin=f["fecha_fin"],
                    )
                    fecha.full_clean()
                    fecha.save()

                for a in actividades:
                    CongresoActividad.objects.create(
                        congreso=congreso,
                        actividad=Actividad.objects.get(pk=a["id_actividad"]),
                        activa=bool(a.get("activo", True)),
                    )

                for c in cuotas:
                    cuota = Cuota(
                        congreso=congreso,
                        concepto=ConceptoCuota.objects.get(pk=c["id_Cuota"]),
                        monto=c["importe"],
                    )
                    cuota.full_clean()
                    cuota.save()

                for pk in patrocinadores:
                    CongresoPatrocinador.objects.create(
                        congreso=congreso, patrocinador=Patrocinador.objects.get(pk=pk)
                    )

                conectar_datos_congreso(congreso)
        except (KeyError, TypeError):
            return Response({"detail": "Los datos de fechas, actividades, cuotas o patrocinadores están incompletos."}, status=status.HTTP_400_BAD_REQUEST)
        except (FechaImportante.DoesNotExist, Actividad.DoesNotExist, ConceptoCuota.DoesNotExist, Patrocinador.DoesNotExist):
            return Response({"detail": "Alguno de los elementos seleccionados ya no existe en el catálogo."}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:  # ValidationError / IntegrityError (cuota duplicada, fechas inválidas, etc.)
            mensaje = getattr(exc, "messages", None)
            detalle = " ".join(mensaje) if mensaje else "No se pudo registrar el congreso; revisa fechas, cuotas y que la edición no exista ya."
            return Response({"detail": detalle}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"id": congreso.pk, "detail": "Congreso registrado."}, status=status.HTTP_201_CREATED)
