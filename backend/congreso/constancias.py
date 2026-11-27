"""Constancias del ponente (borrador local).

Regla ya definida con el equipo: la persona recibe una constancia por cada trabajo en el que participó (autor o coautor) y
que **culminó todos sus procesos**, pero solo se liberan cuando su **pago del congreso está validado** y el **administrador
autoriza** la liberación (minuta del 1-oct-2026).

El catálogo completo de constancias todavía no existe: `CONSTANCIA_POR_ACTIVIDAD` es PROVISIONAL (una constancia por trabajo
según su tipo). Cuando llegue el catálogo, se cambia ese diccionario / `constancias_de_trabajo` sin tocar la regla del pago.
La generación del PDF queda pendiente (falta la plantilla de constancia del congreso).
"""
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from trabajos.flujo import normalizar
from trabajos.models import AutorizacionConstancia, Fase, UsuarioTrabajo
from trabajos.permissions import TieneAlgunPrivilegio
from trabajos.serializers import nombre_completo

from .models import Congreso
from .pagos import pago_de, tiene_pago_validado

CONSTANCIA_POR_ACTIVIDAD = {  # PROVISIONAL
    "ponencia": "Constancia de ponente",
    "taller": "Constancia de tallerista",
    "conferencia_magistral": "Constancia de conferencista magistral",
    "cartel": "Constancia de cartel",
}


def trabajo_culminado(trabajo):
    """True si el trabajo terminó todos sus procesos: última fase de su actividad (aprobada)."""
    n = normalizar(trabajo.fase.nombre)
    tiene_extenso = Fase.objects.filter(actividad=trabajo.actividad, nombre__istartswith="extenso").exists()
    if tiene_extenso:  # ponencia: extenso, video y presentación
        return n in ("presentacion_aprobada", "presentancion_aprobada")  # la hoja escribe «presentancion» en una fila
    return n.endswith(("_aprobado", "_aprobada"))


def constancias_de_trabajo(trabajo):
    nombre = normalizar(trabajo.actividad.nombre)
    return [CONSTANCIA_POR_ACTIVIDAD.get(nombre, f"Constancia de {trabajo.actividad.nombre.replace('_', ' ')}")]


class MisConstanciasView(APIView):
    """GET /api/constancias/mis-constancias/ — constancias por congreso y si ya se pueden liberar."""

    permission_classes = [TieneAlgunPrivilegio]
    privilegios_por_metodo = {"GET": ("ver_sus_constancias",)}

    def get(self, request):
        salida = []
        for c in Congreso.objects.order_by("-edicion_congreso"):
            filas = (UsuarioTrabajo.objects.filter(usuario=request.user, trabajo__congreso=c)
                     .select_related("trabajo__actividad", "trabajo__fase").order_by("trabajo__fecha_registro"))
            if not filas:
                continue
            pago = pago_de(request.user, c)
            estado_pago = pago.estado if pago else "sin_enviar"
            pagado = estado_pago == "validado"
            items = []
            for f in filas:
                t = f.trabajo
                culminado = trabajo_culminado(t)
                autorizada = AutorizacionConstancia.objects.filter(usuario=request.user, trabajo=t).exists()
                for titulo in constancias_de_trabajo(t):
                    if not culminado:
                        estado, motivo = "en_proceso", f"El trabajo sigue en proceso (fase actual: {t.fase.nombre.replace('_', ' ')})."
                    elif not pagado:
                        estado, motivo = "bloqueada", "Se libera cuando tu pago sea validado."
                    elif not autorizada:
                        estado, motivo = "pendiente", "Tu pago ya está validado; falta la autorización del administrador."
                    else:
                        estado, motivo = "liberada", ""
                    items.append({
                        "titulo": titulo, "estado": estado, "motivo": motivo,
                        "rol": "Autor" if f.es_autor else "Coautor",
                        "trabajo": {"clave": t.clave, "titulo": t.titulo, "actividad": t.actividad.nombre},
                        "pdf_disponible": False,  # pendiente: plantilla de constancia
                    })
            salida.append({
                "congreso": {"id": c.pk, "nombre": c.nombre_congreso, "edicion": c.edicion_congreso},
                "pago": {"estado": estado_pago, "comentario": pago.comentario if pago else ""},
                "constancias": items,
            })
        return Response(salida)


# ---------------------------------------------------------------- Administrador: autorización de constancias
PRIVILEGIO_AUTORIZAR = ("autorizar_constancias",)


def _filas_autorizacion(congreso_id=None, estado="", q=""):
    filas = (UsuarioTrabajo.objects.select_related("usuario", "trabajo__actividad", "trabajo__fase", "trabajo__congreso")
             .order_by("trabajo__congreso__edicion_congreso", "usuario__last_name", "trabajo__clave"))
    if congreso_id:
        filas = filas.filter(trabajo__congreso_id=congreso_id)
    if q:
        from django.db.models import Q
        filas = filas.filter(Q(usuario__email__icontains=q) | Q(usuario__first_name__icontains=q)
                             | Q(usuario__last_name__icontains=q) | Q(trabajo__clave__icontains=q) | Q(trabajo__titulo__icontains=q))
    autorizadas = {(a.usuario_id, a.trabajo_id): a for a in AutorizacionConstancia.objects.select_related("autorizada_por")}
    pagos = {}
    salida = []
    for f in filas:
        t = f.trabajo
        if not trabajo_culminado(t):
            continue
        llave = (f.usuario_id, t.congreso_id)
        if llave not in pagos:
            pagos[llave] = tiene_pago_validado(f.usuario, t.congreso)
        aut = autorizadas.get((f.usuario_id, t.pk))
        est = "autorizada" if aut else ("pendiente" if pagos[llave] else "sin_pago")
        if estado and est != estado:
            continue
        salida.append({
            "id": f.pk,
            "estado": est,
            "persona": nombre_completo(f.usuario) or f.usuario.email,
            "correo": f.usuario.email,
            "rol": "Autor" if f.es_autor else "Coautor",
            "constancia": constancias_de_trabajo(t)[0],
            "trabajo": {"clave": t.clave, "titulo": t.titulo, "actividad": t.actividad.nombre},
            "congreso": {"id": t.congreso_id, "nombre": t.congreso.nombre_congreso, "edicion": t.congreso.edicion_congreso},
            "autorizada_por": (nombre_completo(aut.autorizada_por) if aut and aut.autorizada_por else ""),
            "fecha_autorizacion": aut.fecha_autorizacion if aut else None,
        })
    return salida


class AutorizacionConstanciasView(APIView):
    """GET /api/constancias/autorizacion/?congreso=&estado=pendiente|autorizada|sin_pago&q= · POST {ids: [...]} autoriza."""

    permission_classes = [TieneAlgunPrivilegio]
    privilegios_por_metodo = {"GET": PRIVILEGIO_AUTORIZAR, "POST": PRIVILEGIO_AUTORIZAR}

    def get(self, request):
        p = request.query_params
        filas = _filas_autorizacion(p.get("congreso") or None, p.get("estado", ""), p.get("q", "").strip())
        conteo = {k: sum(1 for r in filas if r["estado"] == k) for k in ("pendiente", "autorizada", "sin_pago")}
        return Response({
            "constancias": filas,
            "conteo": conteo,
            "congresos": [{"id": c.pk, "nombre": f"{c.nombre_congreso} ({c.edicion_congreso})"} for c in Congreso.objects.order_by("-edicion_congreso")],
        })

    def post(self, request):
        ids = request.data.get("ids")
        if not isinstance(ids, list) or not ids:
            return Response({"detail": "Selecciona al menos una constancia."}, status=status.HTTP_400_BAD_REQUEST)
        autorizadas, omitidas = 0, []
        for f in UsuarioTrabajo.objects.select_related("usuario", "trabajo__fase", "trabajo__actividad", "trabajo__congreso").filter(pk__in=ids):
            t = f.trabajo
            if not trabajo_culminado(t):
                omitidas.append(f"{f.usuario.email} ({t.clave}): el trabajo aún no termina sus procesos")
            elif not tiene_pago_validado(f.usuario, t.congreso):
                omitidas.append(f"{f.usuario.email} ({t.clave}): no tiene el pago validado")
            else:
                _, creada = AutorizacionConstancia.objects.get_or_create(
                    usuario=f.usuario, trabajo=t, defaults={"autorizada_por": request.user, "fecha_autorizacion": timezone.now()})
                autorizadas += 1 if creada else 0
        if autorizadas == 0 and omitidas:
            return Response({"detail": "No se autorizó ninguna: " + "; ".join(omitidas) + "."}, status=status.HTTP_409_CONFLICT)
        return Response({"autorizadas": autorizadas, "omitidas": omitidas})


class RevocarAutorizacionView(APIView):
    """DELETE /api/constancias/autorizacion/<id usuario-trabajo>/ — retira la autorización."""

    permission_classes = [TieneAlgunPrivilegio]
    privilegios_por_metodo = {"DELETE": PRIVILEGIO_AUTORIZAR}

    def delete(self, request, pk):
        f = UsuarioTrabajo.objects.filter(pk=pk).first()
        if not f:
            return Response({"detail": "No encontramos esa participación."}, status=status.HTTP_404_NOT_FOUND)
        AutorizacionConstancia.objects.filter(usuario_id=f.usuario_id, trabajo_id=f.trabajo_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
