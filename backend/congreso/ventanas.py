"""Fechas importantes que gobiernan el proceso de un trabajo (borrador local).

Cada fecha tiene inicio y fin. Si un congreso NO tiene configurada una fecha, esa etapa no se restringe (así no se rompen los
congresos ya creados); en cuanto se configura, el sistema solo permite la acción dentro de ese plazo.

Orden del proceso:
  1. Recepción de resúmenes        — el ponente envía, edita o retira su resumen. El coordinador aún NO asigna evaluadores.
  2. Asignación de evaluadores de resúmenes — el coordinador asigna (empieza cuando terminó la recepción).
  3. Evaluación de resúmenes       — el evaluador califica; el ponente corrige lo que le pidan.
  4. Entrega de extenso            — el ponente sube (o reemplaza) su extenso.
  5. Asignación de evaluadores de extensos — el coordinador asigna al segundo evaluador, etc.
  6. Evaluación de extensos        — el evaluador califica; el ponente corrige lo que le pidan.
"""
from django.utils import timezone

from .models import CongresoFechaImportante

RECEPCION = "recepcion"
ASIGNACION_RESUMEN = "asignacion_resumen"
EVALUACION_RESUMEN = "evaluacion_resumen"
ENTREGA_EXTENSO = "entrega_extenso"
ASIGNACION_EXTENSO = "asignacion_extenso"
EVALUACION_EXTENSO = "evaluacion_extenso"
REALIZACION = "realizacion"

# clave -> (nombre en el catálogo, descripción)
CATALOGO = {
    RECEPCION: ("Recepción de resúmenes", "Plazo para que los ponentes envíen, editen o retiren su resumen."),
    ASIGNACION_RESUMEN: ("Asignación de evaluadores de resúmenes", "Plazo para que el coordinador asigne evaluador a cada resumen (empieza al cerrar la recepción)."),
    EVALUACION_RESUMEN: ("Evaluación de resúmenes", "Plazo para que los evaluadores califiquen resúmenes y los ponentes corrijan observaciones."),
    ENTREGA_EXTENSO: ("Entrega de extenso", "Plazo para que los ponentes suban o reemplacen su extenso."),
    ASIGNACION_EXTENSO: ("Asignación de evaluadores de extensos", "Plazo para que el coordinador asigne evaluadores a los extensos."),
    EVALUACION_EXTENSO: ("Evaluación de extensos", "Plazo para que los evaluadores califiquen extensos y los ponentes corrijan observaciones."),
    REALIZACION: ("Realización del congreso", "Fechas en que se lleva a cabo el congreso."),
}
NOMBRES = {k: v[0] for k, v in CATALOGO.items()}
ORDEN = [RECEPCION, ASIGNACION_RESUMEN, EVALUACION_RESUMEN, ENTREGA_EXTENSO, ASIGNACION_EXTENSO, EVALUACION_EXTENSO, REALIZACION]


def _fmt(d):
    return f"{d:%d/%m/%Y}"


def ventana(congreso, clave):
    """Estado de una fecha para el congreso: None si no está configurada; si lo está, rango y si hoy cae dentro."""
    cfi = (CongresoFechaImportante.objects.filter(congreso=congreso, fecha_importante__nombre=NOMBRES[clave])
           .order_by("fecha_inicio").first())
    if cfi is None:
        return None
    hoy = timezone.localdate()
    return {
        "clave": clave, "nombre": NOMBRES[clave], "inicio": cfi.fecha_inicio, "fin": cfi.fecha_fin,
        "abierta": cfi.fecha_inicio <= hoy <= cfi.fecha_fin,
        "futura": hoy < cfi.fecha_inicio, "pasada": hoy > cfi.fecha_fin,
    }


def esta_abierta(congreso, clave):
    """True si la fecha está vigente hoy o si el congreso no la configuró (sin restricción)."""
    v = ventana(congreso, clave)
    return v is None or v["abierta"]


def motivo_cerrada(congreso, clave, accion):
    """Texto para el usuario cuando la acción cae fuera de plazo; None si se puede."""
    v = ventana(congreso, clave)
    if v is None or v["abierta"]:
        return None
    plazo = f"del {_fmt(v['inicio'])} al {_fmt(v['fin'])}"
    if v["futura"]:
        return f"Todavía no se puede {accion}: el periodo «{v['nombre']}» es {plazo}."
    return f"Ya no se puede {accion}: el periodo «{v['nombre']}» fue {plazo}."


def motivo_asignacion_cerrada(congreso, etapa):
    """Asignar evaluadores: debe haber terminado el periodo anterior (recepción / entrega) y estar dentro del plazo de asignación."""
    previo, asign = (RECEPCION, ASIGNACION_RESUMEN) if etapa == "resumen" else (ENTREGA_EXTENSO, ASIGNACION_EXTENSO)
    vp = ventana(congreso, previo)
    if vp is not None and not vp["pasada"]:
        return (f"Todavía no se pueden asignar evaluadores: el periodo «{vp['nombre']}» termina el {_fmt(vp['fin'])}. "
                "Hasta entonces los ponentes pueden editar o retirar su trabajo.")
    return motivo_cerrada(congreso, asign, "asignar evaluadores")


def resumen_ventanas(congreso):
    """Lista serializable de las fechas configuradas, para mostrarlas en pantalla."""
    salida = []
    for clave in ORDEN:
        v = ventana(congreso, clave)
        if v:
            salida.append({k: (str(val) if k in ("inicio", "fin") else val) for k, val in v.items()})
    return salida


def errores_de_orden(items):
    """items: iterable de (nombre del catálogo, inicio, fin) con fechas ya convertidas. Devuelve los errores de orden."""
    inverso = {n: k for k, n in NOMBRES.items()}
    return validar_orden({inverso[n]: (i, f) for n, i, f in items if n in inverso})


def validar_orden(fechas):
    """fechas: {clave: (inicio, fin)}. Devuelve la lista de errores de orden entre periodos (vacía si todo cuadra)."""
    errores = []
    for previo, siguiente in ((RECEPCION, ASIGNACION_RESUMEN), (ENTREGA_EXTENSO, ASIGNACION_EXTENSO)):
        if previo in fechas and siguiente in fechas and fechas[siguiente][0] <= fechas[previo][1]:
            errores.append(f"«{NOMBRES[siguiente]}» debe empezar después de que termine «{NOMBRES[previo]}».")
    return errores
