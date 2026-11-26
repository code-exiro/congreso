# backend/catalogs/admin.py

from django.contrib import admin

from .models import (
    AcademicLevel,
    AcademicStatus,
    Area,
    Campus,
    Country,
    DialingCode,
    Institution,
    State,
)


@admin.register(Country)
class CountryAdmin(admin.ModelAdmin):
    list_display = ("id", "name")
    search_fields = ("name",)


@admin.register(State)
class StateAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "country")
    list_filter = ("country",)
    search_fields = ("name", "country__name")


@admin.register(AcademicLevel)
class AcademicLevelAdmin(admin.ModelAdmin):
    list_display = ("id", "degree", "description")
    search_fields = ("degree",)


@admin.register(AcademicStatus)
class AcademicStatusAdmin(admin.ModelAdmin):
    list_display = ("id", "code", "name")
    search_fields = ("code", "name")


@admin.register(Area)
class AreaAdmin(admin.ModelAdmin):
    list_display = ("id", "code", "name")
    search_fields = ("code", "name")


@admin.register(Institution)
class InstitutionAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "acronym")
    search_fields = ("name", "acronym")


@admin.register(Campus)
class CampusAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "acronym", "institution")
    list_filter = ("institution",)
    search_fields = ("name", "acronym", "institution__name")


@admin.register(DialingCode)
class DialingCodeAdmin(admin.ModelAdmin):
    list_display = ("id", "code", "country_name", "country")
    search_fields = ("code", "country_name")
