"""Modelos de trabajos, evaluación, horarios y asistencia (borrador local, Diccionario CONING)."""
from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models, transaction
from django.utils import timezone


class Fase(models.Model):
    """Fase: paso por el que avanza un trabajo dentro de su actividad."""

    actividad = models.ForeignKey("congreso.Actividad", on_delete=models.PROTECT, related_name="fases", verbose_name="actividad")
    nombre = models.CharField(max_length=100, verbose_name="nombre de la fase")
    descripcion = models.CharField(max_length=255, blank=True, verbose_name="descripción")
    secuencia = models.PositiveIntegerField(validators=[MinValueValidator(1)], verbose_name="secuencia")
    activa = models.BooleanField(default=True, verbose_name="activa")

    def __str__(self):
        return f"{self.actividad} · {self.secuencia}. {self.nombre}"

    class Meta:
        verbose_name = "fase"
        verbose_name_plural = "fases"
        ordering = ["actividad", "secuencia"]


class Pregunta(models.Model):
    """Pregunta de evaluación de una fase."""

    fase = models.ForeignKey(Fase, on_delete=models.PROTECT, related_name="preguntas", verbose_name="fase")
    texto = models.CharField(max_length=500, verbose_name="pregunta")
    activa = models.BooleanField(default=True, verbose_name="activa")

    def __str__(self):
        return self.texto[:60]

    class Meta:
        verbose_name = "pregunta"
        verbose_name_plural = "preguntas"


class Documento(models.Model):
    """Tipo de documento que se adjunta a un trabajo."""

    nombre = models.CharField(max_length=100, unique=True, verbose_name="nombre del documento")
    descripcion = models.CharField(max_length=255, blank=True, verbose_name="descripción")
    tipo_documento = models.CharField(max_length=50, verbose_name="tipo de documento")

    def __str__(self):
        return self.nombre

    class Meta:
        verbose_name = "documento"
        verbose_name_plural = "documentos"
        ordering = ["nombre"]


class Trabajo(models.Model):
    """Trabajo enviado a un congreso.

    BORRADOR: para presentar un trabajo el usuario debe tener el perfil completo;
    esa regla va en la API, no en el modelo.
    """

    congreso = models.ForeignKey("congreso.Congreso", on_delete=models.PROTECT, related_name="trabajos", verbose_name="congreso")
    actividad = models.ForeignKey("congreso.Actividad", on_delete=models.PROTECT, related_name="trabajos", verbose_name="actividad")
    area = models.ForeignKey("catalogs.Area", on_delete=models.PROTECT, related_name="trabajos", verbose_name="área")
    fase = models.ForeignKey(Fase, on_delete=models.PROTECT, related_name="trabajos", verbose_name="fase actual")
    clave = models.CharField(max_length=20, unique=True, editable=False, verbose_name="clave del trabajo")
    titulo = models.CharField(max_length=250, verbose_name="título")
    resumen = models.CharField(max_length=2000, verbose_name="resumen")
    palabras_clave = models.CharField(max_length=200, verbose_name="palabras clave")
    expuesto = models.BooleanField(default=False, verbose_name="expuesto")
    fecha_registro = models.DateTimeField(default=timezone.now, verbose_name="fecha de registro")
    # BORRADOR: no está en el diccionario; guarda el motivo que escribe el comité al dictaminar el resumen.
    observaciones = models.TextField(blank=True, verbose_name="observaciones del comité")

    def save(self, *args, **kwargs):
        # Clave generada por el sistema (borrador): T000001, T000002...
        if not self.clave:
            with transaction.atomic():
                self.clave = f"tmp-{timezone.now().timestamp():.6f}"[:20]
                super().save(*args, **kwargs)
                self.clave = f"T{self.pk:06d}"
                super().save(update_fields=["clave"])
            return
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.clave} - {self.titulo[:50]}"

    class Meta:
        verbose_name = "trabajo"
        verbose_name_plural = "trabajos"
        ordering = ["-fecha_registro"]


class TrabajoDocumento(models.Model):
    """Documentos de un trabajo (TrabajoDocumento)."""

    trabajo = models.ForeignKey(Trabajo, on_delete=models.CASCADE, related_name="documentos", verbose_name="trabajo")
    documento = models.ForeignKey(Documento, on_delete=models.PROTECT, related_name="trabajos", verbose_name="documento")
    contenido = models.FileField(upload_to="trabajos/documentos/", verbose_name="archivo")

    def __str__(self):
        return f"{self.trabajo.clave} - {self.documento}"

    class Meta:
        verbose_name = "documento del trabajo"
        verbose_name_plural = "documentos del trabajo"
        constraints = [models.UniqueConstraint(fields=["trabajo", "documento"], name="unico_trabajo_documento")]


class UsuarioTrabajo(models.Model):
    """Autores de un trabajo. Quien entrega el trabajo es el autor; el resto, coautores."""

    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="autorias", verbose_name="usuario")
    trabajo = models.ForeignKey(Trabajo, on_delete=models.CASCADE, related_name="autores", verbose_name="trabajo")
    es_autor = models.BooleanField(default=False, verbose_name="autor (no coautor)")
    orden_autor = models.PositiveIntegerField(validators=[MinValueValidator(1)], verbose_name="orden de autoría")

    def __str__(self):
        return f"{self.usuario} - {self.trabajo.clave}"

    class Meta:
        verbose_name = "autor del trabajo"
        verbose_name_plural = "autores del trabajo"
        ordering = ["trabajo", "orden_autor"]
        constraints = [models.UniqueConstraint(fields=["usuario", "trabajo"], name="unico_usuario_trabajo")]


class Evaluador(models.Model):
    """Asignación de un evaluador a un trabajo."""

    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="evaluaciones", verbose_name="evaluador")
    trabajo = models.ForeignKey(Trabajo, on_delete=models.CASCADE, related_name="evaluadores", verbose_name="trabajo")
    numero = models.PositiveIntegerField(validators=[MinValueValidator(1)], verbose_name="número de evaluador")
    # BORRADOR (23-nov-2026): el mismo evaluador revisa el resumen y luego el extenso; cada vuelta al ponente abre una ronda nueva.
    etapa = models.CharField(max_length=10, choices=[("resumen", "Resumen"), ("extenso", "Extenso")], default="resumen", verbose_name="etapa")
    ronda = models.PositiveIntegerField(default=1, verbose_name="ronda")
    dictamen = models.CharField(max_length=50, null=True, blank=True, verbose_name="dictamen")
    # BORRADOR: campos que no están en el diccionario, los usa el módulo del evaluador.
    comentario = models.TextField(blank=True, verbose_name="comentario general")
    fecha_asignacion = models.DateTimeField(default=timezone.now, verbose_name="fecha de asignación")
    fecha_limite = models.DateTimeField(null=True, blank=True, verbose_name="fecha límite")
    fecha_envio = models.DateTimeField(null=True, blank=True, verbose_name="fecha de envío")

    def __str__(self):
        return f"{self.usuario} evalúa {self.trabajo.clave}"

    class Meta:
        verbose_name = "evaluador asignado"
        verbose_name_plural = "evaluadores asignados"
        constraints = [models.UniqueConstraint(fields=["usuario", "trabajo", "etapa", "ronda"], name="unico_evaluador_trabajo_etapa_ronda")]


class TrabajoPregunta(models.Model):
    """Respuesta de un evaluador a una pregunta sobre un trabajo."""

    class Respuesta(models.TextChoices):
        SI = "Sí", "Sí"
        NO = "No", "No"

    trabajo = models.ForeignKey(Trabajo, on_delete=models.CASCADE, related_name="respuestas", verbose_name="trabajo")
    pregunta = models.ForeignKey(Pregunta, on_delete=models.PROTECT, related_name="respuestas", verbose_name="pregunta")
    evaluador = models.ForeignKey(Evaluador, on_delete=models.PROTECT, related_name="respuestas", verbose_name="evaluador")
    fecha = models.DateTimeField(default=timezone.now, verbose_name="fecha")
    respuesta = models.CharField(max_length=2, choices=Respuesta.choices, null=True, blank=True, verbose_name="respuesta")
    observacion = models.TextField(null=True, blank=True, verbose_name="observación")

    def __str__(self):
        return f"{self.trabajo.clave} - {self.pregunta}"

    class Meta:
        verbose_name = "respuesta de evaluación"
        verbose_name_plural = "respuestas de evaluación"
        constraints = [models.UniqueConstraint(fields=["trabajo", "pregunta", "evaluador"], name="unico_trabajo_pregunta_evaluador")]


class Horario(models.Model):
    """Programación de la presentación de un trabajo."""

    aula = models.ForeignKey("congreso.Aula", on_delete=models.PROTECT, related_name="horarios", verbose_name="aula")
    trabajo = models.ForeignKey(Trabajo, on_delete=models.CASCADE, related_name="horarios", verbose_name="trabajo")
    fecha = models.DateField(verbose_name="fecha")
    hora_inicio = models.TimeField(verbose_name="hora de inicio")
    hora_fin = models.TimeField(verbose_name="hora de fin")

    def __str__(self):
        return f"{self.trabajo.clave} {self.fecha} {self.hora_inicio}"

    class Meta:
        verbose_name = "horario"
        verbose_name_plural = "horarios"
        ordering = ["fecha", "hora_inicio"]
        constraints = [models.CheckConstraint(condition=models.Q(hora_fin__gt=models.F("hora_inicio")), name="check_horario_horas")]


class Asistencia(models.Model):
    """Asistencia de un usuario a un trabajo de un congreso."""

    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="asistencias", verbose_name="usuario")
    congreso = models.ForeignKey("congreso.Congreso", on_delete=models.CASCADE, related_name="asistencias", verbose_name="congreso")
    trabajo = models.ForeignKey(Trabajo, on_delete=models.CASCADE, related_name="asistencias", verbose_name="trabajo")
    fecha_hora = models.DateTimeField(default=timezone.now, verbose_name="fecha y hora")

    def __str__(self):
        return f"{self.usuario} - {self.trabajo.clave}"

    class Meta:
        verbose_name = "asistencia"
        verbose_name_plural = "asistencias"
        constraints = [models.UniqueConstraint(fields=["usuario", "congreso", "trabajo"], name="unica_asistencia")]


class AutorizacionConstancia(models.Model):
    """Autorización del administrador para liberar la constancia de una persona en un trabajo.

    BORRADOR (no está en el diccionario): minuta del 1-oct-2026, «toda liberación de constancias pasa por la autorización formal del
    Administrador». Además de culminar el trabajo y tener el pago validado, la constancia solo se libera si existe esta fila.
    """

    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="constancias_autorizadas", verbose_name="usuario")
    trabajo = models.ForeignKey(Trabajo, on_delete=models.CASCADE, related_name="constancias_autorizadas", verbose_name="trabajo")
    autorizada_por = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="constancias_que_autorizo", verbose_name="autorizada por")
    fecha_autorizacion = models.DateTimeField(default=timezone.now, verbose_name="fecha de autorización")

    def __str__(self):
        return f"{self.usuario} - {self.trabajo.clave}"

    class Meta:
        verbose_name = "autorización de constancia"
        verbose_name_plural = "autorizaciones de constancias"
        constraints = [models.UniqueConstraint(fields=["usuario", "trabajo"], name="unica_autorizacion_constancia")]

