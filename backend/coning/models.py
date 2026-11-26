from django.db import models
from django.utils import timezone


# ---------------------------------------------------------------
# Usuarios y tickets
# ---------------------------------------------------------------
class Usuario(models.Model):
    class AvisoPrivacidad(models.TextChoices):
        ACEPTADO = "ACEPTADO", "Aceptado"
        RECHAZADO = "RECHAZADO", "Rechazado"

    id_usuario = models.AutoField(primary_key=True)
    nombre_usuario = models.CharField(max_length=100)
    apellido_paterno = models.CharField(max_length=100)
    apellido_materno = models.CharField(max_length=100)
    correo_usuario = models.CharField(max_length=100)
    contrasenia = models.CharField(max_length=255)  # guarda el hash, no texto plano
    aviso_privacidad = models.CharField(
        max_length=10, choices=AvisoPrivacidad.choices, default=AvisoPrivacidad.RECHAZADO
    )
    fecha_registro = models.DateTimeField(default=timezone.now, null=True, blank=True)
    # El límite de trabajos ya no vive aquí: ver LimiteTrabajo y LimiteUsuario.

    class Meta:
        db_table = "usuario"

    def __str__(self):
        return f"{self.nombre_usuario} {self.apellido_paterno}"


class CategoriaTicket(models.Model):
    id_categoria = models.AutoField(primary_key=True)
    nombre_categoria = models.CharField(max_length=100)
    descripcion_categoria = models.TextField(null=True, blank=True)

    class Meta:
        db_table = "categoriaticket"

    def __str__(self):
        return self.nombre_categoria


class Ticket(models.Model):
    id_ticket = models.AutoField(primary_key=True)
    nombre_ticket = models.CharField(max_length=150)
    descripcion_ticket = models.TextField(null=True, blank=True)
    categoria = models.ForeignKey(
        CategoriaTicket, on_delete=models.CASCADE, db_column="id_categoria"
    )

    class Meta:
        db_table = "ticket"

    def __str__(self):
        return self.nombre_ticket


class TicketUsuario(models.Model):
    class Estatus(models.TextChoices):
        EN_ESPERA = "EN ESPERA", "En espera"
        EN_REVISION = "EN REVISION", "En revisión"
        RESUELTO = "RESUELTO", "Resuelto"

    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, db_column="id_ticket")
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, db_column="id_usuario")
    descripcion = models.TextField()
    fecha_expedicion = models.DateTimeField(default=timezone.now, null=True, blank=True)
    fecha_cierre = models.DateTimeField(null=True, blank=True)
    estatus = models.CharField(max_length=15, choices=Estatus.choices, default=Estatus.EN_ESPERA)
    respuesta = models.TextField(null=True, blank=True)

    pk = models.CompositePrimaryKey("ticket_id", "usuario_id")

    class Meta:
        db_table = "ticketusuario"


# ---------------------------------------------------------------
# Catálogos del perfil
# ---------------------------------------------------------------
class NivelAcademico(models.Model):
    id_nivel = models.AutoField(primary_key=True)
    grado_nivel = models.CharField(max_length=100)
    descripcion_nivel = models.TextField(null=True, blank=True)

    class Meta:
        db_table = "nivelacademico"

    def __str__(self):
        return self.grado_nivel


class Pais(models.Model):
    id_pais = models.AutoField(primary_key=True)
    nombre_pais = models.CharField(max_length=100)

    class Meta:
        db_table = "pais"
        verbose_name_plural = "países"

    def __str__(self):
        return self.nombre_pais


class Estado(models.Model):
    id_estado = models.AutoField(primary_key=True)
    pais = models.ForeignKey(Pais, on_delete=models.CASCADE, db_column="id_pais")
    nombre_estado = models.CharField(max_length=100, null=True, blank=True)

    class Meta:
        db_table = "estado"

    def __str__(self):
        return self.nombre_estado or ""


class Institucion(models.Model):
    id_institucion = models.AutoField(primary_key=True)
    nombre_institucion = models.CharField(max_length=150)
    acronimo_institucion = models.CharField(max_length=20, null=True, blank=True)

    class Meta:
        db_table = "institucion"
        verbose_name_plural = "instituciones"

    def __str__(self):
        return self.nombre_institucion


class Campus(models.Model):
    id_campus = models.AutoField(primary_key=True)
    institucion = models.ForeignKey(
        Institucion, on_delete=models.CASCADE, db_column="id_institucion"
    )
    nombre_campus = models.CharField(max_length=150)
    acronimo_campus = models.CharField(max_length=20, null=True, blank=True)

    class Meta:
        db_table = "campus"

    def __str__(self):
        return self.nombre_campus


class Lada(models.Model):
    id_lada = models.AutoField(primary_key=True)
    digitos_lada = models.CharField(max_length=20)
    lugar_lada = models.CharField(max_length=100, null=True, blank=True)

    class Meta:
        db_table = "lada"

    def __str__(self):
        return self.digitos_lada


class Perfil(models.Model):
    id_perfil = models.AutoField(primary_key=True)
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, db_column="id_usuario")
    estado = models.ForeignKey(Estado, on_delete=models.CASCADE, db_column="id_estado")
    institucion = models.ForeignKey(
        Institucion, on_delete=models.CASCADE, db_column="id_institucion"
    )
    nivel = models.ForeignKey(NivelAcademico, on_delete=models.CASCADE, db_column="id_nivel")
    lada = models.ForeignKey(Lada, on_delete=models.CASCADE, db_column="id_lada")
    foto_perfil = models.CharField(max_length=100, null=True, blank=True)
    telefono_movil = models.CharField(max_length=15, null=True, blank=True)
    telefono_fijo = models.CharField(max_length=15, null=True, blank=True)
    semblanza = models.CharField(max_length=100, null=True, blank=True)
    fecha_perfil = models.DateTimeField(default=timezone.now, null=True, blank=True)

    class Meta:
        db_table = "perfil"


# ---------------------------------------------------------------
# Roles, privilegios, comités y áreas
# ---------------------------------------------------------------
class Privilegio(models.Model):
    id_privilegio = models.AutoField(primary_key=True)
    nombre_privilegio = models.CharField(max_length=100)
    descripcion_privilegio = models.TextField(null=True, blank=True)

    class Meta:
        db_table = "privilegio"

    def __str__(self):
        return self.nombre_privilegio


class Rol(models.Model):
    id_rol = models.AutoField(primary_key=True)
    nombre_rol = models.CharField(max_length=100)
    descripcion_rol = models.TextField(null=True, blank=True)

    class Meta:
        db_table = "rol"
        verbose_name_plural = "roles"

    def __str__(self):
        return self.nombre_rol


class UsuarioRol(models.Model):
    rol = models.ForeignKey(Rol, on_delete=models.CASCADE, db_column="id_rol")
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, db_column="id_usuario")

    pk = models.CompositePrimaryKey("rol_id", "usuario_id")

    class Meta:
        db_table = "usuariorol"


class RolPrivilegio(models.Model):
    privilegio = models.ForeignKey(
        Privilegio, on_delete=models.CASCADE, db_column="id_privilegio"
    )
    rol = models.ForeignKey(Rol, on_delete=models.CASCADE, db_column="id_rol")

    pk = models.CompositePrimaryKey("privilegio_id", "rol_id")

    class Meta:
        db_table = "rolprivilegio"


class Comite(models.Model):
    id_comite = models.AutoField(primary_key=True)
    nombre_comite = models.CharField(max_length=150)
    descripcion_comite = models.TextField(null=True, blank=True)

    class Meta:
        db_table = "comite"

    def __str__(self):
        return self.nombre_comite


class UsuarioComite(models.Model):
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, db_column="id_usuario")
    comite = models.ForeignKey(Comite, on_delete=models.CASCADE, db_column="id_comite")

    pk = models.CompositePrimaryKey("usuario_id", "comite_id")

    class Meta:
        db_table = "usuariocomite"


class Area(models.Model):
    id_area = models.AutoField(primary_key=True)
    clave_area = models.CharField(max_length=30, null=True, blank=True)
    nombre_area = models.CharField(max_length=150)

    class Meta:
        db_table = "area"

    def __str__(self):
        return self.nombre_area


class UsuarioArea(models.Model):
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, db_column="id_usuario")
    area = models.ForeignKey(Area, on_delete=models.CASCADE, db_column="id_area")

    pk = models.CompositePrimaryKey("usuario_id", "area_id")

    class Meta:
        db_table = "usuarioarea"


# ---------------------------------------------------------------
# Congreso y página
# ---------------------------------------------------------------
class Congreso(models.Model):
    class Modalidad(models.TextChoices):
        PRESENCIAL = "PRESENCIAL", "Presencial"
        EN_LINEA = "EN LINEA", "En línea"
        MIXTO = "MIXTO", "Mixto"

    id_congreso = models.AutoField(primary_key=True)
    edicion_congreso = models.IntegerField(null=True, blank=True)
    modalidad_congreso = models.CharField(
        max_length=12, choices=Modalidad.choices, default=Modalidad.PRESENCIAL
    )
    nombre_congreso = models.CharField(max_length=500)
    correo_congreso = models.CharField(max_length=150)
    contrasena_aplicacion = models.CharField(max_length=255)
    descripcion_congreso = models.TextField(null=True, blank=True)
    fecha_cierre_registro = models.CharField(max_length=150, null=True, blank=True)
    convocatoria = models.CharField(max_length=255, null=True, blank=True)
    aviso_privacidad = models.CharField(max_length=255, null=True, blank=True)
    plantilla_extenso = models.CharField(max_length=255, null=True, blank=True)
    plantilla_constancia = models.CharField(max_length=255, null=True, blank=True)
    plantilla_fondo_videoponencia = models.CharField(max_length=255, null=True, blank=True)
    plantilla_presentacion = models.CharField(max_length=255, null=True, blank=True)
    plantilla_autores = models.CharField(max_length=255, null=True, blank=True)
    ubicacion_sede = models.CharField(max_length=200, null=True, blank=True)
    direccion_sede = models.CharField(max_length=255, null=True, blank=True)
    google_maps_query = models.CharField(max_length=255, null=True, blank=True)
    contacto_correo = models.CharField(max_length=150, null=True, blank=True)
    contacto_telefono = models.CharField(max_length=30, null=True, blank=True)
    url_revista = models.CharField(max_length=255, null=True, blank=True)
    issn = models.CharField(max_length=30, null=True, blank=True)
    qr_congreso = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        db_table = "congreso"

    def __str__(self):
        return self.nombre_congreso


class Pagina(models.Model):
    id_pagina = models.AutoField(primary_key=True)
    congreso = models.ForeignKey(Congreso, on_delete=models.CASCADE, db_column="id_congreso")
    color_banner = models.CharField(max_length=30, null=True, blank=True)
    cartel = models.CharField(max_length=255, null=True, blank=True)
    banner = models.CharField(max_length=255, null=True, blank=True)
    enlace_programa = models.URLField(max_length=500, null=True, blank=True)
    logo_congreso = models.CharField(max_length=255, null=True, blank=True)
    logo_departamento = models.CharField(max_length=255, null=True, blank=True)
    imagen_login = models.CharField(max_length=255, null=True, blank=True)
    imagen_contrasena = models.CharField(max_length=255, null=True, blank=True)
    imagen_crearCuenta = models.CharField(max_length=255, null=True, blank=True)
    programa = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        db_table = "pagina"


# ---------------------------------------------------------------
# Patrocinadores
# ---------------------------------------------------------------
class TipoPatrocinador(models.Model):
    id_tipopa = models.AutoField(primary_key=True)
    nombre_tipopa = models.CharField(max_length=100)

    class Meta:
        db_table = "tipopatrocinador"

    def __str__(self):
        return self.nombre_tipopa


class Patrocinador(models.Model):
    id_patrocinador = models.AutoField(primary_key=True)
    tipopa = models.ForeignKey(TipoPatrocinador, on_delete=models.CASCADE, db_column="id_tipopa")
    nombre_patrocinador = models.CharField(max_length=200)
    logo_patrocinador = models.CharField(max_length=255, null=True, blank=True)
    activo = models.BooleanField(default=True)

    class Meta:
        db_table = "patrocinador"

    def __str__(self):
        return self.nombre_patrocinador


class CongresoPatrocinador(models.Model):
    congreso = models.ForeignKey(Congreso, on_delete=models.CASCADE, db_column="id_congreso")
    patrocinador = models.ForeignKey(
        Patrocinador, on_delete=models.CASCADE, db_column="id_patrocinador"
    )

    pk = models.CompositePrimaryKey("congreso_id", "patrocinador_id")

    class Meta:
        db_table = "congresopatrocinador"


# ---------------------------------------------------------------
# Fechas importantes
# ---------------------------------------------------------------
class FechaImportante(models.Model):
    id_fecha = models.AutoField(primary_key=True)
    nombre_fecha = models.CharField(max_length=200)
    descripcion_fecha = models.TextField(null=True, blank=True)

    class Meta:
        db_table = "fechaimportante"
        verbose_name_plural = "fechas importantes"

    def __str__(self):
        return self.nombre_fecha


class CongresoFecha(models.Model):
    congreso = models.ForeignKey(Congreso, on_delete=models.CASCADE, db_column="id_congreso")
    fecha = models.ForeignKey(FechaImportante, on_delete=models.CASCADE, db_column="id_fecha")
    fecha_inicio = models.DateField(null=True, blank=True)
    fecha_fin = models.DateField(null=True, blank=True)

    pk = models.CompositePrimaryKey("congreso_id", "fecha_id")

    class Meta:
        db_table = "congresofecha"


# ---------------------------------------------------------------
# Cuotas y pagos
# ---------------------------------------------------------------
class ConceptoCuota(models.Model):
    id_concepto = models.AutoField(primary_key=True)
    nombre_concepto = models.CharField(max_length=200)

    class Meta:
        db_table = "conceptocuota"

    def __str__(self):
        return self.nombre_concepto


class Cuota(models.Model):
    id_cuota = models.AutoField(primary_key=True)
    congreso = models.ForeignKey(Congreso, on_delete=models.CASCADE, db_column="id_congreso")
    concepto = models.ForeignKey(ConceptoCuota, on_delete=models.CASCADE, db_column="id_concepto")
    monto_cuota = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        db_table = "cuota"


class Pago(models.Model):
    class Validado(models.TextChoices):
        PENDIENTE = "PENDIENTE", "Pendiente"
        VALIDO = "VALIDO", "Válido"
        NO_VALIDO = "NO VALIDO", "No válido"

    cuota = models.ForeignKey(Cuota, on_delete=models.CASCADE, db_column="id_cuota")
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, db_column="id_usuario")
    referencia_pago = models.CharField(max_length=200, null=True, blank=True)
    comprobante_academico = models.CharField(max_length=200, null=True, blank=True)
    validado = models.CharField(max_length=10, choices=Validado.choices, default=Validado.PENDIENTE)

    pk = models.CompositePrimaryKey("cuota_id", "usuario_id")

    class Meta:
        db_table = "pago"


# ---------------------------------------------------------------
# Actividades, fases y trabajos
# ---------------------------------------------------------------
class Actividad(models.Model):
    id_actividad = models.AutoField(primary_key=True)
    nombre_actividad = models.CharField(max_length=150)
    num_evaluadores = models.IntegerField(default=1, null=True, blank=True)

    class Meta:
        db_table = "actividad"
        verbose_name_plural = "actividades"

    def __str__(self):
        return self.nombre_actividad


class CongresoActividad(models.Model):
    congreso = models.ForeignKey(Congreso, on_delete=models.CASCADE, db_column="id_congreso")
    actividad = models.ForeignKey(Actividad, on_delete=models.CASCADE, db_column="id_actividad")
    activo = models.BooleanField(default=True)

    pk = models.CompositePrimaryKey("congreso_id", "actividad_id")

    class Meta:
        db_table = "congresoactividad"


class LimiteTrabajo(models.Model):
    id_limite = models.AutoField(primary_key=True)
    actividad = models.ForeignKey(Actividad, on_delete=models.CASCADE, db_column="id_actividad")
    limite = models.IntegerField(default=1)

    class Meta:
        db_table = "limitetrabajo"

    def __str__(self):
        return f"{self.actividad}: {self.limite}"


class LimiteUsuario(models.Model):
    """Límite personalizado de trabajos para un usuario en una actividad.

    Si no existe registro, aplica el límite general de LimiteTrabajo.
    """

    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, db_column="id_usuario")
    limite_trabajo = models.ForeignKey(
        LimiteTrabajo, on_delete=models.CASCADE, db_column="id_limite"
    )
    limite_personalizado = models.PositiveIntegerField()

    class Meta:
        db_table = "limiteusuario"
        constraints = [
            models.UniqueConstraint(
                fields=["usuario", "limite_trabajo"], name="uq_limiteusuario"
            )
        ]


class Fase(models.Model):
    id_fase = models.AutoField(primary_key=True)
    actividad = models.ForeignKey(Actividad, on_delete=models.CASCADE, db_column="id_actividad")
    nombre_fase = models.CharField(max_length=120)
    descripcion_fase = models.TextField(null=True, blank=True)
    secuencia = models.IntegerField()
    activo = models.BooleanField(default=True)

    class Meta:
        db_table = "fase"

    def __str__(self):
        return self.nombre_fase


class Trabajo(models.Model):
    class Expuso(models.TextChoices):
        EXPUSO = "EXPUSO", "Expuso"
        NO_EXPUSO = "NO EXPUSO", "No expuso"

    # En el SQL no es IDENTITY: el id se asigna manualmente.
    id_trabajo = models.IntegerField(primary_key=True)
    congreso = models.ForeignKey(Congreso, on_delete=models.CASCADE, db_column="id_congreso")
    actividad = models.ForeignKey(Actividad, on_delete=models.CASCADE, db_column="id_actividad")
    area = models.ForeignKey(Area, on_delete=models.CASCADE, db_column="id_area")
    fase = models.ForeignKey(Fase, on_delete=models.CASCADE, db_column="id_fase")
    clave_trabajo = models.CharField(max_length=50, null=True, blank=True)
    titulo_trabajo = models.CharField(max_length=255)
    resumen_trabajo = models.TextField(null=True, blank=True)
    palabras_clave = models.TextField(null=True, blank=True)
    expuso_trabajo = models.CharField(
        max_length=10, choices=Expuso.choices, null=True, blank=True, default=None
    )

    class Meta:
        db_table = "trabajo"

    def __str__(self):
        return self.titulo_trabajo


class Evaluador(models.Model):
    class Dictamen(models.TextChoices):
        APROBADO = "APROBADO", "Aprobado"
        RECHAZADO = "RECHAZADO", "Rechazado"

    id_evaluador = models.AutoField(primary_key=True)
    trabajo = models.ForeignKey(Trabajo, on_delete=models.CASCADE, db_column="id_trabajo")
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, db_column="id_usuario")
    numero_evaluador = models.IntegerField(default=1, null=True, blank=True)
    dictamen = models.CharField(
        max_length=10, choices=Dictamen.choices, null=True, blank=True, default=None
    )

    class Meta:
        db_table = "evaluador"


class UsuarioTrabajo(models.Model):
    class Autoria(models.TextChoices):
        AUTOR = "AUTOR", "Autor"
        COAUTOR = "COAUTOR", "Coautor"

    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, db_column="id_usuario")
    trabajo = models.ForeignKey(Trabajo, on_delete=models.CASCADE, db_column="id_trabajo")
    autoria = models.CharField(max_length=10, choices=Autoria.choices)
    orden_autor = models.IntegerField()

    pk = models.CompositePrimaryKey("usuario_id", "trabajo_id")

    class Meta:
        db_table = "usuariotrabajo"


class Pregunta(models.Model):
    id_pregunta = models.AutoField(primary_key=True)
    fase = models.ForeignKey(Fase, on_delete=models.CASCADE, db_column="id_fase")
    pregunta = models.TextField()
    activo = models.BooleanField(default=True)

    class Meta:
        db_table = "pregunta"


class TrabajoPregunta(models.Model):
    class Respuesta(models.TextChoices):
        SI = "SI", "Sí"
        NO = "NO", "No"

    id_trabajopregunta = models.AutoField(primary_key=True)
    trabajo = models.ForeignKey(Trabajo, on_delete=models.CASCADE, db_column="id_trabajo")
    pregunta = models.ForeignKey(Pregunta, on_delete=models.CASCADE, db_column="id_pregunta")
    evaluador = models.ForeignKey(Evaluador, on_delete=models.CASCADE, db_column="id_evaluador")
    fecha = models.DateTimeField(default=timezone.now, null=True, blank=True)
    respuesta = models.CharField(
        max_length=2, choices=Respuesta.choices, null=True, blank=True, default=None
    )
    observacion = models.TextField(null=True, blank=True)

    class Meta:
        db_table = "trabajopregunta"


# ---------------------------------------------------------------
# Asistencia (registro por QR durante la semana del congreso)
# ---------------------------------------------------------------
class Asistencia(models.Model):
    id_asistencia = models.AutoField(primary_key=True)
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, db_column="id_usuario")
    congreso = models.ForeignKey(Congreso, on_delete=models.CASCADE, db_column="id_congreso")
    # Opcional: solo si la asistencia es a un trabajo/ponencia específico.
    trabajo = models.ForeignKey(
        Trabajo, on_delete=models.CASCADE, db_column="id_trabajo", null=True, blank=True
    )
    hora_fecha = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "asistencia"
        verbose_name_plural = "asistencias"


# ---------------------------------------------------------------
# Sedes y horarios
# ---------------------------------------------------------------
class CampusCongreso(models.Model):
    id_campus = models.AutoField(primary_key=True)
    nombre_campus = models.CharField(max_length=200)

    class Meta:
        db_table = "campus_congreso"

    def __str__(self):
        return self.nombre_campus


class Edificio(models.Model):
    id_edificio = models.AutoField(primary_key=True)
    campus = models.ForeignKey(CampusCongreso, on_delete=models.CASCADE, db_column="id_campus")
    nombre_edificio = models.CharField(max_length=150)

    class Meta:
        db_table = "edificio"

    def __str__(self):
        return self.nombre_edificio


class Aula(models.Model):
    id_aula = models.AutoField(primary_key=True)
    edificio = models.ForeignKey(Edificio, on_delete=models.CASCADE, db_column="id_edificio")
    nombre_aula = models.CharField(max_length=100)
    capacidad_aula = models.IntegerField(null=True, blank=True)

    class Meta:
        db_table = "aula"

    def __str__(self):
        return self.nombre_aula


class Horario(models.Model):
    id_horario = models.AutoField(primary_key=True)
    aula = models.ForeignKey(Aula, on_delete=models.CASCADE, db_column="id_aula")
    trabajo = models.ForeignKey(Trabajo, on_delete=models.CASCADE, db_column="id_trabajo")
    fecha = models.DateField()
    hora_inicio = models.IntegerField()
    hora_fin = models.IntegerField()

    class Meta:
        db_table = "horario"


# ---------------------------------------------------------------
# Documentos
# ---------------------------------------------------------------
class Documento(models.Model):
    id_documento = models.AutoField(primary_key=True)
    nombre_documento = models.CharField(max_length=200)
    descripcion_documento = models.TextField(null=True, blank=True)
    tipo_documento = models.CharField(max_length=80, null=True, blank=True)

    class Meta:
        db_table = "documento"

    def __str__(self):
        return self.nombre_documento


class TrabajoDocumento(models.Model):
    trabajo = models.ForeignKey(Trabajo, on_delete=models.CASCADE, db_column="id_trabajo")
    documento = models.ForeignKey(Documento, on_delete=models.CASCADE, db_column="id_documento")
    contenido = models.CharField(max_length=150, null=True, blank=True)

    pk = models.CompositePrimaryKey("trabajo_id", "documento_id")

    class Meta:
        db_table = "trabajodocumento"