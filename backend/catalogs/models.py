# backend/catalogs/models.py

from django.db import models


class Country(models.Model):
    name = models.CharField(
        max_length=150,
        unique=True,
        verbose_name="nombre del país",
    )

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "país"
        verbose_name_plural = "países"
        ordering = ["name"]


class State(models.Model):
    country = models.ForeignKey(
        Country,
        on_delete=models.PROTECT,
        related_name="states",
        verbose_name="país",
    )

    name = models.CharField(
        max_length=150,
        verbose_name="nombre del estado",
    )

    def __str__(self):
        return f"{self.name}, {self.country.name}"

    class Meta:
        verbose_name = "estado"
        verbose_name_plural = "estados"
        ordering = ["name"]

        constraints = [
            models.UniqueConstraint(
                fields=["country", "name"],
                name="unique_state_per_country",
            )
        ]


class AcademicLevel(models.Model):
    degree = models.CharField(
        max_length=150,
        unique=True,
        verbose_name="grado académico",
    )

    description = models.TextField(
        blank=True,
        verbose_name="descripción",
    )

    def __str__(self):
        return self.degree

    class Meta:
        verbose_name = "nivel académico"
        verbose_name_plural = "niveles académicos"
        ordering = ["degree"]


class Area(models.Model):
    code = models.CharField(
        max_length=50,
        unique=True,
        verbose_name="clave del área",
    )

    name = models.CharField(
        max_length=200,
        verbose_name="nombre del área",
    )

    def __str__(self):
        return f"{self.code} - {self.name}"

    class Meta:
        verbose_name = "área"
        verbose_name_plural = "áreas"
        ordering = ["name"]


class Institution(models.Model):
    name = models.CharField(
        max_length=255,
        unique=True,
        verbose_name="nombre de la institución",
    )

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "institución"
        verbose_name_plural = "instituciones"
        ordering = ["name"]