"""Modelos de soporte / tickets (borrador local, Diccionario CONING)."""
from django.conf import settings
from django.db import models
from django.utils import timezone


class CategoriaTicket(models.Model):
    """Categoría de ticket."""

    nombre = models.CharField(max_length=100, unique=True, verbose_name="categoría")
    descripcion = models.CharField(max_length=255, blank=True, verbose_name="descripción")

    def __str__(self):
        return self.nombre

    class Meta:
        verbose_name = "categoría de ticket"
        verbose_name_plural = "categorías de ticket"
        ordering = ["nombre"]


class Ticket(models.Model):
    """Tipo de solicitud de soporte, por categoría."""

    nombre = models.CharField(max_length=100, verbose_name="nombre del ticket")
    descripcion = models.CharField(max_length=255, blank=True, verbose_name="descripción")
    categoria = models.ForeignKey(CategoriaTicket, on_delete=models.PROTECT, related_name="tickets", verbose_name="categoría")

    def __str__(self):
        return self.nombre

    class Meta:
        verbose_name = "ticket"
        verbose_name_plural = "tickets"
        ordering = ["nombre"]


class TicketUsuario(models.Model):
    """Tickets que levanta un usuario."""

    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name="tickets_usuario", verbose_name="ticket")
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="tickets", verbose_name="usuario")
    descripcion = models.CharField(max_length=255, verbose_name="descripción del problema")
    fecha_expedicion = models.DateTimeField(default=timezone.now, verbose_name="fecha de expedición")
    fecha_cierre = models.DateTimeField(null=True, blank=True, verbose_name="fecha de cierre")
    estatus = models.CharField(max_length=20, verbose_name="estatus")
    respuesta = models.TextField(null=True, blank=True, verbose_name="respuesta")

    def __str__(self):
        return f"{self.ticket} - {self.usuario}"

    class Meta:
        verbose_name = "ticket de usuario"
        verbose_name_plural = "tickets de usuario"
        ordering = ["-fecha_expedicion"]
        constraints = [
            models.UniqueConstraint(fields=["ticket", "usuario"], name="unico_ticket_usuario"),
            models.CheckConstraint(
                condition=models.Q(fecha_cierre__isnull=True) | models.Q(fecha_cierre__gte=models.F("fecha_expedicion")),
                name="check_fechas_ticket",
            ),
        ]
