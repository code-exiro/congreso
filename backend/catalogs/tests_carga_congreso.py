from io import StringIO

from django.core.management import call_command
from django.test import TestCase

from catalogs.models import Campus, Country, DialingCode, Institution
from congreso.models import Actividad
from trabajos.models import Fase, Pregunta


class CargaSoloCongresoTests(TestCase):
    def test_solo_congreso_no_toca_los_catalogos_de_usuario(self):
        antes = (Country.objects.count(), Institution.objects.count(), Campus.objects.count(), DialingCode.objects.count())
        call_command("cargar_catalogos_coning", "--solo-congreso", stdout=StringIO())
        call_command("cargar_catalogos_coning", "--solo-congreso", stdout=StringIO())      # idempotente
        self.assertEqual(antes, (Country.objects.count(), Institution.objects.count(), Campus.objects.count(), DialingCode.objects.count()))
        self.assertTrue(Actividad.objects.exists() and Fase.objects.exists() and Pregunta.objects.exists())
