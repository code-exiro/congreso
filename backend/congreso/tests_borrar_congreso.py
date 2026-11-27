from io import StringIO

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase

from congreso.models import Congreso


class BorrarCongresoTests(TestCase):
    def setUp(self):
        for ed in (21, 99):
            Congreso.objects.create(
                nombre_congreso="CONING", edicion_congreso=ed, modalidad_congreso="Online",
                correo_congreso="c@x.com", contrasena_aplicacion="x", contacto_correo="c@x.com", contacto_telefono="5555555555",
            )

    def test_sin_confirmar_no_borra(self):
        call_command("borrar_congreso", 99, stdout=StringIO())
        self.assertTrue(Congreso.objects.filter(edicion_congreso=99).exists())

    def test_con_confirmacion_borra_solo_esa_edicion(self):
        call_command("borrar_congreso", 99, "--si", stdout=StringIO())
        self.assertFalse(Congreso.objects.filter(edicion_congreso=99).exists())
        self.assertTrue(Congreso.objects.filter(edicion_congreso=21).exists())

    def test_edicion_inexistente(self):
        with self.assertRaises(CommandError):
            call_command("borrar_congreso", 7, stdout=StringIO())

    def test_con_trabajos_protegidos(self):
        from django.contrib.auth import get_user_model
        from trabajos.models import Trabajo
        c = Congreso.objects.get(edicion_congreso=99)
        with self.assertRaises(CommandError):
            # sin trabajos no falla; con un trabajo, Django lo protege
            from unittest import mock
            from django.db.models import ProtectedError
            with mock.patch("django.db.models.deletion.Collector.collect", side_effect=ProtectedError("x", [])):
                call_command("borrar_congreso", 99, "--si", stdout=StringIO())
        self.assertTrue(Congreso.objects.filter(pk=c.pk).exists())

