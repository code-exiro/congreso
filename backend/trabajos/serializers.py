from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import serializers

from catalogs.models import Area
from congreso.models import Actividad, Congreso, CongresoActividad, CongresoFechaImportante, LimiteTrabajo, LimiteUsuario

from .extenso import info_extenso, puede_subir_extenso
from congreso import ventanas

from . import plazos
from .flujo import normalizar
from .models import Fase, Trabajo, UsuarioTrabajo

User = get_user_model()

NOMBRE_FECHA_RECEPCION = "Recepción de resúmenes"


def nombre_completo(usuario):
    partes = [usuario.first_name, usuario.last_name, usuario.maternal_last_name]
    texto = " ".join(p for p in partes if p).strip()
    return texto or usuario.email


def ventana_recepcion(congreso):
    """Fechas de recepción de resúmenes del congreso (o None si no están configuradas)."""
    cfi = (
        CongresoFechaImportante.objects.filter(congreso=congreso, fecha_importante__nombre=NOMBRE_FECHA_RECEPCION)
        .order_by("fecha_inicio")
        .first()
    )
    if not cfi:
        return None
    hoy = timezone.localdate()
    return {
        "inicio": cfi.fecha_inicio,
        "fin": cfi.fecha_fin,
        "abierta": cfi.fecha_inicio <= hoy <= cfi.fecha_fin,
    }


def resolver_coautor(correo):
    """(usuario, error): el coautor debe ser un usuario registrado y con el rol de ponente (privilegio de subir trabajos)."""
    from users.services import get_user_privilege_codes

    u = User.objects.filter(email__iexact=correo.strip()).first()
    if u is None:
        return None, f"No se encontró ningún usuario registrado con el correo {correo.strip().lower()}."
    if "subir_trabajo" not in get_user_privilege_codes(u):
        return None, f"{u.email} no tiene el rol de ponente, por lo que no puede agregarse como coautor."
    return u, None


def limite_para(usuario, congreso, actividad):
    """Máximo de trabajos en los que el usuario puede participar (como autor o coautor) en esta actividad."""
    lt = LimiteTrabajo.objects.filter(actividad=actividad).first()
    if lt is None:
        return actividad.trabajos_por_ponente
    personalizado = LimiteUsuario.objects.filter(usuario=usuario, limite=lt).first()
    return personalizado.limite_personalizado if personalizado else lt.limite


def trabajos_usados(usuario, congreso, actividad):
    """Trabajos en los que participa el usuario, sea autor o coautor (todos consumen cupo)."""
    return Trabajo.objects.filter(congreso=congreso, actividad=actividad, autores__usuario=usuario).distinct().count()


def trabajos_totales(usuario, congreso):
    """Trabajos en los que participa el usuario en la edición, sumando todas las actividades."""
    return Trabajo.objects.filter(congreso=congreso, autores__usuario=usuario).distinct().count()


def limite_global(congreso):
    return congreso.limite_trabajos


def sin_cupo_usuario(usuario, congreso, actividad):
    """Motivo (texto) por el que el usuario ya no puede sumar otro trabajo, o None si aún tiene cupo."""
    limite = limite_para(usuario, congreso, actividad)
    if trabajos_usados(usuario, congreso, actividad) >= limite:
        return f"límite de {limite} trabajo(s) de tipo «{actividad.nombre}»"
    if trabajos_totales(usuario, congreso) >= limite_global(congreso):
        return f"límite global de {limite_global(congreso)} trabajos en el congreso"
    return None


def coautores_sin_cupo(coautores, congreso, actividad, trabajo=None):
    """Nombres de los coautores que ya alcanzaron su límite (por actividad o global); ignora a quienes ya están en `trabajo`."""
    sin_cupo = []
    for co in coautores:
        if trabajo is not None and trabajo.autores.filter(usuario=co).exists():
            continue
        if sin_cupo_usuario(co, congreso, actividad):
            sin_cupo.append(nombre_completo(co) or co.email)
    return sin_cupo


def primera_fase(actividad):
    return Fase.objects.filter(actividad=actividad, activa=True).order_by("secuencia").first()


def serializar_trabajo(t, usuario):
    autores = list(t.autores.select_related("usuario").order_by("orden_autor"))
    mio = next((a for a in autores if a.usuario_id == usuario.pk), None)
    # Se edita mientras está en el paso 1 (incluye cuando el evaluador pidió cambios) o si quedó «resumen rechazado».
    fase_editable = bool(mio and mio.es_autor and t.fase.actividad_id == t.actividad_id
                         and (t.fase.secuencia == 1 or normalizar(t.fase.nombre) == "resumen_rechazado"))
    plazo_ok, aviso_edicion = plazos.edicion_resumen(t) if fase_editable else (False, None)
    puede_editar = fase_editable and plazo_ok
    return {
        "id": t.pk,
        "clave": t.clave,
        "titulo": t.titulo,
        "resumen": t.resumen,
        "palabras_clave": t.palabras_clave,
        "congreso": {"id": t.congreso_id, "nombre": t.congreso.nombre_congreso, "edicion": t.congreso.edicion_congreso},
        "actividad": {"id": t.actividad_id, "nombre": t.actividad.nombre},
        "area": {"id": t.area_id, "clave": t.area.code, "nombre": t.area.name},
        "fase": {"id": t.fase_id, "nombre": t.fase.nombre, "secuencia": t.fase.secuencia, "descripcion": t.fase.descripcion},
        "fecha_registro": t.fecha_registro,
        "observaciones": t.observaciones,
        "es_autor": bool(mio and mio.es_autor),
        "autores": [
            {"nombre": nombre_completo(a.usuario), "correo": a.usuario.email, "es_autor": a.es_autor, "orden": a.orden_autor}
            for a in autores
        ],
        "puede_editar": puede_editar,
        "aviso_edicion": aviso_edicion,
        "aviso_extenso": plazos.subida_extenso(t)[1] if mio and mio.es_autor and normalizar(t.fase.nombre) in ("resumen_aprobado", "extenso_enviado", "extenso_rechazado", "extenso_evaluacion") else None,
        "fechas": ventanas.resumen_ventanas(t.congreso),
        "extenso": info_extenso(t),
        "puede_subir_extenso": puede_subir_extenso(t, usuario),
    }


class SolicitudSerializer(serializers.Serializer):
    """Datos que envía el ponente al registrar (o corregir) un resumen."""

    congreso = serializers.PrimaryKeyRelatedField(queryset=Congreso.objects.all(), required=False)
    actividad = serializers.PrimaryKeyRelatedField(queryset=Actividad.objects.all(), required=False)
    area = serializers.PrimaryKeyRelatedField(queryset=Area.objects.all(), required=False)
    titulo = serializers.CharField(max_length=250)
    resumen = serializers.CharField(max_length=2000)
    palabras_clave = serializers.CharField(max_length=200)
    coautores = serializers.ListField(child=serializers.EmailField(), required=False, allow_empty=True)

    def validate_titulo(self, v):
        v = v.strip()
        if len(v) < 5:
            raise serializers.ValidationError("El título es demasiado corto.")
        return v

    def validate_resumen(self, v):
        v = v.strip()
        if len(v) < 50:
            raise serializers.ValidationError("El resumen debe tener al menos 50 caracteres.")
        return v

    def validate_palabras_clave(self, v):
        return v.strip()

    def validate_coautores(self, correos):
        usuario = self.context["request"].user
        limpios, vistos = [], set()
        for c in correos:
            c = c.strip().lower()
            if c == usuario.email.lower():
                continue
            if c in vistos:
                continue
            vistos.add(c)
            limpios.append(c)
        usuarios, errores = [], []
        for c in limpios:
            u, error = resolver_coautor(c)
            if error:
                errores.append(error)
            else:
                usuarios.append(u)
        if errores:
            raise serializers.ValidationError(" ".join(errores))
        return usuarios

    def validate(self, datos):
        crear = self.context.get("crear", True)
        if not crear:
            return datos
        usuario = self.context["request"].user
        for campo in ("congreso", "actividad", "area"):
            if campo not in datos:
                raise serializers.ValidationError({campo: "Este campo es obligatorio."})
        congreso, actividad = datos["congreso"], datos["actividad"]

        if not CongresoActividad.objects.filter(congreso=congreso, actividad=actividad, activa=True).exists():
            raise serializers.ValidationError({"actividad": "Este congreso no recibe trabajos de ese tipo."})

        ventana = ventana_recepcion(congreso)
        if ventana and not ventana["abierta"]:
            raise serializers.ValidationError(
                {"congreso": f"La recepción de resúmenes es del {ventana['inicio']:%d/%m/%Y} al {ventana['fin']:%d/%m/%Y}."}
            )

        motivo = sin_cupo_usuario(usuario, congreso, actividad)
        if motivo:
            raise serializers.ValidationError({"actividad": f"Ya alcanzaste el {motivo} en este congreso."})

        sin_cupo = coautores_sin_cupo(datos.get("coautores", []), congreso, actividad)
        if sin_cupo:
            raise serializers.ValidationError(
                {"coautores": "Ya alcanzaron su límite de trabajos: " + ", ".join(sin_cupo) + "."}
            )

        fase = primera_fase(actividad)
        if fase is None:
            raise serializers.ValidationError({"actividad": "Ese tipo de trabajo aún no tiene fases configuradas."})
        datos["fase"] = fase
        return datos


def crear_trabajo(datos, usuario):
    t = Trabajo.objects.create(
        congreso=datos["congreso"], actividad=datos["actividad"], area=datos["area"], fase=datos["fase"],
        titulo=datos["titulo"], resumen=datos["resumen"], palabras_clave=datos["palabras_clave"],
    )
    UsuarioTrabajo.objects.create(usuario=usuario, trabajo=t, es_autor=True, orden_autor=1)
    for i, co in enumerate(datos.get("coautores", []), start=2):
        UsuarioTrabajo.objects.create(usuario=co, trabajo=t, es_autor=False, orden_autor=i)
    return t
