from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from .models import Role, SolicitudRol, UserRole
from .services import get_user_menus

U = get_user_model()
URL = "/api/solicitudes-rol/"


def rol(nombre):
    return Role.objects.get_or_create(name=nombre, defaults={"is_active": True})[0]


class SolicitudRolTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.ponente = U.objects.create_user(email="p@x.com", password="x12345678", first_name="Ana")
        UserRole.objects.create(user=cls.ponente, role=rol("ponente"))
        cls.coord = U.objects.create_user(email="c@x.com", password="x12345678")
        UserRole.objects.create(user=cls.coord, role=rol("coordinador"))
        cls.otro = U.objects.create_user(email="o@x.com", password="x12345678")
        cls.evaluador = rol("evaluador")

    def setUp(self):
        self.c = APIClient()

    def test_menus_por_rol(self):
        self.assertIn("/configuraciones/solicitud-rol", {m.route for m in get_user_menus(self.ponente)})
        self.assertNotIn("/configuraciones/solicitudes-roles", {m.route for m in get_user_menus(self.ponente)})
        self.assertIn("/configuraciones/solicitudes-roles", {m.route for m in get_user_menus(self.coord)})
        self.assertNotIn("/configuraciones/solicitud-rol", {m.route for m in get_user_menus(self.coord)})

    def test_sin_privilegio_no_entra(self):
        self.c.force_authenticate(self.otro)
        self.assertEqual(self.c.get(URL).status_code, 403)
        self.c.force_authenticate(self.ponente)
        self.assertEqual(self.c.get(URL + "bandeja/").status_code, 403)

    def test_solo_se_puede_solicitar_el_rol_de_evaluador(self):
        self.c.force_authenticate(self.ponente)
        nombres = {r["nombre"].lower(): r for r in self.c.get(URL).json()["roles"]}
        self.assertEqual(set(nombres), {"evaluador"})
        self.assertFalse(nombres["evaluador"]["ya_lo_tienes"])

    def test_flujo_solicitar_y_aprobar_asigna_el_rol_al_instante(self):
        self.c.force_authenticate(self.ponente)
        r = self.c.post(URL, {"rol": self.evaluador.pk, "motivo": "Quiero evaluar"}, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        sid = r.json()["id"]
        # no se puede duplicar mientras esté pendiente
        self.assertEqual(self.c.post(URL, {"rol": self.evaluador.pk}, format="json").status_code, 409)
        self.assertFalse(UserRole.objects.filter(user=self.ponente, role=self.evaluador).exists())

        self.c.force_authenticate(self.coord)
        b = self.c.get(URL + "bandeja/?estado=pendiente").json()
        self.assertEqual((len(b["solicitudes"]), b["conteo"]["pendiente"]), (1, 1))
        self.assertEqual(b["solicitudes"][0]["usuario"]["correo"], "p@x.com")
        r = self.c.post(f"{URL}{sid}/resolver/", {"accion": "aprobar", "comentario": "Adelante"}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.json()["estado"], "aprobada")
        self.assertTrue(UserRole.objects.filter(user=self.ponente, role=self.evaluador).exists())
        self.assertTrue(UserRole.objects.filter(user=self.ponente, role=self.evaluador).exists())
        # ya resuelta
        self.assertEqual(self.c.post(f"{URL}{sid}/resolver/", {"accion": "rechazar"}, format="json").status_code, 409)
        # y ya tiene el rol
        self.c.force_authenticate(self.ponente)
        self.assertEqual(self.c.post(URL, {"rol": self.evaluador.pk}, format="json").status_code, 409)

    def test_rechazar_no_asigna_y_permite_volver_a_pedir(self):
        s = SolicitudRol.objects.create(usuario=self.ponente, rol=self.evaluador)
        self.c.force_authenticate(self.coord)
        r = self.c.post(f"{URL}{s.pk}/resolver/", {"accion": "rechazar", "comentario": "Aún no"}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual((r.json()["estado"], r.json()["comentario_resolucion"]), ("rechazada", "Aún no"))
        self.assertFalse(UserRole.objects.filter(user=self.ponente, role=self.evaluador).exists())
        self.c.force_authenticate(self.ponente)
        self.assertEqual(self.c.post(URL, {"rol": self.evaluador.pk}, format="json").status_code, 201)

    def test_no_se_pueden_pedir_roles_de_control_total(self):
        self.c.force_authenticate(self.ponente)
        self.assertEqual(self.c.post(URL, {"rol": rol("administrador").pk}, format="json").status_code, 400)
        self.assertEqual(self.c.post(URL, {"rol": rol("coordinador").pk}, format="json").status_code, 400)
        self.assertEqual(self.c.post(URL, {"rol": rol("administrador de pagos").pk}, format="json").status_code, 400)

    def test_retirar_solicitud_pendiente_y_ajena(self):
        s = SolicitudRol.objects.create(usuario=self.ponente, rol=self.evaluador)
        self.c.force_authenticate(self.ponente)
        self.assertEqual(self.c.delete(f"{URL}{s.pk}/").status_code, 204)
        s2 = SolicitudRol.objects.create(usuario=self.ponente, rol=self.evaluador, estado="aprobada")
        self.assertEqual(self.c.delete(f"{URL}{s2.pk}/").status_code, 409)
        self.assertEqual(self.c.post(f"{URL}{s2.pk}/resolver/", {"accion": "aprobar"}, format="json").status_code, 403)


class MenuCrearCongresoTests(TestCase):
    def test_coordinador_ve_crear_congreso_y_ponente_no(self):
        coord = U.objects.create_user(email="cc@x.com", password="x12345678")
        UserRole.objects.create(user=coord, role=rol("coordinador"))
        pon = U.objects.create_user(email="pp@x.com", password="x12345678")
        UserRole.objects.create(user=pon, role=rol("ponente"))
        self.assertIn("/configuraciones/crear-congreso", {m.route for m in get_user_menus(coord)})
        self.assertNotIn("/configuraciones/crear-congreso", {m.route for m in get_user_menus(pon)})
