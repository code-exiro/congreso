"""Pagos de los ponentes (borrador local), según el proceso «ADMIN PAGOS» del Drive.

Ponente: con una solicitud aceptada ve su ficha (cuotas), paga fuera del sistema, sube el comprobante y teclea el número de
referencia -> estatus «en revisión». Encargado de pagos: revisa la imagen y la referencia y deja «validado» o «rechazado».
Un solo pago por persona y congreso; con el pago validado se liberan sus constancias.
"""
import os

from django.db import transaction
from django.http import FileResponse, Http404
from django.utils import timezone
from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from trabajos.flujo import fase_aceptada
from trabajos.models import UsuarioTrabajo
from trabajos.permissions import TieneAlgunPrivilegio
from trabajos.serializers import nombre_completo

from .models import Congreso, Cuota, Pago

PRIV_PONENTE = ("solicitud_pago",)
PRIV_ADMIN = ("admin_pagos",)
EXT_COMPROBANTE = {".jpg", ".jpeg", ".png", ".pdf"}
TAMANO_MAX = 5 * 1024 * 1024
COMENTARIO_VALIDADO = "Pago confirmado: el comprobante y la referencia fueron validados."
SIN_ENVIAR = "sin_enviar"


def trabajos_aceptados(usuario, congreso):
    """Trabajos del congreso con resumen aceptado en los que participa la persona (como autor o coautor)."""
    filas = (UsuarioTrabajo.objects.filter(usuario=usuario, trabajo__congreso=congreso)
             .select_related("trabajo__actividad", "trabajo__fase"))
    return [f.trabajo for f in filas if fase_aceptada(f.trabajo.fase)]


def pago_de(usuario, congreso):
    return Pago.objects.filter(usuario=usuario, cuota__congreso=congreso).select_related("cuota__concepto").order_by("-fecha_envio").first()


def tiene_pago_validado(usuario, congreso):
    return Pago.objects.filter(usuario=usuario, cuota__congreso=congreso, estado=Pago.Estado.VALIDADO).exists()


def serializar_pago(p):
    if p is None:
        return {"id": None, "estado": SIN_ENVIAR, "estado_texto": "Sin enviar", "referencia": "", "comentario": "",
                "cuota": None, "fecha_envio": None, "tiene_comprobante": False}
    return {
        "id": p.pk, "estado": p.estado, "estado_texto": p.get_estado_display(), "referencia": p.referencia,
        "comentario": p.comentario, "fecha_envio": p.fecha_envio,
        "cuota": {"id": p.cuota_id, "concepto": p.cuota.concepto.nombre, "monto": str(p.cuota.monto)},
        "tiene_comprobante": bool(p.comprobante_pago),
        "tiene_comprobante_academico": bool(p.comprobante_academico),
    }


def _enviar_archivo(campo):
    if not campo or not campo.storage.exists(campo.name):
        raise Http404("No hay comprobante.")
    return FileResponse(campo.open("rb"), filename=os.path.basename(campo.name))


def _validar_archivo(archivo, nombre):
    if os.path.splitext(archivo.name)[1].lower() not in EXT_COMPROBANTE:
        return f"{nombre}: usa una imagen JPG o PNG, o un PDF."
    if archivo.size > TAMANO_MAX:
        return f"{nombre}: no puede pesar más de 5 MB."
    return None


class MisPagosView(APIView):
    """GET /api/pagos/mis-pagos/ — un renglón por congreso en el que participa con un resumen aceptado."""

    permission_classes = [TieneAlgunPrivilegio]
    privilegios_por_metodo = {"GET": PRIV_PONENTE, "POST": PRIV_PONENTE}
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        salida = []
        for c in Congreso.objects.order_by("-edicion_congreso"):
            trabajos = trabajos_aceptados(request.user, c)
            pago = pago_de(request.user, c)
            if not trabajos and pago is None:
                continue
            salida.append({
                "congreso": {"id": c.pk, "nombre": c.nombre_congreso, "edicion": c.edicion_congreso},
                "elegible": bool(trabajos),
                "trabajos": [{"clave": t.clave, "titulo": t.titulo, "actividad": t.actividad.nombre, "fase": t.fase.nombre} for t in trabajos],
                "cuotas": [{"id": q.pk, "concepto": q.concepto.nombre, "monto": str(q.monto)}
                           for q in Cuota.objects.filter(congreso=c).select_related("concepto").order_by("monto")],
                "pago": serializar_pago(pago),
            })
        return Response(salida)

    def post(self, request):
        """Sube el comprobante y la referencia. multipart: congreso, cuota, referencia, comprobante[, comprobante_academico]."""
        d = request.data
        congreso = Congreso.objects.filter(pk=d.get("congreso") or None).first() if str(d.get("congreso", "")).isdigit() else None
        if not congreso:
            return Response({"detail": "Elige el congreso."}, status=status.HTTP_400_BAD_REQUEST)
        if not trabajos_aceptados(request.user, congreso):
            return Response({"detail": "Todavía no tienes una solicitud aceptada en este congreso."}, status=status.HTTP_409_CONFLICT)
        cuota = Cuota.objects.filter(pk=d.get("cuota") or None, congreso=congreso).select_related("concepto").first() if str(d.get("cuota", "")).isdigit() else None
        if not cuota:
            return Response({"detail": "Elige el concepto de cuota que pagaste."}, status=status.HTTP_400_BAD_REQUEST)
        referencia = (d.get("referencia") or "").strip()
        if not 4 <= len(referencia) <= 100:
            return Response({"detail": "Escribe el número de referencia tal como aparece en tu comprobante."}, status=status.HTTP_400_BAD_REQUEST)
        comprobante = request.FILES.get("comprobante")
        if comprobante is None:
            return Response({"detail": "Sube la imagen o el PDF de tu comprobante de pago."}, status=status.HTTP_400_BAD_REQUEST)
        academico = request.FILES.get("comprobante_academico")
        # BORRADOR: la cuota de alumnos de la UNAM pide la credencial vigente (se detecta por el nombre del concepto).
        if "credencial" in cuota.concepto.nombre.lower() and academico is None:
            return Response({"detail": "Esa cuota requiere subir tu credencial vigente."}, status=status.HTTP_400_BAD_REQUEST)
        for arch, nombre in ((comprobante, "Comprobante de pago"), (academico, "Credencial")):
            if arch is not None and (msg := _validar_archivo(arch, nombre)):
                return Response({"detail": msg}, status=status.HTTP_400_BAD_REQUEST)

        previo = pago_de(request.user, congreso)
        if previo and previo.estado != Pago.Estado.RECHAZADO:
            return Response({"detail": "Tu pago ya fue enviado y está " + previo.get_estado_display().lower() + "."}, status=status.HTTP_409_CONFLICT)
        with transaction.atomic():
            if previo:  # reenvío tras un rechazo: se reemplaza el pago anterior
                for campo in (previo.comprobante_pago, previo.comprobante_academico):
                    if campo:
                        campo.delete(save=False)
                previo.delete()
            pago = Pago.objects.create(
                cuota=cuota, usuario=request.user, referencia=referencia, comprobante_pago=comprobante,
                comprobante_academico=academico, estado=Pago.Estado.REVISION, validado=False, fecha_envio=timezone.now(),
            )
        return Response(serializar_pago(pago), status=status.HTTP_201_CREATED)


class MiComprobanteView(APIView):
    permission_classes = [TieneAlgunPrivilegio]
    privilegios_por_metodo = {"GET": PRIV_PONENTE}

    def get(self, request, pk):
        p = Pago.objects.filter(pk=pk, usuario=request.user).first()
        if not p:
            raise Http404
        return _enviar_archivo(p.comprobante_pago)


# ---------------------------------------------------------------- encargado de pagos

def _fila_admin(usuario, congreso, trabajos, pago):
    return {
        "usuario": {"id": usuario.pk, "nombre": nombre_completo(usuario) or usuario.email, "correo": usuario.email},
        "trabajos": [{"clave": t.clave, "titulo": t.titulo, "actividad": t.actividad.nombre} for t in trabajos],
        "pago": serializar_pago(pago),
    }


class ValidacionPagosView(APIView):
    """GET /api/pagos/validacion/?congreso=&estado=&q= — ponentes del congreso con el estatus de su pago."""

    permission_classes = [TieneAlgunPrivilegio]
    privilegios_por_metodo = {"GET": PRIV_ADMIN}

    def get(self, request):
        congresos = list(Congreso.objects.order_by("-edicion_congreso"))
        if not congresos:
            return Response({"congresos": [], "congreso": None, "resultados": []})
        p = request.query_params
        congreso = next((c for c in congresos if str(c.pk) == p.get("congreso")), congresos[0])
        por_usuario = {}
        filas = UsuarioTrabajo.objects.filter(trabajo__congreso=congreso).select_related("usuario", "trabajo__actividad", "trabajo__fase")
        for f in filas:
            if fase_aceptada(f.trabajo.fase):
                por_usuario.setdefault(f.usuario, []).append(f.trabajo)
        pagos = {pg.usuario_id: pg for pg in Pago.objects.filter(cuota__congreso=congreso).select_related("cuota__concepto")}
        for pg in pagos.values():  # un pago existente se muestra aunque su resumen cambiara de fase
            por_usuario.setdefault(pg.usuario, [])
        resultados = [_fila_admin(u, congreso, ts, pagos.get(u.pk)) for u, ts in por_usuario.items()]
        estado = p.get("estado")
        if estado:
            resultados = [r for r in resultados if r["pago"]["estado"] == estado]
        q = (p.get("q") or "").strip().lower()
        if q:
            resultados = [r for r in resultados if q in r["usuario"]["nombre"].lower() or q in r["usuario"]["correo"].lower()
                          or q in r["pago"]["referencia"].lower()]
        orden = {"revision": 0, "rechazado": 1, SIN_ENVIAR: 2, "validado": 3}
        resultados.sort(key=lambda r: (orden[r["pago"]["estado"]], r["usuario"]["nombre"].lower()))
        return Response({
            "congresos": [{"id": c.pk, "nombre": f"{c.nombre_congreso} ({c.edicion_congreso})"} for c in congresos],
            "congreso": congreso.pk,
            "resultados": resultados,
        })


class DictaminarPagoView(APIView):
    """PATCH /api/pagos/validacion/<id>/ {estado: validado|rechazado, comentario} — el rechazo exige el motivo."""

    permission_classes = [TieneAlgunPrivilegio]
    privilegios_por_metodo = {"PATCH": PRIV_ADMIN, "GET": PRIV_ADMIN}

    def get(self, request, pk):
        """Comprobante de pago (imagen o PDF) para que el encargado lo revise."""
        pg = Pago.objects.filter(pk=pk).first()
        if not pg:
            raise Http404
        return _enviar_archivo(pg.comprobante_pago)

    def patch(self, request, pk):
        pg = Pago.objects.select_related("cuota__concepto", "usuario").filter(pk=pk).first()
        if not pg:
            return Response({"detail": "No encontramos ese pago."}, status=status.HTTP_404_NOT_FOUND)
        estado = request.data.get("estado")
        if estado not in (Pago.Estado.VALIDADO, Pago.Estado.RECHAZADO):
            return Response({"detail": "El estatus debe ser «validado» o «rechazado»."}, status=status.HTTP_400_BAD_REQUEST)
        comentario = (request.data.get("comentario") or "").strip()
        if estado == Pago.Estado.RECHAZADO and len(comentario) < 5:
            return Response({"detail": "Escribe el motivo del rechazo."}, status=status.HTTP_400_BAD_REQUEST)
        pg.estado = estado
        pg.validado = estado == Pago.Estado.VALIDADO
        pg.comentario = comentario or (COMENTARIO_VALIDADO if pg.validado else "")
        pg.revisado_por = request.user
        pg.save()
        return Response(serializar_pago(pg))


class ComprobanteAcademicoView(APIView):
    permission_classes = [TieneAlgunPrivilegio]
    privilegios_por_metodo = {"GET": PRIV_ADMIN}

    def get(self, request, pk):
        pg = Pago.objects.filter(pk=pk).first()
        if not pg:
            raise Http404
        return _enviar_archivo(pg.comprobante_academico)
