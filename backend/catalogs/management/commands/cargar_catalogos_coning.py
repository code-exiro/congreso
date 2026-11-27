"""Carga los catálogos oficiales de la hoja «Catalogos CONING» (datos en catalogs/data/catalogos_coning.json).

Los catálogos de usuario (países, estados, instituciones, campus, niveles, áreas, ladas) y de congreso
(patrocinadores, documentos, fases, actividades, cuotas, sedes, edificios y aulas) conservan los ids de la hoja.
Es idempotente. Si ya hay catálogos de usuario distintos (los temporales anteriores), pide --reemplazar.
"""
import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import connection, transaction
from django.db.models import ProtectedError
from django.core.management.color import no_style

from catalogs.models import AcademicLevel, Area, Campus, Country, Institution, Lada, State
from congreso.models import (
    Actividad, Aula, CampusCongreso, ConceptoCuota, Edificio, FechaImportante,
    LimiteTrabajo, Patrocinador, TipoPatrocinador,
)
from trabajos.models import Documento, Fase, Pregunta
from users.models import Profile

DATOS = Path(__file__).resolve().parents[2] / "data" / "catalogos_coning.json"


def _guardar(modelo, filas):
    """Upsert por pk conservando los ids de la hoja."""
    for pk, campos in filas:
        modelo.objects.update_or_create(pk=pk, defaults=campos)


def _quitar_sobrantes(modelo, ids_hoja):
    """Borra filas de catálogo que no están en la hoja (p. ej. datos de prueba) si nadie las usa."""
    for obj in modelo.objects.exclude(pk__in=ids_hoja):
        try:
            obj.delete()
        except ProtectedError:
            pass


class Command(BaseCommand):
    help = "Carga los catálogos de la hoja «Catalogos CONING» (idempotente)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reemplazar", action="store_true",
            help="Reemplaza los catálogos de usuario existentes (los temporales); limpia el estado/institución/nivel de los perfiles.",
        )

    def handle(self, *args, **opts):
        d = json.loads(DATOS.read_text(encoding="utf-8"))

        previos = any(m.objects.exists() for m in (Country, State, Institution, AcademicLevel))
        ya_cargado = Country.objects.filter(pk=d["paises"][0]["id"], name=d["paises"][0]["nombre"]).exists()
        if previos and not ya_cargado:
            if not opts["reemplazar"]:
                raise CommandError(
                    "Ya hay catálogos de usuario distintos a los de la hoja (los temporales). "
                    "Si es una base local de pruebas, corre de nuevo con --reemplazar."
                )

        with transaction.atomic():
            if previos and not ya_cargado:
                n = Profile.objects.update(state=None, institution=None, academic_level=None)
                Campus.objects.all().delete()
                State.objects.all().delete()
                Country.objects.all().delete()
                Institution.objects.all().delete()
                AcademicLevel.objects.all().delete()
                self.stdout.write(f"Catálogos temporales reemplazados; {n} perfiles sin estado/institución/nivel (se vuelven a elegir).")

            _guardar(Country, [(r["id"], {"name": r["nombre"]}) for r in d["paises"]])
            _guardar(State, [(r["id"], {"country_id": r["pais_id"], "name": r["nombre"]}) for r in d["estados"]])
            _guardar(Institution, [(r["id"], {"name": r["nombre"], "acronym": r["acronimo"]}) for r in d["instituciones"]])
            _guardar(Campus, [(r["id"], {"institution_id": r["institucion_id"], "name": r["nombre"], "acronym": r["acronimo"]}) for r in d["campus"]])
            _guardar(AcademicLevel, [(r["id"], {"degree": r["grado"], "description": r["descripcion"]}) for r in d["niveles"]])
            _guardar(Lada, [(r["id"], {"digitos": r["digitos"], "pais": r["pais"]}) for r in d["ladas"]])
            for r in d["areas"]:
                Area.objects.update_or_create(code=r["clave"], defaults={"name": r["nombre"]})

            # --- Congreso ---
            _guardar(TipoPatrocinador, [(r["id"], {"nombre": r["nombre"]}) for r in d["tipos_patrocinador"]])
            _guardar(Patrocinador, [(r["id"], {"nombre": r["nombre"], "tipo_id": r["tipo_id"], "activo": r["activo"]}) for r in d["patrocinadores"]])
            _guardar(ConceptoCuota, [(r["id"], {"nombre": r["nombre"]}) for r in d["conceptos_cuota"]])
            _guardar(Actividad, [(r["id"], {"nombre": r["nombre"], "evaluadores_por_trabajo": r["evaluadores"]}) for r in d["actividades"]])
            for r in d["limites_trabajo"]:
                LimiteTrabajo.objects.update_or_create(actividad_id=r["actividad_id"], defaults={"limite": r["limite"]})
            _guardar(CampusCongreso, [(r["id"], {"nombre": r["nombre"]}) for r in d["campus_congreso"]])
            _guardar(Edificio, [(r["id"], {"campus_id": r["campus_id"], "nombre": r["nombre"]}) for r in d["edificios"]])
            _guardar(Aula, [(r["id"], {"edificio_id": r["edificio_id"], "nombre": r["nombre"], "capacidad": r["capacidad"]}) for r in d["aulas"]])
            for r in d["documentos"]:
                Documento.objects.update_or_create(nombre=r["nombre"], defaults={"descripcion": r["descripcion"], "tipo_documento": r["tipo"]})
            _guardar(Fase, [(r["id"], {"actividad_id": r["actividad_id"], "nombre": r["nombre"], "descripcion": r["descripcion"], "secuencia": r["secuencia"], "activa": r["activa"]}) for r in d["fases"]])
            # Preguntas de evaluación: las de la fase 5 (extenso) son del diccionario; las de resumen son PROVISIONALES.
            _guardar(Pregunta, [(r["id"], {"fase_id": r["fase_id"], "texto": r["texto"], "activa": True}) for r in d.get("preguntas", [])])
            # La hoja no trae fechas importantes; se dejan las que usa el formulario.
            from congreso.ventanas import CATALOGO as fechas_proceso
            for nombre, descripcion in fechas_proceso.values():
                FechaImportante.objects.get_or_create(nombre=nombre, defaults={"descripcion": descripcion})

            # Quita los datos de prueba del seed anterior que no están en la hoja (si nadie los usa).
            _quitar_sobrantes(Patrocinador, [r["id"] for r in d["patrocinadores"]])
            _quitar_sobrantes(TipoPatrocinador, [r["id"] for r in d["tipos_patrocinador"]])
            _quitar_sobrantes(ConceptoCuota, [r["id"] for r in d["conceptos_cuota"]])
            _quitar_sobrantes(Actividad, [r["id"] for r in d["actividades"]])

            # Con ids explícitos hay que realinear las secuencias de PostgreSQL.
            modelos = [Country, State, Institution, Campus, AcademicLevel, Lada, Area, TipoPatrocinador, Patrocinador,
                       ConceptoCuota, Actividad, LimiteTrabajo, CampusCongreso, Edificio, Aula, Documento, Fase, Pregunta]
            with connection.cursor() as cur:
                for sql in connection.ops.sequence_reset_sql(no_style(), modelos):
                    cur.execute(sql)

        self.stdout.write(self.style.SUCCESS(
            f"Catálogos cargados: {len(d['paises'])} países, {len(d['estados'])} estados, "
            f"{len(d['instituciones'])} instituciones, {len(d['campus'])} campus, {len(d['ladas'])} ladas, "
            f"{len(d['areas'])} áreas, {len(d['niveles'])} niveles; congreso: {len(d['patrocinadores'])} patrocinadores, "
            f"{len(d['documentos'])} documentos, {len(d['fases'])} fases, {len(d['actividades'])} actividades."
        ))
