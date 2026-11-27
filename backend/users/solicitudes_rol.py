"""BORRADOR local: solicitud de rol (ponente) y bandeja del coordinador."""
from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from trabajos.permissions import TieneAlgunPrivilegio
from trabajos.serializers import nombre_completo

from .models import Role, SolicitudRol, UserRole

PRIV_SOLICITAR = ("solicitar_rol",)
PRIV_GESTIONAR = ("gestionar_solicitudes_rol",)
# Por ahora el único rol que se puede pedir por cuenta propia es el de evaluador; los demás se asignan desde "Roles y Usuarios".
ROLES_SOLICITABLES = {"evaluador"}


def _roles_solicitables(usuario):
    propios = set(UserRole.objects.filter(user=usuario).values_list("role_id", flat=True))
    pendientes = set(SolicitudRol.objects.filter(usuario=usuario, estado="pendiente").values_list("rol_id", flat=True))
    salida = []
    for r in Role.objects.filter(is_active=True).order_by("name"):
        if r.name.strip().lower() not in ROLES_SOLICITABLES:
            continue
        salida.append({
            "id": r.pk, "nombre": r.name, "descripcion": r.description,
            "ya_lo_tienes": r.pk in propios, "pendiente": r.pk in pendientes,
        })
    return salida


def _fila(s):
    return {
        "id": s.pk, "estado": s.estado,
        "rol": {"id": s.rol_id, "nombre": s.rol.name},
        "usuario": {"id": s.usuario_id, "nombre": nombre_completo(s.usuario) or s.usuario.email, "correo": s.usuario.email},
        "motivo": s.motivo, "comentario_resolucion": s.comentario_resolucion,
        "resuelta_por": (nombre_completo(s.resuelta_por) or s.resuelta_por.email) if s.resuelta_por else "",
        "fecha_solicitud": s.created_at, "fecha_resolucion": s.resuelta_at,
    }


class MisSolicitudesRolView(APIView):
    """GET → roles que se pueden pedir + historial propio · POST {rol, motivo} → crea la solicitud."""

    permission_classes = [TieneAlgunPrivilegio]
    privilegios_por_metodo = {"GET": PRIV_SOLICITAR, "POST": PRIV_SOLICITAR}

    def get(self, request):
        propias = SolicitudRol.objects.filter(usuario=request.user).select_related("rol", "usuario", "resuelta_por")
        return Response({"roles": _roles_solicitables(request.user), "solicitudes": [_fila(s) for s in propias]})

    def post(self, request):
        opcion = next((r for r in _roles_solicitables(request.user) if r["id"] == request.data.get("rol")), None)
        if not opcion:
            return Response({"detail": "Ese rol no se puede solicitar."}, status=status.HTTP_400_BAD_REQUEST)
        if opcion["ya_lo_tienes"]:
            return Response({"detail": "Ya tienes ese rol."}, status=status.HTTP_409_CONFLICT)
        if opcion["pendiente"]:
            return Response({"detail": "Ya tienes una solicitud pendiente para ese rol."}, status=status.HTTP_409_CONFLICT)
        motivo = str(request.data.get("motivo") or "").strip()
        if len(motivo) > 500:
            return Response({"detail": "El motivo no puede pasar de 500 caracteres."}, status=status.HTTP_400_BAD_REQUEST)
        s = SolicitudRol.objects.create(usuario=request.user, rol_id=opcion["id"], motivo=motivo)
        return Response(_fila(s), status=status.HTTP_201_CREATED)


class CancelarSolicitudRolView(APIView):
    """DELETE → el solicitante retira una solicitud que sigue pendiente."""

    permission_classes = [TieneAlgunPrivilegio]
    privilegios_por_metodo = {"DELETE": PRIV_SOLICITAR}

    def delete(self, request, pk):
        s = SolicitudRol.objects.filter(pk=pk, usuario=request.user).first()
        if not s:
            return Response({"detail": "No encontramos esa solicitud."}, status=status.HTTP_404_NOT_FOUND)
        if s.estado != "pendiente":
            return Response({"detail": "Solo puedes retirar solicitudes pendientes."}, status=status.HTTP_409_CONFLICT)
        s.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class BandejaSolicitudesRolView(APIView):
    """GET ?estado=pendiente|aprobada|rechazada&q= → bandeja del coordinador."""

    permission_classes = [TieneAlgunPrivilegio]
    privilegios_por_metodo = {"GET": PRIV_GESTIONAR}

    def get(self, request):
        from django.db.models import Q
        qs = SolicitudRol.objects.select_related("rol", "usuario", "resuelta_por")
        estado = request.query_params.get("estado", "")
        if estado:
            qs = qs.filter(estado=estado)
        q = request.query_params.get("q", "").strip()
        if q:
            qs = qs.filter(Q(usuario__email__icontains=q) | Q(usuario__first_name__icontains=q)
                           | Q(usuario__last_name__icontains=q) | Q(rol__name__icontains=q))
        conteo = {k: SolicitudRol.objects.filter(estado=k).count() for k in ("pendiente", "aprobada", "rechazada")}
        return Response({"solicitudes": [_fila(s) for s in qs], "conteo": conteo})


class ResolverSolicitudRolView(APIView):
    """POST {accion: "aprobar"|"rechazar", comentario} → aprobar asigna el rol al instante."""

    permission_classes = [TieneAlgunPrivilegio]
    privilegios_por_metodo = {"POST": PRIV_GESTIONAR}

    def post(self, request, pk):
        accion = request.data.get("accion")
        comentario = str(request.data.get("comentario") or "").strip()
        if accion not in ("aprobar", "rechazar"):
            return Response({"detail": "La acción debe ser aprobar o rechazar."}, status=status.HTTP_400_BAD_REQUEST)
        if len(comentario) > 500:
            return Response({"detail": "El comentario no puede pasar de 500 caracteres."}, status=status.HTTP_400_BAD_REQUEST)
        with transaction.atomic():
            s = SolicitudRol.objects.select_for_update().select_related("rol", "usuario").filter(pk=pk).first()
            if not s:
                return Response({"detail": "No encontramos esa solicitud."}, status=status.HTTP_404_NOT_FOUND)
            if s.estado != "pendiente":
                return Response({"detail": "Esa solicitud ya fue resuelta."}, status=status.HTTP_409_CONFLICT)
            if accion == "aprobar":
                if not s.rol.is_active:
                    return Response({"detail": "Ese rol ya no está activo."}, status=status.HTTP_409_CONFLICT)
                UserRole.objects.get_or_create(user=s.usuario, role=s.rol)
                s.estado = "aprobada"
            else:
                s.estado = "rechazada"
            s.comentario_resolucion = comentario
            s.resuelta_por = request.user
            s.resuelta_at = timezone.now()
            s.save()
        return Response(_fila(SolicitudRol.objects.select_related("rol", "usuario", "resuelta_por").get(pk=s.pk)))
