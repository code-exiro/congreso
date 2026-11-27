"""BORRADOR local (23-nov-2026): el coordinador asigna al evaluador y el evaluador decide.

Flujo:
  • El resumen lo lee el COORDINADOR y asigna al evaluador; esa asignación es la que lo aprueba para evaluación
    (el trabajo pasa a «resumen_evaluacion»). El sistema NUNCA elige evaluadores por su cuenta.
  • Dictamen del resumen: aceptado → «resumen_aprobado»; con cambios → vuelve al ponente (puede corregir y se reenvía al
    mismo evaluador); rechazado → «resumen_rechazado» con el motivo.
  • Al subir el extenso lo revisa primero el mismo evaluador del resumen (si sigue siendo válido; si no, espera al
    coordinador). Cuando lo aprueba, el trabajo queda esperando a que el COORDINADOR asigne al siguiente evaluador (viendo
    la carga de cada uno y con los que llegaron a su tope inhabilitados), hasta completar los de la actividad. Cualquier «con cambios» o rechazo lo regresa al ponente
    («Debe modificarse»); al reenviarlo se reinicia la secuencia.
El coordinador conserva además sus acciones manuales (pasar a revisión, aprobar, rechazar) para casos excepcionales.
"""
from django.contrib.auth import get_user_model
from django.db.models import Q

from .flujo import fase_destino, normalizar
from .models import Evaluador, Fase, TrabajoPregunta

ETAPAS = ("resumen", "extenso")
POSITIVO = "aceptado"


def evaluadores_disponibles():
    """Usuarios con rol de evaluador o con el privilegio de evaluar trabajos."""
    User = get_user_model()
    return User.objects.filter(
        Q(user_roles__role__name__iexact="evaluador")
        | Q(user_roles__role__role_privileges__privilege__code="evaluar_trabajo")
    ).distinct().order_by("first_name", "last_name", "email")


def carga(usuario, congreso):
    """Trabajos distintos del congreso en los que el usuario es evaluador (no cuenta rondas ni etapas repetidas)."""
    return Evaluador.objects.filter(usuario=usuario, trabajo__congreso=congreso).values("trabajo").distinct().count()


def tope(usuario, congreso):
    """Máximo de trabajos del evaluador en el congreso: su excepción personal o, si no tiene, el general del congreso."""
    from congreso.models import LimiteEvaluador

    personal = LimiteEvaluador.objects.filter(usuario=usuario, congreso=congreso).values_list("limite_personalizado", flat=True).first()
    return personal if personal is not None else congreso.max_trabajos_por_evaluador


def etapa_de(trabajo):
    return "extenso" if normalizar(trabajo.fase.nombre).startswith("extenso") else "resumen"


def ronda_actual(trabajo, etapa):
    return max(Evaluador.objects.filter(trabajo=trabajo, etapa=etapa).values_list("ronda", flat=True), default=1)


def filas_vigentes(trabajo, etapa=None):
    etapa = etapa or etapa_de(trabajo)
    return Evaluador.objects.filter(trabajo=trabajo, etapa=etapa, ronda=ronda_actual(trabajo, etapa)).select_related("usuario")


def ronda_para_asignar(trabajo, etapa):
    """Ronda en la que entra una asignación nueva: la vigente si sigue abierta, o una nueva si ya se cerró."""
    filas = Evaluador.objects.filter(trabajo=trabajo, etapa=etapa)
    if not filas.exists():
        return 1
    ultima = ronda_actual(trabajo, etapa)
    if normalizar(trabajo.fase.nombre) == f"{etapa}_evaluacion":
        return ultima  # sigue en evaluación: el evaluador que falta (2.º del extenso) entra en la misma ronda
    cerrada = not filas.filter(ronda=ultima, dictamen__isnull=True).exists()
    return ultima + 1 if cerrada else ultima


def requeridos(trabajo, etapa):
    return 1 if etapa == "resumen" else trabajo.actividad.evaluadores_por_trabajo


def _ids_autores(trabajo):
    return set(trabajo.autores.values_list("usuario_id", flat=True))


def asignar(trabajo, usuario, etapa, ronda, numero, fecha_limite=None):
    return Evaluador.objects.create(usuario=usuario, trabajo=trabajo, etapa=etapa, ronda=ronda, numero=numero, fecha_limite=fecha_limite)


def _fase(trabajo, nombre):
    for f in Fase.objects.filter(actividad=trabajo.actividad, activa=True):
        if normalizar(f.nombre) == nombre:
            return f
    return None


def _ultimo_evaluador(trabajo, etapa):
    fila = Evaluador.objects.filter(trabajo=trabajo, etapa=etapa).order_by("-ronda", "numero").select_related("usuario").first()
    return fila.usuario if fila else None


def _preferido_vigente(trabajo, usuario):
    """El evaluador anterior sigue siendo válido si sigue siendo evaluador y no es autor del trabajo."""
    if usuario is None or usuario.pk in _ids_autores(trabajo):
        return None
    return usuario if evaluadores_disponibles().filter(pk=usuario.pk).exists() else None


def iniciar_revision(trabajo, etapa):
    """Reasigna al evaluador previo y pasa el trabajo a «<etapa>_evaluacion». Devuelve True si quedó en evaluación.

    Si no hay evaluador previo válido el trabajo se queda en «<etapa>_enviado» para que el coordinador lo asigne.
    """
    if normalizar(trabajo.fase.nombre) != f"{etapa}_enviado":
        return False
    destino = fase_destino(trabajo, "revision" if etapa == "resumen" else "revision_extenso")
    if destino is None:
        return False
    if filas_vigentes(trabajo, etapa).filter(dictamen__isnull=True).exists():  # ya hay un evaluador esperando
        trabajo.fase = destino
        trabajo.save()
        return True
    anterior = _ultimo_evaluador(trabajo, etapa) or (_ultimo_evaluador(trabajo, "resumen") if etapa == "extenso" else None)
    evaluador = _preferido_vigente(trabajo, anterior)  # nunca se elige a otro solo: lo asigna el coordinador
    if evaluador is None:
        return False
    asignar(trabajo, evaluador, etapa, ronda_para_asignar(trabajo, etapa), 1)
    trabajo.fase = destino
    trabajo.save()
    return True


def reenviar_resumen(trabajo):
    """Resumen corregido por el ponente tras un «con cambios»: vuelve al evaluador que ya lo tenía.

    Si el resumen nunca tuvo evaluador (el coordinador todavía no lo asigna) no se hace nada: sigue esperando al coordinador.
    """
    if not Evaluador.objects.filter(trabajo=trabajo, etapa="resumen").exists():
        return False
    if normalizar(trabajo.fase.nombre) == "resumen_rechazado":  # rechazado a mano por el coordinador: al corregirlo vuelve a empezar
        enviado = _fase(trabajo, "resumen_enviado")
        if enviado is None:
            return False
        trabajo.fase = enviado
        trabajo.save()
    return iniciar_revision(trabajo, "resumen")


def _motivos(filas):
    """Texto para el ponente: comentario general y respuestas «No» de cada evaluador que pidió cambios o rechazó."""
    partes = []
    for f in filas:
        lineas = []
        if f.comentario:
            lineas.append(f.comentario)
        for r in TrabajoPregunta.objects.filter(evaluador=f, respuesta=TrabajoPregunta.Respuesta.NO).select_related("pregunta").order_by("pregunta_id"):
            lineas.append(f"• {r.pregunta.texto} — {r.observacion}" if r.observacion else f"• {r.pregunta.texto}")
        if lineas:
            partes.append(f"Evaluador {f.numero}:\n" + "\n".join(lineas))
    return "\n\n".join(partes)


def procesar_dictamen(ev):
    """Aplica el dictamen recién enviado: avanza, devuelve al ponente, rechaza o asigna al siguiente evaluador."""
    t = ev.trabajo
    t.refresh_from_db()
    etapa = ev.etapa
    if normalizar(t.fase.nombre) != f"{etapa}_evaluacion":
        return "sin_cambio"  # el coordinador ya movió el trabajo
    filas = list(filas_vigentes(t, etapa))
    negativos = [f for f in filas if f.dictamen and f.dictamen != POSITIVO]
    if negativos:
        # Cualquier observación (con cambios o «debe modificarse») regresa el trabajo al ponente para que lo corrija:
        # el resumen vuelve a «resumen_enviado» (editable) y el extenso a «extenso_rechazado» (= debe modificarse).
        destino = _fase(t, "resumen_enviado") if etapa == "resumen" else _fase(t, "extenso_rechazado")
        if destino is None:
            return "sin_cambio"
        t.fase, t.observaciones = destino, _motivos(negativos)
        t.save()
        return "devuelto"
    if any(not f.dictamen for f in filas):
        return "esperando"
    if len(filas) < requeridos(t, etapa):  # en secuencia: el coordinador asigna al siguiente evaluador
        return "falta_evaluador"
    destino = _fase(t, f"{etapa}_aprobado")
    if destino is None:
        return "sin_cambio"
    t.fase, t.observaciones = destino, ""
    t.save()
    return "aprobado"
