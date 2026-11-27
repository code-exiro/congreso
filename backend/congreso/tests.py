import json

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from django.test import TestCase

from .models import Actividad, ConceptoCuota, Congreso, CongresoActividad, FechaImportante, Patrocinador, TipoPatrocinador

User = get_user_model()


class CrearCongresoTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = User.objects.create_superuser(email="a@x.com", password="x12345678")
        cls.fecha = FechaImportante.objects.get_or_create(nombre="Recepción de resúmenes")[0]
        cls.act = Actividad.objects.create(nombre="ponencia")
        cls.cuota = ConceptoCuota.objects.create(nombre="General")
        cls.pat = Patrocinador.objects.create(nombre="FESC", tipo=TipoPatrocinador.objects.create(nombre="institucion"))

    def datos(self, **extra):
        return {
            "nombre_congreso": "CONING", "edicion_congreso": "21", "modalidad_congreso": "Híbrida",
            "ubicacion_sede": "FES", "contacto_correo": "c@x.com", "contacto_telefono": "5512345678",
            "correo_congreso": "k@x.com", "contraseña_aplicacion": "abc", "color_banner": "#002B49",
            "fechas": json.dumps([{"id_fecha": self.fecha.pk, "fecha_inicio": "2026-08-01", "fecha_fin": "2026-08-15"}]),
            "actividades": json.dumps([{"id_actividad": self.act.pk, "activo": True}]),
            "cuotas": json.dumps([{"id_Cuota": self.cuota.pk, "importe": "500"}]),
            "patrocinadores": json.dumps([self.pat.pk]),
            **extra,
        }

    def test_catalogos_publicos(self):
        r = APIClient().get("/api/catalogos-congreso/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.json()["actividades"]), 1)

    def test_crear_requiere_permiso(self):
        self.assertEqual(APIClient().post("/api/congresos/crear/", self.datos(), format="multipart").status_code, 401)
        normal = User.objects.create_user(email="n@x.com", password="x12345678")
        c = APIClient(); c.force_authenticate(normal)
        self.assertEqual(c.post("/api/congresos/crear/", self.datos(), format="multipart").status_code, 403)

    def test_crear_rechaza_asignacion_que_empieza_antes_de_cerrar_la_recepcion(self):
        from . import ventanas as vt
        recep = FechaImportante.objects.get(nombre=vt.NOMBRES[vt.RECEPCION])
        asig = FechaImportante.objects.get(nombre=vt.NOMBRES[vt.ASIGNACION_RESUMEN])
        c = APIClient(); c.force_authenticate(self.admin)
        mal = json.dumps([{"id_fecha": recep.pk, "fecha_inicio": "2026-11-24", "fecha_fin": "2026-11-30"},
                          {"id_fecha": asig.pk, "fecha_inicio": "2026-11-28", "fecha_fin": "2026-12-05"}])
        r = c.post("/api/congresos/crear/", self.datos(fechas=mal), format="multipart")
        self.assertEqual(r.status_code, 400)
        self.assertIn("debe empezar después", r.json()["detail"])
        self.assertFalse(Congreso.objects.exists())
        bien = json.dumps([{"id_fecha": recep.pk, "fecha_inicio": "2026-11-24", "fecha_fin": "2026-11-30"},
                           {"id_fecha": asig.pk, "fecha_inicio": "2026-12-01", "fecha_fin": "2026-12-05"}])
        self.assertEqual(c.post("/api/congresos/crear/", self.datos(fechas=bien), format="multipart").status_code, 201)

    def test_crear_y_rechazar_duplicado(self):
        c = APIClient(); c.force_authenticate(self.admin)
        r = c.post("/api/congresos/crear/", self.datos(), format="multipart")
        self.assertEqual(r.status_code, 201, r.content)
        cg = Congreso.objects.get()
        self.assertEqual(cg.modalidad_congreso, "Híbrido")
        self.assertTrue(CongresoActividad.objects.filter(congreso=cg, actividad=self.act, activa=True).exists())
        self.assertEqual(cg.cuotas.count(), 1)
        r = c.post("/api/congresos/crear/", self.datos(), format="multipart")
        self.assertEqual(r.status_code, 400)
        self.assertIn("Ya existe", r.json()["detail"])


class LimitesTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        from django.contrib.auth import get_user_model
        from users.models import Privilege, Role, RolePrivilege, UserRole
        U = get_user_model()
        r = Role.objects.create(name="coord_lim")
        p, _ = Privilege.objects.get_or_create(code="asignar_evaluador", defaults={"name": "asignar"})
        RolePrivilege.objects.create(role=r, privilege=p)
        cls.coord = U.objects.create_user(email="c@x.com", password="x12345678")
        UserRole.objects.create(user=cls.coord, role=r)
        cls.otro = U.objects.create_user(email="o@x.com", password="x12345678")
        cls.pon = U.objects.create_user(email="p@x.com", password="x12345678", first_name="Ana")
        cls.act = Actividad.objects.create(nombre="ponencia")

    def setUp(self):
        from rest_framework.test import APIClient
        self.c = APIClient()

    def test_sin_privilegio(self):
        self.c.force_authenticate(self.otro)
        self.assertEqual(self.c.get("/api/congreso/limites/").status_code, 403)

    def test_editar_actividad_y_que_lo_use_el_ponente(self):
        from trabajos.serializers import limite_para
        self.c.force_authenticate(self.coord)
        r = self.c.patch(f"/api/congreso/limites/actividades/{self.act.pk}/", {"evaluadores_por_trabajo": 3, "trabajos_por_ponente": 4}, format="json")
        self.assertEqual(r.status_code, 200)
        fila = r.json()["actividades"][0]
        self.assertEqual((fila["evaluadores_por_trabajo"], fila["trabajos_por_ponente"]), (3, 4))
        self.assertEqual(limite_para(self.pon, None, self.act), 4)
        bad = self.c.patch(f"/api/congreso/limites/actividades/{self.act.pk}/", {"evaluadores_por_trabajo": 0}, format="json")
        self.assertEqual(bad.status_code, 400)

    def test_excepcion_por_usuario(self):
        from trabajos.serializers import limite_para
        self.c.force_authenticate(self.coord)
        datos = {"correo": "P@x.com", "actividad": self.act.pk, "limite_personalizado": 6}
        r = self.c.post("/api/congreso/limites/usuarios/", datos, format="json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(limite_para(self.pon, None, self.act), 6)
        self.assertEqual(self.c.post("/api/congreso/limites/usuarios/", {**datos, "correo": "no@x.com"}, format="json").status_code, 400)
        eid = r.json()["excepciones"][0]["id"]
        self.assertEqual(self.c.delete(f"/api/congreso/limites/usuarios/{eid}/").status_code, 200)
        self.assertEqual(limite_para(self.pon, None, self.act), 1)


class LimiteGlobalTests(LimitesTests):
    def test_editar_limite_global_del_congreso(self):
        from congreso.models import Congreso
        self.congreso = Congreso.objects.create(
            nombre_congreso="CONING", edicion_congreso=22, modalidad_congreso="Presencial", correo_congreso="c@x.com",
            contrasena_aplicacion="x", contacto_correo="c@x.com", contacto_telefono="5512345678",
        )
        self.c.force_authenticate(self.coord)
        r = self.c.patch(f"/api/congreso/limites/congresos/{self.congreso.pk}/", {"limite_trabajos": 6}, format="json")
        self.assertEqual(r.status_code, 200)
        self.congreso.refresh_from_db()
        self.assertEqual(self.congreso.limite_trabajos, 6)
        self.assertEqual(r.json()["congresos"][0]["limite_trabajos"], 6)
        self.assertEqual(self.c.patch(f"/api/congreso/limites/congresos/{self.congreso.pk}/", {"limite_trabajos": 0}, format="json").status_code, 400)


class FechasImportantesTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        from users.models import Privilege, Role, RolePrivilege, UserRole
        r = Role.objects.create(name="coord_fechas")
        p, _ = Privilege.objects.get_or_create(code="modificar_fechas", defaults={"name": "modificar_fechas"})
        RolePrivilege.objects.create(role=r, privilege=p)
        cls.coord = User.objects.create_user(email="cf@x.com", password="x12345678")
        UserRole.objects.create(user=cls.coord, role=r)
        cls.otro = User.objects.create_user(email="of@x.com", password="x12345678")
        cls.congreso = Congreso.objects.create(
            nombre_congreso="CONING", edicion_congreso=30, modalidad_congreso="Presencial", correo_congreso="c@x.com",
            contrasena_aplicacion="x", contacto_correo="c@x.com", contacto_telefono="5512345678")

    vt = __import__("congreso.ventanas", fromlist=["x"])

    def fid(self, clave):
        return FechaImportante.objects.get(nombre=self.vt.NOMBRES[clave]).pk

    def test_catalogo_trae_las_fechas_del_proceso_y_requiere_permiso(self):
        c = APIClient(); c.force_authenticate(self.otro)
        self.assertEqual(c.get("/api/congreso/fechas/").status_code, 403)
        c.force_authenticate(self.coord)
        filas = c.get("/api/congreso/fechas/").json()["congresos"][0]["fechas"]
        self.assertEqual([f["clave"] for f in filas], self.vt.ORDEN)
        self.assertTrue(all(f["estado"] == "sin_configurar" for f in filas))

    def test_guardar_actualizar_y_quitar_fechas(self):
        c = APIClient(); c.force_authenticate(self.coord)
        url = f"/api/congreso/fechas/{self.congreso.pk}/"
        cuerpo = {"fechas": [
            {"id_fecha": self.fid("recepcion"), "fecha_inicio": "2026-11-24", "fecha_fin": "2026-11-30"},
            {"id_fecha": self.fid("asignacion_resumen"), "fecha_inicio": "2026-12-01", "fecha_fin": "2026-12-05"}]}
        self.assertEqual(c.put(url, cuerpo, format="json").status_code, 200)
        self.assertEqual(self.congreso.fechas_importantes.count(), 2)
        cuerpo["fechas"][0]["fecha_fin"] = "2026-11-29"
        self.assertEqual(c.put(url, cuerpo, format="json").status_code, 200)
        self.assertEqual(str(self.congreso.fechas_importantes.get(fecha_importante_id=self.fid("recepcion")).fecha_fin), "2026-11-29")
        quitar = {"fechas": [{"id_fecha": self.fid("asignacion_resumen"), "fecha_inicio": "", "fecha_fin": ""}]}
        self.assertEqual(c.put(url, quitar, format="json").status_code, 200)
        self.assertEqual(self.congreso.fechas_importantes.count(), 1)

    def test_validaciones(self):
        c = APIClient(); c.force_authenticate(self.coord)
        url = f"/api/congreso/fechas/{self.congreso.pk}/"
        r = c.put(url, {"fechas": [{"id_fecha": self.fid("recepcion"), "fecha_inicio": "2026-11-30", "fecha_fin": "2026-11-24"}]}, format="json")
        self.assertEqual(r.status_code, 400)
        r = c.put(url, {"fechas": [{"id_fecha": self.fid("recepcion"), "fecha_inicio": "2026-11-24", "fecha_fin": ""}]}, format="json")
        self.assertEqual(r.status_code, 400)
        r = c.put(url, {"fechas": [
            {"id_fecha": self.fid("recepcion"), "fecha_inicio": "2026-11-24", "fecha_fin": "2026-11-30"},
            {"id_fecha": self.fid("asignacion_resumen"), "fecha_inicio": "2026-11-26", "fecha_fin": "2026-12-05"}]}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertIn("debe empezar después", r.json()["detail"])
        self.assertEqual(self.congreso.fechas_importantes.count(), 0)
