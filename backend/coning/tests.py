from datetime import date
from pathlib import Path
from tempfile import TemporaryDirectory

from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import connection
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from users.models import Privilege, User, UserPrivilege

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


class LandingAdminUpdateViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="landing-editor@example.invalid",
            password="test-password",
        )
        privilege, _ = Privilege.objects.get_or_create(
            code="diseño_pagina",
            defaults={
                "name": "Personalizar la página",
                "description": "Editar la landing del congreso.",
            },
        )
        UserPrivilege.objects.create(user=self.user, privilege=privilege)
        self.client.force_authenticate(user=self.user)

    @staticmethod
    def create_congress(edition, name):
        return Congreso.objects.create(
            edicion_congreso=edition,
            nombre_congreso=name,
            correo_congreso=f"contacto{edition}@example.invalid",
            contrasena_aplicacion="not-public",
        )

    def test_update_changes_only_the_current_congress(self):
        previous = self.create_congress(20, "Congreso anterior")
        current = self.create_congress(21, "Congreso vigente")

        response = self.client.patch(
            "/api/landing/admin/congress/",
            {"name": "Congreso actualizado", "address": "Nueva dirección"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        previous.refresh_from_db()
        current.refresh_from_db()
        self.assertEqual(previous.nombre_congreso, "Congreso anterior")
        self.assertEqual(current.nombre_congreso, "Congreso actualizado")
        self.assertEqual(current.direccion_sede, "Nueva dirección")

    def test_page_image_and_theme_are_saved_for_the_current_congress(self):
        previous = self.create_congress(20, "Congreso anterior")
        current = self.create_congress(21, "Congreso vigente")
        previous_page = Pagina.objects.create(congreso=previous, banner="/images/previous.png")
        with TemporaryDirectory() as media_root:
            with override_settings(MEDIA_ROOT=media_root):
                response = self.client.patch(
                    "/api/landing/admin/page/",
                    {
                        "banner": SimpleUploadedFile(
                            "banner.png",
                            b"landing-page-image",
                            content_type="image/png",
                        ),
                        "color": "#112233",
                    },
                    format="multipart",
                )

        self.assertEqual(response.status_code, 200)
        current_page = Pagina.objects.get(congreso=current)
        self.assertTrue(current_page.banner.startswith(f"landing/congress_{current.pk}/"))
        self.assertEqual(current_page.color_banner, "#112233")
        self.assertEqual(response.json()["page"]["banner"], f"/media/{current_page.banner}")
        previous_page.refresh_from_db()
        self.assertEqual(previous_page.banner, "/images/previous.png")

    def test_dates_are_scoped_to_current_congress_and_support_create_update_delete(self):
        previous = self.create_congress(20, "Congreso anterior")
        current = self.create_congress(21, "Congreso vigente")
        previous_date = FechaImportante.objects.create(nombre_fecha="Fecha anterior")
        CongresoFecha.objects.create(
            congreso=previous,
            fecha=previous_date,
            fecha_inicio=date(2026, 8, 1),
        )
        current_date = FechaImportante.objects.create(nombre_fecha="Fecha actual")
        CongresoFecha.objects.create(
            congreso=current,
            fecha=current_date,
            fecha_inicio=date(2026, 8, 2),
        )

        rejected = self.client.patch(
            f"/api/landing/admin/dates/{previous_date.pk}/",
            {"title": "No modificar"},
            format="json",
        )
        self.assertEqual(rejected.status_code, 404)
        self.assertEqual(previous_date.nombre_fecha, "Fecha anterior")

        updated = self.client.patch(
            f"/api/landing/admin/dates/{current_date.pk}/",
            {"title": "Fecha actualizada", "endDate": "2026-08-05"},
            format="json",
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.json()["date"]["title"], "Fecha actualizada")

        created = self.client.post(
            "/api/landing/admin/dates/",
            {"title": "Nueva fecha", "startDate": "2026-09-01"},
            format="json",
        )
        self.assertEqual(created.status_code, 201)
        created_id = created.json()["date"]["id"]
        self.assertEqual(created.json()["date"]["endDate"], "2026-09-01")
        deleted = self.client.delete(f"/api/landing/admin/dates/{created_id}/")
        self.assertEqual(deleted.status_code, 204)
        self.assertFalse(CongresoFecha.objects.filter(congreso=current, fecha_id=created_id).exists())
        self.assertEqual(CongresoFecha.objects.filter(congreso=previous).count(), 1)

    def test_shared_sponsor_is_copied_before_current_congress_edit(self):
        previous = self.create_congress(20, "Congreso anterior")
        current = self.create_congress(21, "Congreso vigente")
        sponsor_type = TipoPatrocinador.objects.create(nombre_tipopa="Institucional")
        shared_sponsor = Patrocinador.objects.create(
            tipopa=sponsor_type,
            nombre_patrocinador="Patrocinador compartido",
            logo_patrocinador="/media/shared.png",
        )
        CongresoPatrocinador.objects.create(congreso=previous, patrocinador=shared_sponsor)
        CongresoPatrocinador.objects.create(congreso=current, patrocinador=shared_sponsor)

        response = self.client.patch(
            f"/api/landing/admin/sponsors/{shared_sponsor.pk}/",
            {"name": "Solo edición vigente"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        updated_id = response.json()["sponsor"]["id"]
        self.assertNotEqual(updated_id, shared_sponsor.pk)
        shared_sponsor.refresh_from_db()
        self.assertEqual(shared_sponsor.nombre_patrocinador, "Patrocinador compartido")
        self.assertTrue(
            CongresoPatrocinador.objects.filter(
                congreso=previous,
                patrocinador=shared_sponsor,
            ).exists()
        )
        self.assertTrue(
            CongresoPatrocinador.objects.filter(
                congreso=current,
                patrocinador_id=updated_id,
            ).exists()
        )
        created = self.client.post(
            "/api/landing/admin/sponsors/",
            {"name": "Patrocinador nuevo", "src": "/images/new-sponsor.png"},
            format="json",
        )
        self.assertEqual(created.status_code, 201)
        new_id = created.json()["sponsor"]["id"]
        deleted = self.client.delete(f"/api/landing/admin/sponsors/{new_id}/")
        self.assertEqual(deleted.status_code, 204)
        self.assertFalse(Patrocinador.objects.filter(pk=new_id).exists())
        self.assertTrue(
            CongresoPatrocinador.objects.filter(
                congreso=previous,
                patrocinador=shared_sponsor,
            ).exists()
        )

    def test_landing_updates_require_the_page_design_privilege(self):
        self.client.force_authenticate(user=User.objects.create_user(
            email="without-privilege@example.invalid",
            password="test-password",
        ))
        self.create_congress(21, "Congreso vigente")

        response = self.client.patch(
            "/api/landing/admin/page/",
            {"color": "#112233"},
            format="json",
        )

        self.assertEqual(response.status_code, 403)
