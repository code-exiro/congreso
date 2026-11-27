"""Transiciones de fase de un trabajo (resumen) según el nombre de la fase.

BORRADOR: las fases salen del catálogo; la ponencia no trae «resumen_aprobado» en la hoja, por eso
`cargar_catalogos_coning` la agrega como fase adicional.
"""
from .models import Fase

ACCIONES = {
    "revision": {
        "manual": False,  # transición interna (la dispara la asignación de evaluador); no es un botón del coordinador
        "etiqueta": "Pasar a revisión",
        "desde": {"resumen_enviado"},
        "hacia": "resumen_evaluacion",
        "pide_observaciones": False,
    },
    "aprobar": {
        "etiqueta": "Aprobar resumen",
        "desde": {"resumen_enviado", "resumen_evaluacion"},
        "hacia": "resumen_aprobado",
        "pide_observaciones": False,
    },
    "rechazar": {
        "etiqueta": "Rechazar resumen",
        "desde": {"resumen_enviado", "resumen_evaluacion"},
        "hacia": "resumen_rechazado",
        "pide_observaciones": True,
    },
    # Extenso (solo actividades que tienen estas fases, p. ej. ponencia).
    "revision_extenso": {
        "manual": False,  # transición interna (la dispara la asignación de evaluador); no es un botón del coordinador
        "etiqueta": "Pasar extenso a revisión",
        "desde": {"extenso_enviado"},
        "hacia": "extenso_evaluacion",
        "pide_observaciones": False,
    },
    "aprobar_extenso": {
        "etiqueta": "Aprobar extenso",
        "desde": {"extenso_enviado", "extenso_evaluacion"},
        "hacia": "extenso_aprobado",
        "pide_observaciones": False,
    },
    "rechazar_extenso": {
        "etiqueta": "Debe modificarse",
        "desde": {"extenso_enviado", "extenso_evaluacion"},
        "hacia": "extenso_rechazado",
        "pide_observaciones": True,
    },
}


def normalizar(nombre):
    return (nombre or "").strip().lower().replace(" ", "_")


def fase_aceptada(fase):
    """True si el trabajo ya pasó la revisión del resumen (o del cartel) y no está rechazado."""
    n = normalizar(fase.nombre)
    if n.endswith(("rechazado", "rechazada")):
        return False
    if n.startswith(("resumen_", "cartel_")) and n.endswith(("_enviado", "_evaluacion")):
        return False
    return True


def progreso(trabajo):
    """Avance del trabajo: posición de su fase entre las fases (no rechazadas) de su actividad."""
    fases = [f for f in Fase.objects.filter(actividad=trabajo.actividad, activa=True).order_by("secuencia", "pk")
             if not normalizar(f.nombre).endswith(("rechazado", "rechazada"))]
    ids = [f.pk for f in fases]
    if trabajo.fase_id not in ids:
        return {"actual": 0, "total": len(ids), "porcentaje": 0}
    actual = ids.index(trabajo.fase_id) + 1
    return {"actual": actual, "total": len(ids), "porcentaje": round(100 * actual / len(ids))}


def fase_destino(trabajo, accion):
    """Fase a la que pasa el trabajo con esa acción (misma actividad), o None si no aplica."""
    cfg = ACCIONES[accion]
    if normalizar(trabajo.fase.nombre) not in cfg["desde"]:
        return None
    for f in Fase.objects.filter(actividad=trabajo.actividad, activa=True):
        if normalizar(f.nombre) == cfg["hacia"]:
            return f
    return None


def acciones_disponibles(trabajo):
    return [
        {"accion": a, "etiqueta": cfg["etiqueta"], "pide_observaciones": cfg["pide_observaciones"]}
        for a, cfg in ACCIONES.items()
        if cfg.get("manual", True) and fase_destino(trabajo, a) is not None
    ]
