"""Límites por actividad y excepciones por usuario (borrador local)."""
from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from trabajos.permissions import TieneAlgunPrivilegio
from trabajos.serializers import nombre_completo

from .models import Actividad, Congreso, LimiteEvaluador, LimiteTrabajo, LimiteUsuario

PRIVILEGIOS = ("asignar_evaluador", "modificar_fechas")
MAXIMO = 50


def _entero(valor, campo):
    try:
        n = int(valor)
    except (TypeError, ValueError):
        raise ValueError(f"{campo} debe ser un número entero.")
    if not 1 <= n <= MAXIMO:
        raise ValueError(f"{campo} debe estar entre 1 y {MAXIMO}.")
    return n


def _estado():
    actividades = []
    for a in Actividad.objects.order_by("nombre"):
        lt = LimiteTrabajo.objects.filter(actividad=a).first()
        actividades.append({
            "id": a.pk, "nombre": a.nombre,
            "evaluadores_por_trabajo": a.evaluadores_por_trabajo,
            "trabajos_por_ponente": lt.limite if lt else a.trabajos_por_ponente,
        })
    excepciones = [
        {"id": lu.pk, "actividad_id": lu.limite.actividad_id, "actividad": lu.limite.actividad.nombre,
         "usuario": nombre_completo(lu.usuario) or lu.usuario.email, "correo": lu.usuario.email,
         "limite_personalizado": lu.limite_personalizado}
        for lu in LimiteUsuario.objects.select_related("usuario", "limite__actividad").order_by("limite__actividad__nombre", "usuario__email")
    ]
    congresos = [
        {"id": c.pk, "nombre": f"{c.nombre_congreso} ({c.edicion_congreso})", "max_trabajos_por_evaluador": c.max_trabajos_por_evaluador, "limite_trabajos": c.limite_trabajos}
        for c in Congreso.objects.order_by("-edicion_congreso")
    ]
    excepciones_evaluador = [
        {"id": le.pk, "congreso_id": le.congreso_id, "congreso": f"{le.congreso.nombre_congreso} ({le.congreso.edicion_congreso})",
         "usuario": nombre_completo(le.usuario) or le.usuario.email, "correo": le.usuario.email,
         "limite_personalizado": le.limite_personalizado, "general": le.congreso.max_trabajos_por_evaluador}
        for le in LimiteEvaluador.objects.select_related("usuario", "congreso").order_by("-congreso__edicion_congreso", "usuario__email")
    ]
    return {"actividades": actividades, "excepciones": excepciones, "congresos": congresos, "excepciones_evaluador": excepciones_evaluador}


class LimitesView(APIView):
    """GET /api/congreso/limites/"""

    permission_classes = [TieneAlgunPrivilegio]
    privilegios_por_metodo = {"GET": PRIVILEGIOS}

    def get(self, request):
        return Response(_estado())


class LimiteActividadView(APIView):
    """PATCH /api/congreso/limites/actividades/<id>/ {evaluadores_por_trabajo?, trabajos_por_ponente?}"""

    permission_classes = [TieneAlgunPrivilegio]
    privilegios_por_metodo = {"PATCH": PRIVILEGIOS}

    def patch(self, request, pk):
        a = Actividad.objects.filter(pk=pk).first()
        if not a:
            return Response({"detail": "No encontramos esa actividad."}, status=status.HTTP_404_NOT_FOUND)
        try:
            with transaction.atomic():
                if "evaluadores_por_trabajo" in request.data:
                    a.evaluadores_por_trabajo = _entero(request.data["evaluadores_por_trabajo"], "Evaluadores por trabajo")
                if "trabajos_por_ponente" in request.data:
                    n = _entero(request.data["trabajos_por_ponente"], "Trabajos por ponente")
                    a.trabajos_por_ponente = n
                    lt = LimiteTrabajo.objects.filter(actividad=a).first()
                    if lt:
                        lt.limite = n
                        lt.save()
                    else:
                        LimiteTrabajo.objects.create(actividad=a, limite=n)
                a.save()
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(_estado())


class ExcepcionesView(APIView):
    """POST /api/congreso/limites/usuarios/ {correo, actividad, limite_personalizado} · DELETE ...<id>/"""

    permission_classes = [TieneAlgunPrivilegio]
    privilegios_por_metodo = {"POST": PRIVILEGIOS, "DELETE": PRIVILEGIOS}

    def post(self, request):
        usuario = get_user_model().objects.filter(email__iexact=str(request.data.get("correo", "")).strip()).first()
        if not usuario:
            return Response({"detail": "No hay un usuario registrado con ese correo."}, status=status.HTTP_400_BAD_REQUEST)
        a = Actividad.objects.filter(pk=request.data.get("actividad")).first()
        if not a:
            return Response({"detail": "Elige una actividad válida."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            n = _entero(request.data.get("limite_personalizado"), "El límite personalizado")
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        lt = LimiteTrabajo.objects.filter(actividad=a).first() or LimiteTrabajo.objects.create(actividad=a, limite=a.trabajos_por_ponente)
        LimiteUsuario.objects.update_or_create(usuario=usuario, limite=lt, defaults={"limite_personalizado": n})
        return Response(_estado(), status=status.HTTP_201_CREATED)

    def delete(self, request, pk):
        deleted, _ = LimiteUsuario.objects.filter(pk=pk).delete()
        if not deleted:
            return Response({"detail": "No encontramos esa excepción."}, status=status.HTTP_404_NOT_FOUND)
        return Response(_estado())


class LimiteCongresoView(APIView):
    """PATCH /api/congreso/limites/congresos/<id>/ {max_trabajos_por_evaluador?, limite_trabajos?} — tope por evaluador y tope global por usuario."""

    permission_classes = [TieneAlgunPrivilegio]
    privilegios_por_metodo = {"PATCH": PRIVILEGIOS}

    def patch(self, request, pk):
        c = Congreso.objects.filter(pk=pk).first()
        if not c:
            return Response({"detail": "No encontramos ese congreso."}, status=status.HTTP_404_NOT_FOUND)
        campos = {"max_trabajos_por_evaluador": "El máximo de trabajos por evaluador", "limite_trabajos": "El límite global de trabajos por usuario"}
        enviados = [k for k in campos if k in request.data]
        if not enviados:
            return Response({"detail": "No enviaste ningún límite."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            for k in enviados:
                setattr(c, k, _entero(request.data.get(k), campos[k]))
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        c.save(update_fields=enviados)
        return Response(_estado())


class ExcepcionesEvaluadorView(APIView):
    """POST /api/congreso/limites/evaluadores/ {correo, congreso, limite_personalizado} · DELETE ...<id>/ — tope de trabajos por evaluador."""

    permission_classes = [TieneAlgunPrivilegio]
    privilegios_por_metodo = {"POST": PRIVILEGIOS, "DELETE": PRIVILEGIOS}

    def post(self, request):
        from trabajos.automatizacion import evaluadores_disponibles

        usuario = evaluadores_disponibles().filter(email__iexact=str(request.data.get("correo", "")).strip()).first()
        if not usuario:
            return Response({"detail": "Ese correo no pertenece a ningún evaluador."}, status=status.HTTP_400_BAD_REQUEST)
        congreso = Congreso.objects.filter(pk=request.data.get("congreso")).first()
        if not congreso:
            return Response({"detail": "Elige un congreso válido."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            n = _entero(request.data.get("limite_personalizado"), "El límite personalizado")
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        LimiteEvaluador.objects.update_or_create(usuario=usuario, congreso=congreso, defaults={"limite_personalizado": n})
        return Response(_estado(), status=status.HTTP_201_CREATED)

    def delete(self, request, pk):
        deleted, _ = LimiteEvaluador.objects.filter(pk=pk).delete()
        if not deleted:
            return Response({"detail": "No encontramos esa excepción."}, status=status.HTTP_404_NOT_FOUND)
        return Response(_estado())
