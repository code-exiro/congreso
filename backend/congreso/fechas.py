"""Ver y editar las fechas importantes de un congreso (plazos del proceso del trabajo). Borrador local."""
from datetime import date

from django.db import transaction
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from trabajos.permissions import TieneAlgunPrivilegio

from . import ventanas as vt
from .models import Congreso, CongresoFechaImportante, FechaImportante

PRIVILEGIOS = ("modificar_fechas",)


def _estado(congreso):
    por_nombre = {c.fecha_importante.nombre: c for c in CongresoFechaImportante.objects.filter(congreso=congreso).select_related("fecha_importante")}
    hoy = date.today()
    filas = []
    for clave in vt.ORDEN:
        nombre, descripcion = vt.CATALOGO[clave]
        fi = FechaImportante.objects.filter(nombre=nombre).first()
        if fi is None:
            continue
        cfi = por_nombre.get(nombre)
        estado = "sin_configurar"
        if cfi:
            estado = "proxima" if hoy < cfi.fecha_inicio else "vigente" if hoy <= cfi.fecha_fin else "terminada"
        filas.append({"id_fecha": fi.pk, "clave": clave, "nombre": nombre, "descripcion": descripcion,
                      "inicio": cfi.fecha_inicio.isoformat() if cfi else "", "fin": cfi.fecha_fin.isoformat() if cfi else "", "estado": estado})
    return filas


def _congresos():
    return [{"id": c.pk, "nombre": f"{c.nombre_congreso} ({c.edicion_congreso})", "fechas": _estado(c)}
            for c in Congreso.objects.order_by("-edicion_congreso")]


class FechasView(APIView):
    """GET /api/congreso/fechas/ — todas las fechas del proceso por congreso (vacías si no están configuradas)."""

    permission_classes = [TieneAlgunPrivilegio]
    privilegios_por_metodo = {"GET": PRIVILEGIOS, "PUT": PRIVILEGIOS}

    def get(self, request):
        return Response({"congresos": _congresos()})

    def put(self, request, pk):
        """PUT /api/congreso/fechas/<congreso>/ {fechas:[{id_fecha, fecha_inicio, fecha_fin}]} — deja vacías para quitar una fecha."""
        congreso = Congreso.objects.filter(pk=pk).first()
        if not congreso:
            return Response({"detail": "No encontramos ese congreso."}, status=status.HTTP_404_NOT_FOUND)
        catalogo = {fi.pk: fi for fi in FechaImportante.objects.all()}
        nuevas, items = [], []
        for f in request.data.get("fechas") or []:
            fi = catalogo.get(f.get("id_fecha"))
            if fi is None:
                return Response({"detail": "Una de las fechas no existe en el catálogo."}, status=status.HTTP_400_BAD_REQUEST)
            ini, fin = (f.get("fecha_inicio") or "").strip(), (f.get("fecha_fin") or "").strip()
            if not ini and not fin:
                nuevas.append((fi, None, None))
                continue
            if not ini or not fin:
                return Response({"detail": f"«{fi.nombre}»: captura la fecha de inicio y la de fin."}, status=status.HTTP_400_BAD_REQUEST)
            try:
                d_ini, d_fin = date.fromisoformat(ini), date.fromisoformat(fin)
            except ValueError:
                return Response({"detail": f"«{fi.nombre}»: fecha no válida."}, status=status.HTTP_400_BAD_REQUEST)
            if d_fin < d_ini:
                return Response({"detail": f"«{fi.nombre}»: la fecha de fin no puede ser anterior a la de inicio."}, status=status.HTTP_400_BAD_REQUEST)
            nuevas.append((fi, d_ini, d_fin))
            items.append((fi.nombre, d_ini, d_fin))
        errores = vt.errores_de_orden(items)
        if errores:
            return Response({"detail": " ".join(errores)}, status=status.HTTP_400_BAD_REQUEST)
        with transaction.atomic():
            for fi, d_ini, d_fin in nuevas:
                if d_ini is None:
                    CongresoFechaImportante.objects.filter(congreso=congreso, fecha_importante=fi).delete()
                else:
                    CongresoFechaImportante.objects.update_or_create(
                        congreso=congreso, fecha_importante=fi, defaults={"fecha_inicio": d_ini, "fecha_fin": d_fin})
        return Response({"congresos": _congresos()})
