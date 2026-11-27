"""API del coordinador: bandeja de solicitudes y dictamen de resúmenes (borrador local)."""
from django.db.models import Q
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from congreso.models import Actividad, Congreso

from .automatizacion import carga, etapa_de, tope, evaluadores_disponibles, filas_vigentes, requeridos, ronda_para_asignar
from congreso import ventanas

from . import plazos
from .extenso import info_extenso, responder_archivo
from .flujo import ACCIONES, acciones_disponibles, fase_aceptada, fase_destino, normalizar, progreso
from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.utils import timezone

from .models import Evaluador, Fase, Trabajo
from .permissions import TieneAlgunPrivilegio
from .serializers import nombre_completo

PRIVILEGIOS = {"GET": ("evaluar_general", "asignar_evaluador"), "POST": ("evaluar_general", "asignar_evaluador")}


def _todos():
    return Trabajo.objects.select_related("congreso", "actividad", "area", "fase").prefetch_related("autores__usuario", "evaluadores__usuario").order_by("-fecha_registro")


def _espera_evaluador(t):
    """True si el trabajo está en evaluación pero aún falta que el coordinador asigne a un evaluador (p. ej. el 2.º del extenso)."""
    etapa = etapa_de(t)
    if normalizar(t.fase.nombre) != f"{etapa}_evaluacion":
        return False
    filas = list(filas_vigentes(t, etapa))
    return len(filas) < requeridos(t, etapa) and all(f.dictamen for f in filas)


def serializar_admin(t):
    autores = sorted(t.autores.all(), key=lambda a: a.orden_autor)
    return {
        "id": t.pk,
        "clave": t.clave,
        "titulo": t.titulo,
        "resumen": t.resumen,
        "palabras_clave": t.palabras_clave,
        "congreso": {"id": t.congreso_id, "nombre": t.congreso.nombre_congreso, "edicion": t.congreso.edicion_congreso},
        "actividad": {"id": t.actividad_id, "nombre": t.actividad.nombre},
        "area": {"id": t.area_id, "nombre": t.area.name},
        "fase": {"id": t.fase_id, "nombre": t.fase.nombre, "descripcion": t.fase.descripcion},
        "fecha_registro": t.fecha_registro,
        "observaciones": t.observaciones,
        "extenso": info_extenso(t),
        "autores": [
            {"nombre": nombre_completo(a.usuario), "correo": a.usuario.email, "es_autor": a.es_autor, "orden": a.orden_autor}
            for a in autores
        ],
        "acciones": acciones_disponibles(t),
        "progreso": progreso(t),
        "evaluadores_requeridos": requeridos(t, etapa_de(t)),
        "etapa_revision": etapa_de(t),
        "espera_evaluador": _espera_evaluador(t),
        "asignacion_bloqueada": plazos.asignacion(t, etapa_de(t)),
        "fechas": ventanas.resumen_ventanas(t.congreso),
        "evaluadores": [
            {"id": e.pk, "numero": e.numero, "nombre": nombre_completo(e.usuario) or e.usuario.email,
             "correo": e.usuario.email, "dictamen": e.dictamen, "fecha_limite": e.fecha_limite, "fecha_envio": e.fecha_envio}
            for e in sorted(filas_vigentes(t), key=lambda e: e.numero)
        ],
    }


class ListadoSolicitudesView(APIView):
    """GET /api/trabajos/solicitudes/?congreso=&actividad=&fase=&q= — todos los trabajos recibidos."""

    permission_classes = [TieneAlgunPrivilegio]
    privilegios_por_metodo = PRIVILEGIOS

    def get(self, request):
        qs = _todos()
        p = request.query_params
        if p.get("congreso", "").isdigit():
            qs = qs.filter(congreso_id=int(p["congreso"]))
        if p.get("actividad", "").isdigit():
            qs = qs.filter(actividad_id=int(p["actividad"]))
        if p.get("fase"):
            qs = qs.filter(fase__nombre__iexact=p["fase"].replace("_", " ")) | qs.filter(fase__nombre__iexact=p["fase"])
        if p.get("q"):
            q = p["q"].strip()
            qs = qs.filter(
                Q(titulo__icontains=q) | Q(clave__icontains=q) | Q(palabras_clave__icontains=q)
                | Q(autores__usuario__email__icontains=q) | Q(autores__usuario__first_name__icontains=q)
                | Q(autores__usuario__last_name__icontains=q)
            ).distinct()
        trabajos = list(qs)
        if p.get("activos") == "1":  # «Trabajos activos»: resumen aceptado y no rechazado
            trabajos = [t for t in trabajos if fase_aceptada(t.fase)]
        return Response({
            "resultados": [serializar_admin(t) for t in trabajos],
            "filtros": {
                "congresos": [{"id": c.pk, "nombre": f"{c.nombre_congreso} ({c.edicion_congreso})"} for c in Congreso.objects.order_by("-edicion_congreso")],
                "actividades": [{"id": a.pk, "nombre": a.nombre} for a in Actividad.objects.order_by("nombre")],
                "fases": sorted({f.nombre.strip().lower().replace(" ", "_") for f in Fase.objects.all()}),
            },
        })


class DictamenResumenView(APIView):
    """POST /api/trabajos/solicitudes/<id>/dictamen/ {accion: revision|aprobar|rechazar, observaciones}."""

    permission_classes = [TieneAlgunPrivilegio]
    privilegios_por_metodo = PRIVILEGIOS

    def post(self, request, pk):
        t = _todos().filter(pk=pk).first()
        if not t:
            return Response({"detail": "No encontramos esa solicitud."}, status=status.HTTP_404_NOT_FOUND)
        accion = request.data.get("accion")
        if accion not in ACCIONES:
            return Response({"detail": "Acción no válida."}, status=status.HTTP_400_BAD_REQUEST)
        destino = fase_destino(t, accion)
        if destino is None:
            return Response({"detail": "Esa acción no aplica a la fase actual del trabajo."}, status=status.HTTP_409_CONFLICT)
        observaciones = (request.data.get("observaciones") or "").strip()
        if ACCIONES[accion]["pide_observaciones"] and len(observaciones) < 10:
            return Response({"detail": "Escribe las observaciones para el autor (mínimo 10 caracteres)."}, status=status.HTTP_400_BAD_REQUEST)
        t.fase = destino
        if observaciones or accion.startswith(("aprobar", "rechazar")):
            t.observaciones = observaciones
        t.save()
        return Response(serializar_admin(_todos().get(pk=t.pk)))


_evaluadores_disponibles = evaluadores_disponibles  # misma lista que usa la asignación automática


class EvaluadoresDisponiblesView(APIView):
    """GET /api/trabajos/evaluadores/ — evaluadores que se pueden asignar."""

    permission_classes = [TieneAlgunPrivilegio]
    privilegios_por_metodo = PRIVILEGIOS

    def get(self, request):
        congreso = request.query_params.get("congreso")
        filtro = {"trabajo__congreso_id": int(congreso)} if str(congreso).isdigit() else {}
        cg = Congreso.objects.filter(pk=int(congreso)).first() if str(congreso).isdigit() else None
        filas = []
        for u in _evaluadores_disponibles():
            maximo = tope(u, cg) if cg else None
            n = Evaluador.objects.filter(usuario=u, **filtro).values("trabajo").distinct().count()
            filas.append({"id": u.pk, "nombre": nombre_completo(u) or u.email, "correo": u.email,
                          "asignados": n, "maximo": maximo, "lleno": maximo is not None and n >= maximo})
        return Response(filas)


class AsignarEvaluadorView(APIView):
    """POST /api/trabajos/solicitudes/<id>/evaluadores/ {usuario, fecha_limite?}; DELETE ...?evaluador=<id>."""

    permission_classes = [TieneAlgunPrivilegio]
    privilegios_por_metodo = {"POST": ("asignar_evaluador",), "DELETE": ("asignar_evaluador",)}

    def post(self, request, pk):
        t = _todos().filter(pk=pk).first()
        if not t:
            return Response({"detail": "No encontramos esa solicitud."}, status=status.HTTP_404_NOT_FOUND)
        motivo = plazos.asignacion(t, etapa_de(t))
        if motivo:
            return Response({"detail": motivo}, status=status.HTTP_409_CONFLICT)
        usuario = _evaluadores_disponibles().filter(pk=request.data.get("usuario")).first()
        if usuario is None:
            return Response({"detail": "Elige un evaluador válido."}, status=status.HTTP_400_BAD_REQUEST)
        if t.autores.filter(usuario=usuario).exists():
            return Response({"detail": "Un autor no puede evaluar su propio trabajo."}, status=status.HTTP_400_BAD_REQUEST)
        etapa = etapa_de(t)
        ya_en_el_trabajo = t.evaluadores.filter(usuario=usuario).exists()
        asignados = carga(usuario, t.congreso)
        maximo = tope(usuario, t.congreso)
        if not ya_en_el_trabajo and asignados >= maximo:
            return Response(
                {"detail": f"Este evaluador ya tiene {asignados} trabajo(s) asignados, el máximo permitido para esta persona en este congreso ({maximo})."},
                status=status.HTTP_409_CONFLICT,
            )
        ronda = ronda_para_asignar(t, etapa)
        vigentes = Evaluador.objects.filter(trabajo=t, etapa=etapa, ronda=ronda)
        if vigentes.count() >= requeridos(t, etapa):
            return Response({"detail": "Este trabajo ya tiene todos los evaluadores que le corresponden."}, status=status.HTTP_409_CONFLICT)
        fecha_limite = None
        if request.data.get("fecha_limite"):
            from django.utils.dateparse import parse_datetime, parse_date
            import datetime
            raw = request.data["fecha_limite"]
            fecha_limite = parse_datetime(raw)
            if fecha_limite is None and parse_date(raw):
                fecha_limite = datetime.datetime.combine(parse_date(raw), datetime.time(23, 59), tzinfo=timezone.get_current_timezone())
            if fecha_limite is None:
                return Response({"detail": "Fecha límite no válida."}, status=status.HTTP_400_BAD_REQUEST)
        usados = set(vigentes.values_list("numero", flat=True))
        numero = next(n for n in range(1, len(usados) + 2) if n not in usados)
        try:
            with transaction.atomic():
                Evaluador.objects.create(usuario=usuario, trabajo=t, etapa=etapa, ronda=ronda, numero=numero, fecha_limite=fecha_limite)
                # Con un evaluador asignado el trabajo ya está en revisión (antes había que pulsar «Pasar a revisión»).
                accion = "revision" if etapa == "resumen" else "revision_extenso"
                destino = fase_destino(t, accion)
                if destino is not None:
                    t.fase = destino
                    t.save()
        except IntegrityError:
            return Response({"detail": "Ese evaluador ya está asignado a este trabajo."}, status=status.HTTP_409_CONFLICT)
        return Response(serializar_admin(_todos().get(pk=t.pk)), status=status.HTTP_201_CREATED)

    def delete(self, request, pk):
        ev = Evaluador.objects.filter(pk=request.query_params.get("evaluador"), trabajo_id=pk).first()
        if not ev:
            return Response({"detail": "No encontramos esa asignación."}, status=status.HTTP_404_NOT_FOUND)
        if ev.dictamen:
            return Response({"detail": "Ese evaluador ya envió su dictamen."}, status=status.HTTP_409_CONFLICT)
        ev.delete()
        return Response(serializar_admin(_todos().get(pk=pk)))


class ExtensoCoordinadorView(APIView):
    """GET /api/trabajos/solicitudes/<id>/extenso/ — descarga el extenso para revisarlo."""

    permission_classes = [TieneAlgunPrivilegio]
    privilegios_por_metodo = PRIVILEGIOS

    def get(self, request, pk):
        t = _todos().filter(pk=pk).first()
        if not t:
            return Response({"detail": "No encontramos esa solicitud."}, status=status.HTTP_404_NOT_FOUND)
        return responder_archivo(t)
