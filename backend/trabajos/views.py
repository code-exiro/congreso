"""API del ponente: elegir tipo de trabajo, registrar resúmenes y consultar sus solicitudes (borrador local)."""
from django.db import transaction
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from catalogs.models import Area
from congreso.models import Congreso, CongresoActividad
from users.services import effective_profile_status

from .automatizacion import reenviar_resumen
from .models import Trabajo, UsuarioTrabajo
from .permissions import TieneAlgunPrivilegio
from .serializers import (
    SolicitudSerializer, coautores_sin_cupo, nombre_completo, resolver_coautor, crear_trabajo, limite_global, limite_para, serializar_trabajo, trabajos_totales, trabajos_usados, ventana_recepcion,
)

PRIVILEGIOS = {
    "GET": ("ver_sus_trabajos", "subir_trabajo"),
    "POST": ("subir_trabajo",),
    "PATCH": ("subir_trabajo",),
    "DELETE": ("subir_trabajo",),
}


def _mis_trabajos(usuario):
    return (
        Trabajo.objects.filter(autores__usuario=usuario)
        .select_related("congreso", "actividad", "area", "fase")
        .distinct()
        .order_by("-fecha_registro")
    )


def _texto_errores(errores):
    partes = []
    for campo, mensajes in errores.items():
        if isinstance(mensajes, (list, tuple)):
            mensajes = " ".join(str(m) for m in mensajes)
        partes.append(str(mensajes) if campo in ("non_field_errors", "detail") else f"{campo}: {mensajes}")
    return " | ".join(partes)


class OpcionesSolicitudView(APIView):
    """GET /api/trabajos/opciones/ — congresos, tipos de trabajo disponibles (con límites) y áreas."""

    permission_classes = [TieneAlgunPrivilegio]
    privilegios_por_metodo = PRIVILEGIOS

    def get(self, request):
        usuario = request.user
        congresos = []
        for c in Congreso.objects.order_by("-edicion_congreso"):
            actividades = []
            for ca in CongresoActividad.objects.filter(congreso=c, activa=True).select_related("actividad").order_by("actividad__nombre"):
                limite = limite_para(usuario, c, ca.actividad)
                actividades.append({
                    "id": ca.actividad_id,
                    "nombre": ca.actividad.nombre,
                    "limite": limite,
                    "usados": trabajos_usados(usuario, c, ca.actividad),
                })
            ventana = ventana_recepcion(c)
            congresos.append({
                "id": c.pk, "nombre": c.nombre_congreso, "edicion": c.edicion_congreso,
                "actividades": actividades, "recepcion": ventana,
                "limite_global": limite_global(c), "usados_global": trabajos_totales(usuario, c),
            })
        return Response({
            "congresos": congresos,
            "areas": [{"id": a.pk, "clave": a.code, "nombre": a.name} for a in Area.objects.order_by("name")],
            "perfil_completo": effective_profile_status(usuario)["is_complete"],
        })


class MisSolicitudesView(APIView):
    """GET lista mis solicitudes; POST registra un resumen nuevo."""

    permission_classes = [TieneAlgunPrivilegio]
    privilegios_por_metodo = PRIVILEGIOS

    def get(self, request):
        return Response([serializar_trabajo(t, request.user) for t in _mis_trabajos(request.user)])

    def post(self, request):
        if not effective_profile_status(request.user)["is_complete"]:
            return Response(
                {"detail": "Completa los datos obligatorios de tu perfil antes de enviar un resumen.", "code": "perfil_incompleto"},
                status=status.HTTP_403_FORBIDDEN,
            )
        ser = SolicitudSerializer(data=request.data, context={"request": request, "crear": True})
        if not ser.is_valid():
            return Response({"detail": _texto_errores(ser.errors), "errors": ser.errors}, status=status.HTTP_400_BAD_REQUEST)
        with transaction.atomic():
            trabajo = crear_trabajo(ser.validated_data, request.user)
        trabajo = _mis_trabajos(request.user).get(pk=trabajo.pk)
        return Response(serializar_trabajo(trabajo, request.user), status=status.HTTP_201_CREATED)


class VerificarCoautorView(APIView):
    """GET /api/trabajos/coautores/verificar/?correo= — comprueba que el correo sea de un usuario registrado con rol de ponente."""

    permission_classes = [TieneAlgunPrivilegio]
    privilegios_por_metodo = {"GET": ("subir_trabajo",)}

    def get(self, request):
        correo = (request.query_params.get("correo") or "").strip()
        if not correo:
            return Response({"detail": "Escribe el correo del coautor."}, status=status.HTTP_400_BAD_REQUEST)
        if correo.lower() == request.user.email.lower():
            return Response({"detail": "Ese eres tú: ya apareces como autor del trabajo."}, status=status.HTTP_400_BAD_REQUEST)
        u, error = resolver_coautor(correo)
        if error:
            return Response({"detail": error}, status=status.HTTP_404_NOT_FOUND)
        return Response({"correo": u.email, "nombre": nombre_completo(u)})


class SolicitudDetalleView(APIView):
    """GET ver, PATCH corregir y DELETE retirar un resumen (solo mientras sigue en su primera fase)."""

    permission_classes = [TieneAlgunPrivilegio]
    privilegios_por_metodo = PRIVILEGIOS

    def _obtener(self, request, pk):
        return _mis_trabajos(request.user).filter(pk=pk).first()

    def get(self, request, pk):
        t = self._obtener(request, pk)
        if not t:
            return Response({"detail": "No encontramos esa solicitud."}, status=status.HTTP_404_NOT_FOUND)
        return Response(serializar_trabajo(t, request.user))

    def patch(self, request, pk):
        t = self._obtener(request, pk)
        if not t:
            return Response({"detail": "No encontramos esa solicitud."}, status=status.HTTP_404_NOT_FOUND)
        datos_t = serializar_trabajo(t, request.user)
        if not datos_t["puede_editar"]:
            return Response({"detail": datos_t["aviso_edicion"] or "Ya no puedes modificar este resumen porque avanzó de fase."}, status=status.HTTP_409_CONFLICT)
        ser = SolicitudSerializer(
            data={"titulo": t.titulo, "resumen": t.resumen, "palabras_clave": t.palabras_clave, **request.data},
            context={"request": request, "crear": False},
        )
        if not ser.is_valid():
            return Response({"detail": _texto_errores(ser.errors), "errors": ser.errors}, status=status.HTTP_400_BAD_REQUEST)
        d = ser.validated_data
        sin_cupo = coautores_sin_cupo(d.get("coautores", []), t.congreso, t.actividad, trabajo=t)
        if sin_cupo:
            mensaje = "Ya alcanzaron su límite de trabajos de este tipo: " + ", ".join(sin_cupo) + "."
            return Response({"detail": mensaje, "errors": {"coautores": [mensaje]}}, status=status.HTTP_400_BAD_REQUEST)
        with transaction.atomic():
            t.titulo, t.resumen, t.palabras_clave = d["titulo"], d["resumen"], d["palabras_clave"]
            if "area" in d:
                t.area = d["area"]
            t.save()
            if "coautores" in d:
                t.autores.filter(es_autor=False).delete()
                for i, co in enumerate(d["coautores"], start=2):
                    UsuarioTrabajo.objects.create(usuario=co, trabajo=t, es_autor=False, orden_autor=i)
            reenviar_resumen(t)  # si venía devuelto con cambios, vuelve a su evaluador; si no, sigue esperando al coordinador
        return Response(serializar_trabajo(_mis_trabajos(request.user).get(pk=t.pk), request.user))

    def delete(self, request, pk):
        t = self._obtener(request, pk)
        if not t:
            return Response({"detail": "No encontramos esa solicitud."}, status=status.HTTP_404_NOT_FOUND)
        datos_t = serializar_trabajo(t, request.user)
        if not datos_t["puede_editar"]:
            return Response({"detail": datos_t["aviso_edicion"] or "Ya no puedes retirar este resumen porque avanzó de fase."}, status=status.HTTP_409_CONFLICT)
        t.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
