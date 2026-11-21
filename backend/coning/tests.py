from datetime import date
from pathlib import Path

from django.db import connection
from django.test import TestCase

from .models import (
    Congreso,
    CongresoFecha,
    CongresoPatrocinador,
    FechaImportante,
    Pagina,
    Patrocinador,
    TipoPatrocinador,
)


class LandingDataViewTests(TestCase):
    def test_returns_public_congress_page_dates_and_sponsors(self):
        congreso = Congreso.objects.create(
            edicion_congreso=21,
            nombre_congreso="Congreso de prueba",
            correo_congreso="contacto@example.invalid",
            contrasena_aplicacion="must-not-be-public",
            descripcion_congreso="Descripción de prueba",
            fecha_cierre_registro="Hasta el 15 de agosto de 2026",
            ubicacion_sede="Auditorio de prueba",
            direccion_sede="Dirección de prueba",
            google_maps_query="Lugar de prueba",
        )
        Pagina.objects.create(
            congreso=congreso,
            banner="/media/banner.jpg",
            enlace_programa="https://example.invalid/programa.pdf",
            color_banner="#e2c275",
        )

        fecha = FechaImportante.objects.create(nombre_fecha="Recepción de trabajos")
        CongresoFecha.objects.create(
            congreso=congreso,
            fecha=fecha,
            fecha_inicio=date(2026, 8, 1),
            fecha_fin=date(2026, 8, 15),
        )

        tipo = TipoPatrocinador.objects.create(nombre_tipopa="Institucional")
        patrocinador = Patrocinador.objects.create(
            tipopa=tipo,
            nombre_patrocinador="Patrocinador de prueba",
            logo_patrocinador="/media/sponsor.png",
        )
        CongresoPatrocinador.objects.create(
            congreso=congreso,
            patrocinador=patrocinador,
        )

        response = self.client.get("/api/landing/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["congress"]["name"], "Congreso de prueba")
        self.assertEqual(payload["congress"]["description"], "Descripción de prueba")
        self.assertEqual(
            payload["congress"]["registrationDate"],
            "Hasta el 15 de agosto de 2026",
        )
        self.assertEqual(payload["congress"]["mapQuery"], "Lugar de prueba")
        self.assertNotIn("contrasena_aplicacion", payload["congress"])
        self.assertEqual(payload["page"]["banner"], "/media/banner.jpg")
        self.assertEqual(
            payload["page"]["programUrl"],
            "https://example.invalid/programa.pdf",
        )
        self.assertEqual(payload["page"]["color"], "#e2c275")
        self.assertEqual(payload["dates"][0]["title"], "Recepción de trabajos")
        self.assertEqual(payload["dates"][0]["startDate"], "2026-08-01")
        self.assertEqual(payload["sponsors"][0]["name"], "Patrocinador de prueba")

    def test_returns_empty_landing_payload_when_database_has_no_congress(self):
        response = self.client.get("/api/landing/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["congress"], None)
        self.assertEqual(response.json()["dates"], [])
        self.assertEqual(response.json()["sponsors"], [])

    def test_demo_seed_sql_is_repeatable_and_populates_landing_data(self):
        seed_sql = Path(__file__).with_name("seed_landing_demo.sql").read_text(encoding="utf-8")
        seed_sql = seed_sql.split("BEGIN;", 1)[1].rsplit("COMMIT;", 1)[0].strip()

        with connection.cursor() as cursor:
            cursor.execute(seed_sql)
            cursor.execute(seed_sql)

        congreso = Congreso.objects.get(
            contrasena_aplicacion="CONING_DEMO_SEED_DO_NOT_USE"
        )
        self.assertEqual(CongresoFecha.objects.filter(congreso=congreso).count(), 6)
        self.assertEqual(CongresoPatrocinador.objects.filter(congreso=congreso).count(), 7)

        payload = self.client.get("/api/landing/").json()
        self.assertEqual(payload["congress"]["edition"], 21)
        self.assertEqual(payload["page"]["banner"], "/images/banner.png")
        self.assertEqual(
            payload["page"]["programUrl"],
            "https://drive.google.com/file/d/102ty8mj66WZt_9K38OAIrLCboKtBrAdU/view?usp=drive_link",
        )
        self.assertEqual(len(payload["dates"]), 6)
        self.assertEqual(len(payload["sponsors"]), 7)
