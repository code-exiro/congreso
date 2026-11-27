"""Reglas de plazo (fechas importantes del congreso) aplicadas a las acciones de cada rol sobre un trabajo (borrador local)."""
from congreso import ventanas as v

from .flujo import normalizar
from .models import Evaluador


def _fase(t):
    return normalizar(t.fase.nombre)


def resumen_devuelto(t):
    """El resumen ya pasó por un evaluador (pidió cambios) o fue rechazado: el ponente está corrigiendo, no recién enviando."""
    return _fase(t) == "resumen_rechazado" or Evaluador.objects.filter(trabajo=t, etapa="resumen").exists()


def edicion_resumen(t):
    """(permitido, motivo): ¿el ponente puede editar o retirar el resumen ahora, según los plazos?

    Recién enviado: solo durante la recepción. Devuelto con observaciones: durante la recepción o el periodo de evaluación.
    """
    c = t.congreso
    if v.esta_abierta(c, v.RECEPCION):
        return True, None
    if resumen_devuelto(t):
        motivo = v.motivo_cerrada(c, v.EVALUACION_RESUMEN, "corregir el resumen")
        return motivo is None, motivo
    return False, v.motivo_cerrada(c, v.RECEPCION, "editar ni retirar el resumen")


def subida_extenso(t):
    """(permitido, motivo): ¿puede el ponente subir o reemplazar el extenso ahora?"""
    c = t.congreso
    if v.esta_abierta(c, v.ENTREGA_EXTENSO):
        return True, None
    if _fase(t) in ("extenso_rechazado", "extenso_evaluacion"):
        motivo = v.motivo_cerrada(c, v.EVALUACION_EXTENSO, "corregir el extenso")
        return motivo is None, motivo
    return False, v.motivo_cerrada(c, v.ENTREGA_EXTENSO, "subir el extenso")


def asignacion(t, etapa):
    """Motivo por el que el coordinador no puede asignar evaluadores todavía/ya (None si puede)."""
    return v.motivo_asignacion_cerrada(t.congreso, etapa)


def evaluacion(t, etapa):
    """Motivo por el que el evaluador no puede enviar su dictamen (None si puede)."""
    clave = v.EVALUACION_RESUMEN if etapa == "resumen" else v.EVALUACION_EXTENSO
    return v.motivo_cerrada(t.congreso, clave, "enviar la evaluación")
