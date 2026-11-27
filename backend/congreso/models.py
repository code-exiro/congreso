"""Modelos del congreso (borrador local basado en el Diccionario de Datos CONING).

Cada clase indica entre paréntesis la tabla del diccionario que representa.
Las tablas puente usan id propio + restricción de unicidad (no llave compuesta).
"""
from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

from .validators import extensions, hex_color, issn_format, max_size_mb, phone_digits

IMG_2MB = [extensions("jpg", "jpeg"), max_size_mb(2)]


class Congreso(models.Model):
    """Congreso: una edición del congreso."""

    class Modalidad(models.TextChoices):
        PRESENCIAL = "Presencial", "Presencial"
        ONLINE = "Online", "Online"
        HIBRIDO = "Híbrido", "Híbrido"

    nombre_congreso = models.CharField(max_length=200, verbose_name="nombre del congreso")
    edicion_congreso = models.PositiveIntegerField(validators=[MinValueValidator(1)], verbose_name="edición")
    modalidad_congreso = models.CharField(max_length=10, choices=Modalidad.choices, verbose_name="modalidad")
    correo_congreso = models.EmailField(max_length=254, verbose_name="correo del congreso")
    # BORRADOR: el diccionario pide guardarla; conviene cifrarla o moverla al .env.
    contrasena_aplicacion = models.CharField(max_length=255, verbose_name="contraseña de aplicación")
    convocatoria = models.FileField(upload_to="congreso/", null=True, blank=True, validators=[extensions("pdf")], verbose_name="convocatoria")
    aviso_privacidad = models.FileField(upload_to="congreso/", null=True, blank=True, validators=[extensions("pdf")], verbose_name="aviso de privacidad")
    terminos_condiciones = models.FileField(upload_to="congreso/", null=True, blank=True, validators=[extensions("pdf")], verbose_name="términos y condiciones")
    plantilla_extenso = models.FileField(upload_to="congreso/plantillas/", null=True, blank=True, validators=[extensions("doc", "docx")], verbose_name="plantilla de extenso")
    plantilla_constancia = models.FileField(upload_to="congreso/plantillas/", null=True, blank=True, verbose_name="plantilla de constancia")
    plantilla_fondo_videoponencia = models.FileField(upload_to="congreso/plantillas/", null=True, blank=True, verbose_name="plantilla de fondo para videoponencia")
    plantilla_presentacion = models.FileField(upload_to="congreso/plantillas/", null=True, blank=True, verbose_name="plantilla de presentación")
    plantilla_autores = models.FileField(upload_to="congreso/plantillas/", null=True, blank=True, verbose_name="plantilla para autores")
    # BORRADOR: no está en el diccionario. «Roles y Privilegios» pide un máximo de trabajos por evaluador (5 por defecto).
    max_trabajos_por_evaluador = models.PositiveIntegerField(default=5, validators=[MinValueValidator(1)], verbose_name="máximo de trabajos por evaluador")
    # Minuta 13-nov-2026: tope global de trabajos por usuario en la edición, sumando todas las modalidades.
    limite_trabajos = models.PositiveIntegerField(default=6, validators=[MinValueValidator(1)], verbose_name="límite global de trabajos por usuario")
    ubicacion_sede = models.CharField(max_length=255, blank=True, verbose_name="ubicación de la sede")
    contacto_correo = models.EmailField(max_length=254, verbose_name="correo de contacto")
    contacto_telefono = models.CharField(max_length=15, validators=[phone_digits], verbose_name="teléfono de contacto")
    url_revista = models.URLField(max_length=255, null=True, blank=True, verbose_name="URL de la revista")
    issn = models.CharField(max_length=9, null=True, blank=True, validators=[issn_format], verbose_name="ISSN")
    qr_congreso = models.ImageField(upload_to="congreso/qr/", null=True, blank=True, verbose_name="código QR")

    def __str__(self):
        return f"{self.nombre_congreso} (edición {self.edicion_congreso})"

    class Meta:
        verbose_name = "congreso"
        verbose_name_plural = "congresos"
        ordering = ["-edicion_congreso"]
        constraints = [
            models.UniqueConstraint(fields=["nombre_congreso", "edicion_congreso"], name="unico_congreso_nombre_edicion"),
        ]


class Pagina(models.Model):
    """Página: personalización visual del congreso. Una por congreso."""

    congreso = models.OneToOneField(Congreso, on_delete=models.CASCADE, related_name="pagina", verbose_name="congreso")
    color_banner = models.CharField(max_length=7, null=True, blank=True, validators=[hex_color], verbose_name="color del banner")
    cartel = models.ImageField(upload_to="congreso/pagina/", null=True, blank=True, validators=IMG_2MB, verbose_name="cartel")
    banner = models.ImageField(upload_to="congreso/pagina/", null=True, blank=True, validators=IMG_2MB, verbose_name="banner")
    logo_congreso = models.ImageField(upload_to="congreso/pagina/", null=True, blank=True, validators=IMG_2MB, verbose_name="logotipo del congreso")
    logo_departamento = models.ImageField(upload_to="congreso/pagina/", null=True, blank=True, validators=IMG_2MB, verbose_name="logotipo del departamento")
    imagen_login = models.ImageField(upload_to="congreso/pagina/", null=True, blank=True, validators=IMG_2MB, verbose_name="imagen de inicio de sesión")
    imagen_contrasena = models.ImageField(upload_to="congreso/pagina/", null=True, blank=True, validators=IMG_2MB, verbose_name="imagen de recuperar contraseña")
    imagen_crear_cuenta = models.ImageField(upload_to="congreso/pagina/", null=True, blank=True, validators=IMG_2MB, verbose_name="imagen de crear cuenta")
    programa = models.FileField(upload_to="congreso/pagina/", null=True, blank=True, validators=[extensions("pdf"), max_size_mb(5)], verbose_name="programa")
    # Contenido editable de la landing (textos, fechas, enlaces y URLs de archivos). Se hereda al crear un congreso nuevo.
    contenido = models.JSONField(default=dict, blank=True, verbose_name="contenido de la landing")

    def __str__(self):
        return f"Página de {self.congreso}"

    class Meta:
        verbose_name = "página del congreso"
        verbose_name_plural = "páginas del congreso"


class TipoPatrocinador(models.Model):
    """Tipo de patrocinador (TipoPatrocinador)."""

    nombre = models.CharField(max_length=100, unique=True, verbose_name="tipo de patrocinador")

    def __str__(self):
        return self.nombre

    class Meta:
        verbose_name = "tipo de patrocinador"
        verbose_name_plural = "tipos de patrocinador"
        ordering = ["nombre"]


class Patrocinador(models.Model):
    """Patrocinador."""

    tipo = models.ForeignKey(TipoPatrocinador, on_delete=models.PROTECT, related_name="patrocinadores", verbose_name="tipo")
    nombre = models.CharField(max_length=150, unique=True, verbose_name="nombre del patrocinador")
    logo = models.ImageField(upload_to="patrocinadores/", null=True, blank=True, validators=[extensions("jpg", "jpeg", "png"), max_size_mb(2)], verbose_name="logotipo")
    activo = models.BooleanField(default=True, verbose_name="activo")

    def __str__(self):
        return self.nombre

    class Meta:
        verbose_name = "patrocinador"
        verbose_name_plural = "patrocinadores"
        ordering = ["nombre"]


class CongresoPatrocinador(models.Model):
    """Patrocinadores de un congreso (CongresoPatrocinador)."""

    congreso = models.ForeignKey(Congreso, on_delete=models.CASCADE, related_name="patrocinadores", verbose_name="congreso")
    patrocinador = models.ForeignKey(Patrocinador, on_delete=models.PROTECT, related_name="congresos", verbose_name="patrocinador")

    def __str__(self):
        return f"{self.congreso} - {self.patrocinador}"

    class Meta:
        verbose_name = "patrocinador del congreso"
        verbose_name_plural = "patrocinadores del congreso"
        constraints = [models.UniqueConstraint(fields=["congreso", "patrocinador"], name="unico_congreso_patrocinador")]


class FechaImportante(models.Model):
    """Fecha importante: catálogo."""

    nombre = models.CharField(max_length=100, unique=True, verbose_name="nombre")
    descripcion = models.CharField(max_length=255, blank=True, verbose_name="descripción")

    def __str__(self):
        return self.nombre

    class Meta:
        verbose_name = "fecha importante"
        verbose_name_plural = "fechas importantes"
        ordering = ["nombre"]


class CongresoFechaImportante(models.Model):
    """Fechas programadas de un congreso (CongresoFechasImportantes)."""

    congreso = models.ForeignKey(Congreso, on_delete=models.CASCADE, related_name="fechas_importantes", verbose_name="congreso")
    fecha_importante = models.ForeignKey(FechaImportante, on_delete=models.PROTECT, related_name="congresos", verbose_name="fecha importante")
    fecha_inicio = models.DateField(verbose_name="inicio")
    fecha_fin = models.DateField(verbose_name="fin")

    def __str__(self):
        return f"{self.congreso} - {self.fecha_importante}"

    class Meta:
        verbose_name = "fecha importante del congreso"
        verbose_name_plural = "fechas importantes del congreso"
        ordering = ["fecha_inicio"]
        constraints = [
            models.UniqueConstraint(fields=["congreso", "fecha_importante"], name="unico_congreso_fecha_importante"),
            models.CheckConstraint(condition=models.Q(fecha_fin__gte=models.F("fecha_inicio")), name="check_rango_fecha_importante"),
        ]


class Actividad(models.Model):
    """Actividad: tipo de actividad (ponencia, taller...)."""

    nombre = models.CharField(max_length=100, unique=True, verbose_name="nombre de la actividad")
    trabajos_por_ponente = models.PositiveIntegerField(default=1, validators=[MinValueValidator(1)], verbose_name="trabajos por ponente")
    evaluadores_por_trabajo = models.PositiveIntegerField(default=2, validators=[MinValueValidator(1)], verbose_name="evaluadores por trabajo")

    def __str__(self):
        return self.nombre

    class Meta:
        verbose_name = "actividad"
        verbose_name_plural = "actividades"
        ordering = ["nombre"]


class CongresoActividad(models.Model):
    """Actividades ofrecidas en un congreso (CongresoActividad)."""

    congreso = models.ForeignKey(Congreso, on_delete=models.CASCADE, related_name="actividades", verbose_name="congreso")
    actividad = models.ForeignKey(Actividad, on_delete=models.PROTECT, related_name="congresos", verbose_name="actividad")
    activa = models.BooleanField(default=True, verbose_name="activa")

    def __str__(self):
        return f"{self.congreso} - {self.actividad}"

    class Meta:
        verbose_name = "actividad del congreso"
        verbose_name_plural = "actividades del congreso"
        constraints = [models.UniqueConstraint(fields=["congreso", "actividad"], name="unico_congreso_actividad")]


class LimiteTrabajo(models.Model):
    """Límite de trabajos por actividad (LimiteTrabajo)."""

    actividad = models.ForeignKey(Actividad, on_delete=models.PROTECT, related_name="limites", verbose_name="actividad")
    limite = models.PositiveIntegerField(validators=[MinValueValidator(1)], verbose_name="límite de trabajos")

    def __str__(self):
        return f"{self.actividad}: {self.limite}"

    class Meta:
        verbose_name = "límite de trabajos"
        verbose_name_plural = "límites de trabajos"


class LimiteUsuario(models.Model):
    """Límite personalizado de trabajos para un usuario (LimiteUsuario)."""

    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="limites_trabajos", verbose_name="usuario")
    limite = models.ForeignKey(LimiteTrabajo, on_delete=models.CASCADE, related_name="limites_usuario", verbose_name="límite")
    limite_personalizado = models.PositiveIntegerField(verbose_name="límite personalizado")

    def __str__(self):
        return f"{self.usuario}: {self.limite_personalizado}"

    class Meta:
        verbose_name = "límite por usuario"
        verbose_name_plural = "límites por usuario"
        constraints = [models.UniqueConstraint(fields=["usuario", "limite"], name="unico_limite_usuario")]


class LimiteEvaluador(models.Model):
    """Excepción: máximo de trabajos que puede evaluar una persona en un congreso, distinto del general del congreso."""

    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="limites_evaluacion", verbose_name="evaluador")
    congreso = models.ForeignKey("Congreso", on_delete=models.CASCADE, related_name="limites_evaluador", verbose_name="congreso")
    limite_personalizado = models.PositiveIntegerField(validators=[MinValueValidator(1)], verbose_name="límite personalizado")

    def __str__(self):
        return f"{self.usuario}: {self.limite_personalizado}"

    class Meta:
        verbose_name = "límite por evaluador"
        verbose_name_plural = "límites por evaluador"
        constraints = [models.UniqueConstraint(fields=["usuario", "congreso"], name="unico_limite_evaluador_congreso")]


class ConceptoCuota(models.Model):
    """Concepto de cuota."""

    nombre = models.CharField(max_length=100, unique=True, verbose_name="concepto")

    def __str__(self):
        return self.nombre

    class Meta:
        verbose_name = "concepto de cuota"
        verbose_name_plural = "conceptos de cuota"
        ordering = ["nombre"]


class Cuota(models.Model):
    """Cuota de inscripción por congreso y concepto."""

    congreso = models.ForeignKey(Congreso, on_delete=models.CASCADE, related_name="cuotas", verbose_name="congreso")
    concepto = models.ForeignKey(ConceptoCuota, on_delete=models.PROTECT, related_name="cuotas", verbose_name="concepto")
    monto = models.DecimalField(max_digits=10, decimal_places=2, default=0, validators=[MinValueValidator(0)], verbose_name="monto")

    def __str__(self):
        return f"{self.concepto} (${self.monto})"

    class Meta:
        verbose_name = "cuota"
        verbose_name_plural = "cuotas"
        ordering = ["congreso", "concepto"]
        constraints = [models.UniqueConstraint(fields=["congreso", "concepto"], name="unica_cuota_congreso_concepto")]


class Pago(models.Model):
    """Pago de una cuota por un usuario."""

    cuota = models.ForeignKey(Cuota, on_delete=models.PROTECT, related_name="pagos", verbose_name="cuota")
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="pagos", verbose_name="usuario")
    referencia = models.CharField(max_length=100, verbose_name="referencia de pago")
    comprobante_academico = models.FileField(upload_to="pagos/", null=True, blank=True, verbose_name="comprobante académico")
    validado = models.BooleanField(default=False, verbose_name="validado")
    # BORRADOR: campos que no están en el diccionario, salen del proceso «ADMIN PAGOS» (estatus: en revisión, validado, rechazado).
    class Estado(models.TextChoices):
        REVISION = "revision", "En revisión"
        VALIDADO = "validado", "Validado"
        RECHAZADO = "rechazado", "Rechazado"

    estado = models.CharField(max_length=10, choices=Estado.choices, default=Estado.REVISION, verbose_name="estatus")
    comentario = models.TextField(blank=True, verbose_name="comentario del encargado de pagos")
    fecha_envio = models.DateTimeField(default=timezone.now, verbose_name="fecha de envío")
    comprobante_pago = models.FileField(upload_to="pagos/comprobantes/", null=True, blank=True, verbose_name="comprobante de pago")
    revisado_por = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="pagos_revisados", verbose_name="revisado por")

    def __str__(self):
        return f"{self.usuario} - {self.referencia}"

    class Meta:
        verbose_name = "pago"
        verbose_name_plural = "pagos"


class Constancia(models.Model):
    """Constancia: catálogo de constancias que se pueden emitir."""

    nombre = models.CharField(max_length=100, unique=True, verbose_name="nombre de la constancia")

    def __str__(self):
        return self.nombre

    class Meta:
        verbose_name = "constancia"
        verbose_name_plural = "constancias"
        ordering = ["nombre"]


class CampusCongreso(models.Model):
    """Sede física o virtual donde se realiza el congreso (campo 1, campo 4, campo virtual...)."""

    nombre = models.CharField(max_length=100, unique=True, verbose_name="nombre de la sede")

    def __str__(self):
        return self.nombre

    class Meta:
        verbose_name = "campus del congreso"
        verbose_name_plural = "campus del congreso"
        ordering = ["nombre"]


class Edificio(models.Model):
    """Edificio de un campus del congreso."""

    campus = models.ForeignKey(CampusCongreso, on_delete=models.PROTECT, related_name="edificios", verbose_name="campus")
    nombre = models.CharField(max_length=100, verbose_name="nombre del edificio")

    def __str__(self):
        return f"{self.nombre} - {self.campus}"

    class Meta:
        verbose_name = "edificio"
        verbose_name_plural = "edificios"
        ordering = ["nombre"]
        constraints = [models.UniqueConstraint(fields=["campus", "nombre"], name="unico_edificio_por_campus")]


class Aula(models.Model):
    """Aula de un edificio."""

    edificio = models.ForeignKey(Edificio, on_delete=models.PROTECT, related_name="aulas", verbose_name="edificio")
    nombre = models.CharField(max_length=100, verbose_name="nombre del aula")
    capacidad = models.PositiveIntegerField(validators=[MinValueValidator(1)], verbose_name="capacidad")

    def __str__(self):
        return f"{self.nombre} - {self.edificio.nombre}"

    class Meta:
        verbose_name = "aula"
        verbose_name_plural = "aulas"
        ordering = ["nombre"]
        constraints = [models.UniqueConstraint(fields=["edificio", "nombre"], name="unico_aula_por_edificio")]


class Comite(models.Model):
    """Comité."""

    nombre = models.CharField(max_length=100, unique=True, verbose_name="nombre del comité")
    descripcion = models.CharField(max_length=255, blank=True, verbose_name="descripción")

    def __str__(self):
        return self.nombre

    class Meta:
        verbose_name = "comité"
        verbose_name_plural = "comités"
        ordering = ["nombre"]


class UsuarioComite(models.Model):
    """Usuarios de un comité (UsuarioComite)."""

    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="comites", verbose_name="usuario")
    comite = models.ForeignKey(Comite, on_delete=models.PROTECT, related_name="miembros", verbose_name="comité")

    def __str__(self):
        return f"{self.usuario} - {self.comite}"

    class Meta:
        verbose_name = "miembro de comité"
        verbose_name_plural = "miembros de comité"
        constraints = [models.UniqueConstraint(fields=["usuario", "comite"], name="unico_usuario_comite")]
