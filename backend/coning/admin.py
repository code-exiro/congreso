from django.contrib import admin

from .models import (
    Actividad,
    Area,
    Congreso,
    Documento,
    FechaImportante,
    Pagina,
    Patrocinador,
    TipoPatrocinador,
)


@admin.register(Congreso)
class CongresoAdmin(admin.ModelAdmin):
    list_display = ("id_congreso", "edicion_congreso", "nombre_congreso", "modalidad_congreso")
    search_fields = ("nombre_congreso", "correo_congreso")


@admin.register(Pagina)
class PaginaAdmin(admin.ModelAdmin):
    list_display = ("id_pagina", "congreso", "color_banner")
    list_select_related = ("congreso",)


@admin.register(FechaImportante)
class FechaImportanteAdmin(admin.ModelAdmin):
    list_display = ("id_fecha", "nombre_fecha")
    search_fields = ("nombre_fecha",)


@admin.register(TipoPatrocinador)
class TipoPatrocinadorAdmin(admin.ModelAdmin):
    list_display = ("id_tipopa", "nombre_tipopa")
    search_fields = ("nombre_tipopa",)


@admin.register(Patrocinador)
class PatrocinadorAdmin(admin.ModelAdmin):
    list_display = ("id_patrocinador", "nombre_patrocinador", "tipopa", "activo")
    list_filter = ("activo", "tipopa")
    search_fields = ("nombre_patrocinador",)


@admin.register(Actividad)
class ActividadAdmin(admin.ModelAdmin):
    list_display = ("id_actividad", "nombre_actividad", "num_evaluadores")
    search_fields = ("nombre_actividad",)


@admin.register(Area)
class AreaAdmin(admin.ModelAdmin):
    list_display = ("id_area", "clave_area", "nombre_area")
    search_fields = ("clave_area", "nombre_area")


@admin.register(Documento)
class DocumentoAdmin(admin.ModelAdmin):
    list_display = ("id_documento", "nombre_documento", "tipo_documento")
    search_fields = ("nombre_documento",)
