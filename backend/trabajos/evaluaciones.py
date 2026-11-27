"""API del evaluador (borrador local): /api/evaluaciones/asignadas/. Forma de datos = la que espera el front."""
from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .automatizacion import procesar_dictamen
from . import plazos
from congreso import ventanas
from .extenso import info_extenso, responder_archivo
from .flujo import normalizar
from .models import Evaluador, Pregunta, TrabajoPregunta
from .permissions import TieneAlgunPrivilegio
from .serializers import nombre_completo

PRIVILEGIOS = {"GET": ("ver_sus_evaluaciones", "evaluar_trabajo"), "POST": ("evaluar_trabajo",)}
DICTAMENES = {"aceptado", "aceptado_cambios", "rechazado"}
COMENTARIO_MAX = 500


def _mias(user):
    return (Evaluador.objects.filter(usuario=user)
            .select_related("trabajo__congreso", "trabajo__actividad", "trabajo__area", "trabajo__fase")
            .prefetch_related("trabajo__autores__usuario__profile__institution", "respuestas__pregunta"))


def _preguntas(trabajo):
    return list(Pregunta.objects.filter(fase=trabajo.fase, activa=True).order_by("pk"))


def _respuestas(ev):
    return [
        {"pregunta": r.pregunta_id, "texto": r.pregunta.texto, "cumple": r.respuesta == TrabajoPregunta.Respuesta.SI,
         "comentario": r.observacion or ""}
        for r in sorted(ev.respuestas.all(), key=lambda r: r.pregunta_id)
    ]


def _evaluacion(ev):
    return {"fechaEnvio": ev.fecha_envio, "dictamen": ev.dictamen, "comentario": ev.comentario, "respuestas": _respuestas(ev)}


def _archivo(ev):
    info = info_extenso(ev.trabajo)
    if not info:
        return {"nombre": f"{ev.trabajo.clave}_extenso", "url": None}
    return {"nombre": info["nombre"], "url": f"/api/evaluaciones/asignadas/{ev.pk}/archivo/"}


def _estado(ev):
    return "evaluado" if ev.dictamen else "pendiente"


def _plazo(ev):
    """Periodo de evaluación del congreso (para avisarle al evaluador de qué fecha a qué fecha puede calificar); None si no está configurado."""
    clave = ventanas.EVALUACION_RESUMEN if ev.etapa == "resumen" else ventanas.EVALUACION_EXTENSO
    v = ventanas.ventana(ev.trabajo.congreso, clave)
    if v is None:
        return None
    rango = f"del {ventanas._fmt(v['inicio'])} al {ventanas._fmt(v['fin'])}"
    if v["futura"]:
        mensaje = f"El periodo de evaluación es {rango}. Todavía no puedes enviar tu evaluación."
    elif v["pasada"]:
        mensaje = f"El periodo de evaluación fue {rango}. Ya no puedes enviar tu evaluación."
    else:
        mensaje = f"Tienes {rango} para evaluar este trabajo."
    return {"nombre": v["nombre"], "inicio": str(v["inicio"]), "fin": str(v["fin"]), "abierta": v["abierta"],
            "futura": v["futura"], "pasada": v["pasada"], "mensaje": mensaje}


def _resumen(ev):
    t = ev.trabajo
    autores = sorted(t.autores.all(), key=lambda a: a.orden_autor)
    instituciones = []
    for a in autores:
        perfil = getattr(a.usuario, "profile", None)
        inst = getattr(getattr(perfil, "institution", None), "name", None)
        if inst and inst not in instituciones:
            instituciones.append(inst)
    return {
        "id": ev.pk,
        "ronda": ev.ronda,
        "etapa": ev.etapa,
        "estado": _estado(ev),
        "fechaAsignacion": ev.fecha_asignacion,
        "fechaLimite": ev.fecha_limite,
        "plazo": _plazo(ev),
        "trabajo": {
            "id": t.pk,
            "folio": t.clave,
            "titulo": t.titulo,
            "area": t.area.name,
            "autores": [nombre_completo(a.usuario) or a.usuario.email for a in autores],
            "institucion": ", ".join(instituciones),
            "palabrasClave": [p.strip() for p in t.palabras_clave.split(",") if p.strip()],
            "resumen": t.resumen,
            # BORRADOR: todavía no se sube el extenso, por eso no hay archivo.
            "archivo": _archivo(ev),
            "fechaEnvio": t.fecha_registro,
        },
        "tieneObservacionesPrevias": Evaluador.objects.filter(trabajo=t).exclude(pk=ev.pk).exclude(dictamen__isnull=True).exists(),
        "miEvaluacion": _evaluacion(ev) if ev.dictamen else None,
    }


def _detalle(ev):
    data = _resumen(ev)
    data.pop("tieneObservacionesPrevias")
    data["preguntas"] = [{"id": p.pk, "texto": p.texto} for p in _preguntas(ev.trabajo)]
    otros = (Evaluador.objects.filter(trabajo=ev.trabajo).exclude(pk=ev.pk).exclude(dictamen__isnull=True)
             .prefetch_related("respuestas__pregunta").order_by("numero"))
    data["observacionesPrevias"] = [
        {"id": o.pk, "evaluador": f"Evaluador {o.numero}", "ronda": 1, "fechaEnvio": o.fecha_envio,
         "dictamen": o.dictamen, "comentario": o.comentario, "respuestas": _respuestas(o)}
        for o in otros
    ]
    return data


class AsignadasView(APIView):
    permission_classes = [TieneAlgunPrivilegio]
    privilegios_por_metodo = PRIVILEGIOS

    def get(self, request):
        return Response([_resumen(e) for e in _mias(request.user).order_by("-fecha_asignacion")])


class AsignadaDetalleView(APIView):
    permission_classes = [TieneAlgunPrivilegio]
    privilegios_por_metodo = PRIVILEGIOS

    def get(self, request, pk):
        ev = _mias(request.user).filter(pk=pk).first()
        if not ev:
            return Response({"detail": "No encontramos esta asignación."}, status=status.HTTP_404_NOT_FOUND)
        return Response(_detalle(ev))


class EnviarEvaluacionView(APIView):
    """POST {respuestas:[{pregunta, cumple, comentario}], dictamen, comentario}."""

    permission_classes = [TieneAlgunPrivilegio]
    privilegios_por_metodo = PRIVILEGIOS

    def post(self, request, pk):
        ev = _mias(request.user).filter(pk=pk).first()
        if not ev:
            return Response({"detail": "No encontramos esta asignación."}, status=status.HTTP_404_NOT_FOUND)
        if ev.dictamen:
            return Response({"detail": "Ya enviaste esta evaluación."}, status=status.HTTP_409_CONFLICT)
        if normalizar(ev.trabajo.fase.nombre) != f"{ev.etapa}_evaluacion":
            return Response({"detail": "Este trabajo ya no está en revisión; cambió de fase."}, status=status.HTTP_409_CONFLICT)
        motivo = plazos.evaluacion(ev.trabajo, ev.etapa)
        if motivo:
            return Response({"detail": motivo}, status=status.HTTP_409_CONFLICT)
        d = request.data
        if d.get("dictamen") not in DICTAMENES:
            return Response({"detail": "Selecciona un dictamen válido."}, status=status.HTTP_400_BAD_REQUEST)
        comentario = (d.get("comentario") or "").strip()
        if len(comentario) > COMENTARIO_MAX:
            return Response({"detail": f"El comentario no puede pasar de {COMENTARIO_MAX} caracteres."}, status=status.HTTP_400_BAD_REQUEST)
        preguntas = {p.pk: p for p in _preguntas(ev.trabajo)}
        if not preguntas:
            return Response({"detail": "Esta fase no tiene preguntas de evaluación configuradas."}, status=status.HTTP_409_CONFLICT)
        enviadas = {}
        for r in d.get("respuestas") or []:
            enviadas[r.get("pregunta")] = r
        if d["dictamen"] == "aceptado" and any(r.get("cumple") is False for r in enviadas.values()):
            return Response({"detail": "Marcaste «No» en alguna pregunta: no se puede aceptar tal cual. Elige «Aceptado con cambios» o «Debe modificarse» para que el ponente lo corrija."},
                            status=status.HTTP_400_BAD_REQUEST)
        if set(enviadas) != set(preguntas):
            return Response({"detail": "Responde todas las preguntas."}, status=status.HTTP_400_BAD_REQUEST)
        for pid, r in enviadas.items():
            if not isinstance(r.get("cumple"), bool):
                return Response({"detail": "Responde Sí o No en todas las preguntas."}, status=status.HTTP_400_BAD_REQUEST)
            texto = (r.get("comentario") or "").strip()
            if not r["cumple"] and not texto:
                return Response({"detail": "Explica en un comentario cada respuesta «No»."}, status=status.HTTP_400_BAD_REQUEST)
            if len(texto) > COMENTARIO_MAX:
                return Response({"detail": f"Cada comentario puede tener hasta {COMENTARIO_MAX} caracteres."}, status=status.HTTP_400_BAD_REQUEST)
        with transaction.atomic():
            for pid, r in enviadas.items():
                TrabajoPregunta.objects.create(
                    trabajo=ev.trabajo, pregunta=preguntas[pid], evaluador=ev,
                    respuesta=TrabajoPregunta.Respuesta.SI if r["cumple"] else TrabajoPregunta.Respuesta.NO,
                    observacion="" if r["cumple"] else (r.get("comentario") or "").strip(),
                )
            ev.dictamen = d["dictamen"]
            ev.comentario = comentario
            ev.fecha_envio = timezone.now()
            ev.save()
            procesar_dictamen(ev)  # el dictamen mueve la fase; el coordinador no tiene que calificar
        return Response(_detalle(_mias(request.user).get(pk=pk)))


class ArchivoAsignadaView(APIView):
    """GET /api/evaluaciones/asignadas/<id>/archivo/ — el evaluador descarga el extenso de su trabajo."""

    permission_classes = [TieneAlgunPrivilegio]
    privilegios_por_metodo = PRIVILEGIOS

    def get(self, request, pk):
        ev = _mias(request.user).filter(pk=pk).first()
        if not ev:
            return Response({"detail": "No encontramos esta asignación."}, status=status.HTTP_404_NOT_FOUND)
        return responder_archivo(ev.trabajo)
