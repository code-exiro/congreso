import datetime

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from catalogs.models import AcademicLevel, AcademicStatus, Area, Campus, Country, Institution, State
from congreso.models import (
    Actividad, Congreso, CongresoActividad, CongresoFechaImportante, FechaImportante, LimiteTrabajo,
)
from users.models import Profile, Role, UserRole

from .models import Fase, Trabajo

User = get_user_model()
RESUMEN = "Planteamiento del problema, objetivo, metodología y resultados preliminares del trabajo. " * 2


class SolicitudesPonenteTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.ponente = User.objects.create_user(email="p@x.com", password="x12345678", first_name="Ana", last_name="Pérez")
        UserRole.objects.get_or_create(user=cls.ponente, role=Role.objects.get(name__iexact="ponente"))
        pais = Country.objects.get_or_create(name="México")[0]
        Profile.objects.update_or_create(user=cls.ponente, defaults=dict(
            state=State.objects.get_or_create(country=pais, name="Jalisco")[0],
            institution=Institution.objects.get_or_create(name="UNAM")[0],
            academic_level=AcademicLevel.objects.get_or_create(degree="Maestría")[0],
            campus=Campus.objects.get_or_create(institution=Institution.objects.get_or_create(name="UNAM")[0], name="Campus de prueba")[0],
            academic_status=AcademicStatus.objects.get_or_create(code="terminado", defaults={"name": "Terminado"})[0], biography="Semblanza de prueba.",
            dialing_code="+52", mobile_phone="5512345678",
        ))
        cls.area = Area.objects.get_or_create(code="FE", defaults={"name": "Electricidad"})[0]
        cls.congreso = Congreso.objects.create(
            nombre_congreso="CONING", edicion_congreso=22, modalidad_congreso="Presencial", correo_congreso="c@x.com",
            contrasena_aplicacion="x", contacto_correo="c@x.com", contacto_telefono="5512345678",
        )
        cls.ponencia = Actividad.objects.create(nombre="ponencia")
        cls.taller = Actividad.objects.create(nombre="taller")
        for a in (cls.ponencia, cls.taller):
            CongresoActividad.objects.create(congreso=cls.congreso, actividad=a)
            Fase.objects.create(actividad=a, nombre="resumen_enviado", secuencia=1)
            Fase.objects.create(actividad=a, nombre="resumen_evaluacion", secuencia=2)
        LimiteTrabajo.objects.create(actividad=cls.ponencia, limite=2)
        LimiteTrabajo.objects.create(actividad=cls.taller, limite=1)

    def setUp(self):
        self.c = APIClient()
        self.c.force_authenticate(self.ponente)

    def datos(self, actividad=None, **extra):
        return {"congreso": self.congreso.pk, "actividad": (actividad or self.ponencia).pk, "area": self.area.pk,
                "titulo": "Secador solar indirecto", "resumen": RESUMEN, "palabras_clave": "solar, secado", **extra}

    def test_opciones_muestra_tipos_con_limite(self):
        r = self.c.get("/api/trabajos/opciones/")
        self.assertEqual(r.status_code, 200)
        acts = {a["nombre"]: a for a in r.json()["congresos"][0]["actividades"]}
        self.assertEqual(acts["ponencia"]["limite"], 2)
        self.assertEqual(acts["taller"]["usados"], 0)
        self.assertTrue(r.json()["perfil_completo"])

    def test_crear_resumen_queda_en_primera_fase_y_es_autor(self):
        r = self.c.post("/api/trabajos/mis-solicitudes/", self.datos(self.taller), format="json")
        self.assertEqual(r.status_code, 201, r.content)
        j = r.json()
        self.assertEqual(j["actividad"]["nombre"], "taller")
        self.assertEqual(j["fase"]["secuencia"], 1)
        self.assertTrue(j["es_autor"] and j["puede_editar"] and j["clave"].startswith("T"))
        self.assertEqual(len(self.c.get("/api/trabajos/mis-solicitudes/").json()), 1)

    def test_limite_por_tipo(self):
        self.assertEqual(self.c.post("/api/trabajos/mis-solicitudes/", self.datos(self.taller), format="json").status_code, 201)
        r = self.c.post("/api/trabajos/mis-solicitudes/", self.datos(self.taller), format="json")
        self.assertEqual(r.status_code, 400)
        self.assertIn("límite", r.json()["detail"])

    def test_limite_global_suma_todas_las_actividades(self):
        self.congreso.limite_trabajos = 2
        self.congreso.save()
        for _ in range(2):
            self.assertEqual(self.c.post("/api/trabajos/mis-solicitudes/", self.datos(), format="json").status_code, 201)
        # ponencias llenas por el tope global (2): el taller, que tiene cupo propio, también se bloquea
        r = self.c.post("/api/trabajos/mis-solicitudes/", self.datos(self.taller), format="json")
        self.assertEqual(r.status_code, 400)
        self.assertIn("global de 2", r.json()["detail"])
        op = self.c.get("/api/trabajos/opciones/").json()["congresos"][0]
        self.assertEqual((op["usados_global"], op["limite_global"]), (2, 2))

    def test_perfil_incompleto_no_puede_enviar(self):
        self.ponente.profile.refresh_from_db()
        p = self.ponente.profile
        p.biography = ""     # la semblanza es obligatoria para que el perfil cuente como completo
        p.save()
        r = self.c.post("/api/trabajos/mis-solicitudes/", self.datos(), format="json")
        self.assertEqual(r.status_code, 403)
        self.assertEqual(r.json()["code"], "perfil_incompleto")

    def test_ventana_de_recepcion_cerrada(self):
        f = FechaImportante.objects.get_or_create(nombre="Recepción de resúmenes")[0]
        ayer = timezone.localdate() - datetime.timedelta(days=1)
        CongresoFechaImportante.objects.create(congreso=self.congreso, fecha_importante=f,
                                               fecha_inicio=ayer - datetime.timedelta(days=10), fecha_fin=ayer)
        r = self.c.post("/api/trabajos/mis-solicitudes/", self.datos(), format="json")
        self.assertEqual(r.status_code, 400)
        self.assertIn("recepción", r.json()["detail"].lower())

    def test_actividad_que_el_congreso_no_ofrece(self):
        otra = Actividad.objects.create(nombre="cartel")
        r = self.c.post("/api/trabajos/mis-solicitudes/", self.datos(otra), format="json")
        self.assertEqual(r.status_code, 400)

    def test_coautor_debe_tener_cuenta(self):
        r = self.c.post("/api/trabajos/mis-solicitudes/", self.datos(coautores=["nadie@x.com"]), format="json")
        self.assertEqual(r.status_code, 400)
        co = User.objects.create_user(email="co@x.com", password="x12345678")
        r = self.c.post("/api/trabajos/mis-solicitudes/", self.datos(coautores=["co@x.com"]), format="json")
        self.assertEqual(r.status_code, 400)                                        # existe, pero no es ponente
        self.assertIn("no tiene el rol de ponente", r.json()["detail"])
        UserRole.objects.get_or_create(user=co, role=Role.objects.get(name__iexact="ponente"))
        r = self.c.post("/api/trabajos/mis-solicitudes/", self.datos(coautores=["co@x.com"]), format="json")
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual([a["es_autor"] for a in r.json()["autores"]], [True, False])
        # el coautor lo ve en su lista pero no puede editarlo
        c2 = APIClient(); c2.force_authenticate(co)
        UserRole.objects.get_or_create(user=co, role=Role.objects.get(name__iexact="ponente"))
        lista = c2.get("/api/trabajos/mis-solicitudes/").json()
        self.assertEqual(len(lista), 1)
        self.assertFalse(lista[0]["puede_editar"])

    def test_verificar_coautor_antes_de_agregarlo(self):
        url = "/api/trabajos/coautores/verificar/"
        r = self.c.get(url, {"correo": "nadie@x.com"})
        self.assertEqual(r.status_code, 404)
        self.assertIn("No se encontró ningún usuario", r.json()["detail"])
        User.objects.create_user(email="sinrol@x.com", password="x12345678")
        r = self.c.get(url, {"correo": "sinrol@x.com"})
        self.assertEqual(r.status_code, 404)
        self.assertIn("rol de ponente", r.json()["detail"])
        co = User.objects.create_user(email="Ok@x.com", password="x12345678", first_name="Luis", last_name="Gómez")
        UserRole.objects.get_or_create(user=co, role=Role.objects.get(name__iexact="ponente"))
        r = self.c.get(url, {"correo": "ok@x.com"})
        self.assertEqual(r.status_code, 200)
        self.assertEqual((r.json()["correo"], r.json()["nombre"]), ("ok@x.com", "LUIS GÓMEZ"))
        self.assertEqual(self.c.get(url, {"correo": self.ponente.email}).status_code, 400)   # uno mismo
        self.assertEqual(APIClient().get(url, {"correo": "ok@x.com"}).status_code, 401)

    def test_ser_coautor_consume_cupo(self):
        # taller: límite 1. Ser coautor de un taller cuenta como participar en uno.
        co = User.objects.create_user(email="co2@x.com", password="x12345678")
        UserRole.objects.get_or_create(user=co, role=Role.objects.get(name__iexact="ponente"))
        UserRole.objects.get_or_create(user=co, role=Role.objects.get(name__iexact="ponente"))
        self.assertEqual(self.c.post("/api/trabajos/mis-solicitudes/", self.datos(self.taller, coautores=["co2@x.com"]), format="json").status_code, 201)
        c2 = APIClient(); c2.force_authenticate(co)
        Profile.objects.update_or_create(user=co, defaults=dict(
            state=self.ponente.profile.state, institution=self.ponente.profile.institution,
            academic_level=self.ponente.profile.academic_level, campus=self.ponente.profile.campus,
            academic_status=self.ponente.profile.academic_status, biography="Semblanza de prueba.",
            dialing_code="+52", mobile_phone="5512345678"))
        opciones = c2.get("/api/trabajos/opciones/").json()["congresos"][0]["actividades"]
        taller = next(a for a in opciones if a["nombre"] == "taller")
        self.assertEqual((taller["usados"], taller["limite"]), (1, 1))
        r = c2.post("/api/trabajos/mis-solicitudes/", self.datos(self.taller), format="json")
        self.assertEqual(r.status_code, 400)

    def test_no_se_puede_agregar_coautor_sin_cupo(self):
        co = User.objects.create_user(email="lleno@x.com", password="x12345678")
        UserRole.objects.get_or_create(user=co, role=Role.objects.get(name__iexact="ponente"))
        otro = User.objects.create_user(email="otro@x.com", password="x12345678")
        UserRole.objects.get_or_create(user=otro, role=Role.objects.get(name__iexact="ponente"))
        # «lleno» ya participa en un taller de otra persona
        base = Trabajo.objects.create(congreso=self.congreso, actividad=self.taller, area=self.area,
                                      fase=Fase.objects.get(actividad=self.taller, secuencia=1), titulo="Ajeno", resumen=RESUMEN, palabras_clave="x")
        from .models import UsuarioTrabajo
        UsuarioTrabajo.objects.create(usuario=otro, trabajo=base, es_autor=True, orden_autor=1)
        UsuarioTrabajo.objects.create(usuario=co, trabajo=base, es_autor=False, orden_autor=2)
        r = self.c.post("/api/trabajos/mis-solicitudes/", self.datos(self.taller, coautores=["lleno@x.com"]), format="json")
        self.assertEqual(r.status_code, 400)
        self.assertIn("límite", r.json()["detail"])
        # en ponencia sí tiene cupo, y al editar tampoco se puede añadir si no hay cupo
        t = self.c.post("/api/trabajos/mis-solicitudes/", self.datos(), format="json").json()
        self.assertEqual(self.c.patch(f"/api/trabajos/mis-solicitudes/{t['id']}/", {"coautores": ["lleno@x.com"]}, format="json").status_code, 200)

    def test_corregir_y_retirar_mientras_esta_en_primera_fase(self):
        t = self.c.post("/api/trabajos/mis-solicitudes/", self.datos(), format="json").json()
        r = self.c.patch(f"/api/trabajos/mis-solicitudes/{t['id']}/", {"titulo": "Título corregido"}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.json()["titulo"], "Título corregido")
        obj = Trabajo.objects.get(pk=t["id"])
        obj.fase = Fase.objects.get(actividad=self.ponencia, secuencia=2)
        obj.save()
        self.assertEqual(self.c.patch(f"/api/trabajos/mis-solicitudes/{t['id']}/", {"titulo": "Otro"}, format="json").status_code, 409)
        self.assertEqual(self.c.delete(f"/api/trabajos/mis-solicitudes/{t['id']}/").status_code, 409)

    def test_retirar_resumen(self):
        t = self.c.post("/api/trabajos/mis-solicitudes/", self.datos(), format="json").json()
        self.assertEqual(self.c.delete(f"/api/trabajos/mis-solicitudes/{t['id']}/").status_code, 204)
        self.assertEqual(self.c.get("/api/trabajos/mis-solicitudes/").json(), [])

    def test_no_ve_trabajos_de_otros_ni_sin_privilegio(self):
        t = self.c.post("/api/trabajos/mis-solicitudes/", self.datos(), format="json").json()
        otro = User.objects.create_user(email="o@x.com", password="x12345678")
        UserRole.objects.get_or_create(user=otro, role=Role.objects.get(name__iexact="ponente"))
        c2 = APIClient(); c2.force_authenticate(otro)
        self.assertEqual(c2.get(f"/api/trabajos/mis-solicitudes/{t['id']}/").status_code, 404)
        sin_rol = User.objects.create_user(email="s@x.com", password="x12345678")
        c3 = APIClient(); c3.force_authenticate(sin_rol)
        self.assertEqual(c3.get("/api/trabajos/mis-solicitudes/").status_code, 403)
        self.assertEqual(APIClient().get("/api/trabajos/mis-solicitudes/").status_code, 401)


class CoordinadorTests(TestCase):
    """Bandeja de solicitudes y dictamen del coordinador (borrador)."""

    @classmethod
    def setUpTestData(cls):
        from users.models import Privilege, RolePrivilege
        cls.coord = User.objects.create_user(email="coord@x.com", password="x12345678")
        rol = Role.objects.create(name="coordinador_test")
        p, _ = Privilege.objects.get_or_create(code="evaluar_general", defaults={"name": "evaluar"})
        RolePrivilege.objects.create(role=rol, privilege=p)
        UserRole.objects.create(user=cls.coord, role=rol)
        cls.ponente = User.objects.create_user(email="pon@x.com", password="x12345678", first_name="Ana", last_name="Pérez")
        cls.area = Area.objects.get_or_create(code="FE", defaults={"name": "Electricidad"})[0]
        cls.congreso = Congreso.objects.create(
            nombre_congreso="CONING", edicion_congreso=22, modalidad_congreso="Presencial", correo_congreso="c@x.com",
            contrasena_aplicacion="x", contacto_correo="c@x.com", contacto_telefono="5512345678",
        )
        cls.act = Actividad.objects.create(nombre="ponencia")
        cls.f_env = Fase.objects.create(actividad=cls.act, nombre="resumen_enviado", secuencia=1)
        cls.f_apr = Fase.objects.create(actividad=cls.act, nombre="resumen_aprobado", secuencia=2)
        cls.f_rec = Fase.objects.create(actividad=cls.act, nombre="resumen_rechazado", secuencia=3)
        cls.t = Trabajo.objects.create(congreso=cls.congreso, actividad=cls.act, area=cls.area, fase=cls.f_env,
                                       titulo="Secador solar indirecto", resumen=RESUMEN, palabras_clave="solar")
        from .models import UsuarioTrabajo
        UsuarioTrabajo.objects.create(usuario=cls.ponente, trabajo=cls.t, es_autor=True, orden_autor=1)

    def setUp(self):
        self.c = APIClient()

    def test_ponente_sin_privilegio_no_ve_bandeja(self):
        self.c.force_authenticate(self.ponente)
        self.assertEqual(self.c.get("/api/trabajos/solicitudes/").status_code, 403)

    def test_coordinador_lista_y_busca(self):
        self.c.force_authenticate(self.coord)
        r = self.c.get("/api/trabajos/solicitudes/?q=pon@x.com").json()
        self.assertEqual(len(r["resultados"]), 1)
        self.assertEqual(r["resultados"][0]["autores"][0]["nombre"], "ANA PÉREZ")
        self.assertEqual(len(self.c.get("/api/trabajos/solicitudes/?q=zzz").json()["resultados"]), 0)

    def test_aprobar_y_ya_no_se_puede_rechazar(self):
        self.c.force_authenticate(self.coord)
        url = f"/api/trabajos/solicitudes/{self.t.pk}/dictamen/"
        self.assertEqual(self.c.post(url, {"accion": "aprobar"}, format="json").status_code, 200)
        self.t.refresh_from_db()
        self.assertEqual(self.t.fase_id, self.f_apr.pk)
        self.assertEqual(self.c.post(url, {"accion": "rechazar", "observaciones": "x" * 20}, format="json").status_code, 409)

    def test_rechazar_exige_observaciones_y_el_ponente_las_ve(self):
        self.c.force_authenticate(self.coord)
        url = f"/api/trabajos/solicitudes/{self.t.pk}/dictamen/"
        self.assertEqual(self.c.post(url, {"accion": "rechazar"}, format="json").status_code, 400)
        r = self.c.post(url, {"accion": "rechazar", "observaciones": "Falta la metodología del trabajo."}, format="json")
        self.assertEqual(r.status_code, 200)
        self.t.refresh_from_db()
        self.assertEqual(self.t.fase_id, self.f_rec.pk)


class EvaluacionTests(TestCase):
    """Asignación de evaluadores y módulo del evaluador (borrador)."""

    @classmethod
    def setUpTestData(cls):
        from users.models import Privilege, RolePrivilege
        from .models import Pregunta, UsuarioTrabajo
        rol_c = Role.objects.create(name="coord_t")
        for code in ("evaluar_general", "asignar_evaluador"):
            p, _ = Privilege.objects.get_or_create(code=code, defaults={"name": code})
            RolePrivilege.objects.create(role=rol_c, privilege=p)
        cls.coord = User.objects.create_user(email="coord@x.com", password="x12345678")
        UserRole.objects.create(user=cls.coord, role=rol_c)
        rol_e = Role.objects.create(name="Evaluador")
        for code in ("evaluar_trabajo", "ver_sus_evaluaciones"):
            p, _ = Privilege.objects.get_or_create(code=code, defaults={"name": code})
            RolePrivilege.objects.create(role=rol_e, privilege=p)
        cls.ev1 = User.objects.create_user(email="e1@x.com", password="x12345678", first_name="Eva")
        cls.ev2 = User.objects.create_user(email="e2@x.com", password="x12345678")
        for u in (cls.ev1, cls.ev2):
            UserRole.objects.create(user=u, role=rol_e)
        cls.pon = User.objects.create_user(email="pon@x.com", password="x12345678")
        cls.area = Area.objects.get_or_create(code="FE", defaults={"name": "Electricidad"})[0]
        cls.congreso = Congreso.objects.create(
            nombre_congreso="CONING", edicion_congreso=22, modalidad_congreso="Presencial", correo_congreso="c@x.com",
            contrasena_aplicacion="x", contacto_correo="c@x.com", contacto_telefono="5512345678",
        )
        cls.act = Actividad.objects.create(nombre="ponencia", evaluadores_por_trabajo=2)
        cls.fase = Fase.objects.create(actividad=cls.act, nombre="resumen_evaluacion", secuencia=2)
        cls.q1 = Pregunta.objects.create(fase=cls.fase, texto="¿Claro?")
        cls.q2 = Pregunta.objects.create(fase=cls.fase, texto="¿Completo?")
        cls.t = Trabajo.objects.create(congreso=cls.congreso, actividad=cls.act, area=cls.area, fase=cls.fase,
                                       titulo="Secador solar", resumen=RESUMEN, palabras_clave="solar, secado")
        UsuarioTrabajo.objects.create(usuario=cls.pon, trabajo=cls.t, es_autor=True, orden_autor=1)

    def setUp(self):
        self.c = APIClient()

    def asignar(self, user):
        self.c.force_authenticate(self.coord)
        return self.c.post(f"/api/trabajos/solicitudes/{self.t.pk}/evaluadores/", {"usuario": user.pk}, format="json")

    def test_asignar_limite_y_autor(self):
        self.c.force_authenticate(self.coord)
        ids = [e["id"] for e in self.c.get("/api/trabajos/evaluadores/").json()]
        self.assertEqual(set(ids), {self.ev1.pk, self.ev2.pk})
        self.assertEqual(self.asignar(self.ev1).status_code, 201)
        self.assertEqual(self.asignar(self.ev1).status_code, 409)
        self.assertEqual(self.asignar(self.ev2).status_code, 409)  # el resumen solo lo revisa un evaluador
        self.assertEqual(self.asignar(self.coord).status_code, 400)  # no es evaluador
        self.assertEqual(self.t.evaluadores.count(), 1)

    def test_evaluador_ve_solo_lo_suyo_y_envia(self):
        self.asignar(self.ev1)
        self.c.force_authenticate(self.ev2)
        self.assertEqual(self.c.get("/api/evaluaciones/asignadas/").json(), [])
        self.c.force_authenticate(self.ev1)
        lista = self.c.get("/api/evaluaciones/asignadas/").json()
        self.assertEqual(len(lista), 1)
        aid = lista[0]["id"]
        det = self.c.get(f"/api/evaluaciones/asignadas/{aid}/").json()
        self.assertEqual(len(det["preguntas"]), 2)
        url = f"/api/evaluaciones/asignadas/{aid}/enviar/"
        bad = {"dictamen": "aceptado", "respuestas": [{"pregunta": self.q1.pk, "cumple": True}]}
        self.assertEqual(self.c.post(url, bad, format="json").status_code, 400)
        sin_motivo = {"dictamen": "aceptado", "respuestas": [
            {"pregunta": self.q1.pk, "cumple": True}, {"pregunta": self.q2.pk, "cumple": False, "comentario": ""}]}
        self.assertEqual(self.c.post(url, sin_motivo, format="json").status_code, 400)
        ok = {"dictamen": "aceptado_cambios", "comentario": "Buen trabajo", "respuestas": [
            {"pregunta": self.q1.pk, "cumple": True}, {"pregunta": self.q2.pk, "cumple": False, "comentario": "Falta metodología"}]}
        r = self.c.post(url, ok, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["estado"], "evaluado")
        self.assertEqual(self.c.post(url, ok, format="json").status_code, 409)
        # el coordinador ya ve el dictamen y no puede quitar a quien ya evaluó
        self.c.force_authenticate(self.coord)
        fila = self.c.get("/api/trabajos/solicitudes/").json()["resultados"][0]
        self.assertEqual(fila["evaluadores"][0]["dictamen"], "aceptado_cambios")
        ev_id = fila["evaluadores"][0]["id"]
        self.assertEqual(self.c.delete(f"/api/trabajos/solicitudes/{self.t.pk}/evaluadores/?evaluador={ev_id}").status_code, 409)

    def test_sin_privilegio(self):
        self.c.force_authenticate(self.pon)
        self.assertEqual(self.c.get("/api/evaluaciones/asignadas/").status_code, 403)
        self.assertEqual(self.c.get("/api/trabajos/evaluadores/").status_code, 403)


import shutil
import tempfile

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings

_MEDIA = tempfile.mkdtemp()


@override_settings(MEDIA_ROOT=_MEDIA)
class ExtensoTests(TestCase):
    """Subida del extenso por el ponente, descarga por el evaluador y dictamen del coordinador."""

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(_MEDIA, ignore_errors=True)

    @classmethod
    def setUpTestData(cls):
        from users.models import Privilege, RolePrivilege
        from .models import Evaluador, UsuarioTrabajo
        def rol(nombre, codigos):
            r = Role.objects.create(name=nombre)
            for c in codigos:
                p, _ = Privilege.objects.get_or_create(code=c, defaults={"name": c})
                RolePrivilege.objects.create(role=r, privilege=p)
            return r
        cls.pon = User.objects.create_user(email="pon@x.com", password="x12345678")
        UserRole.objects.create(user=cls.pon, role=rol("pon_t", ["subir_trabajo", "ver_sus_trabajos"]))
        cls.otro = User.objects.create_user(email="otro@x.com", password="x12345678")
        UserRole.objects.create(user=cls.otro, role=rol("pon_t2", ["subir_trabajo", "ver_sus_trabajos"]))
        cls.ev = User.objects.create_user(email="ev@x.com", password="x12345678")
        UserRole.objects.create(user=cls.ev, role=rol("ev_t", ["evaluar_trabajo", "ver_sus_evaluaciones"]))
        cls.coord = User.objects.create_user(email="co@x.com", password="x12345678")
        UserRole.objects.create(user=cls.coord, role=rol("co_t", ["evaluar_general", "asignar_evaluador"]))
        cls.area = Area.objects.get_or_create(code="FE", defaults={"name": "Electricidad"})[0]
        cls.congreso = Congreso.objects.create(
            nombre_congreso="CONING", edicion_congreso=22, modalidad_congreso="Presencial", correo_congreso="c@x.com",
            contrasena_aplicacion="x", contacto_correo="c@x.com", contacto_telefono="5512345678",
        )
        cls.act = Actividad.objects.create(nombre="ponencia")
        mk = lambda n, s: Fase.objects.create(actividad=cls.act, nombre=n, secuencia=s)
        cls.f_apr = mk("resumen_aprobado", 3)
        cls.f_env = mk("extenso_enviado", 4)
        cls.f_eval = mk("extenso_evaluacion", 5)
        cls.f_ok = mk("Extenso_aprobado", 7)
        cls.t = Trabajo.objects.create(congreso=cls.congreso, actividad=cls.act, area=cls.area, fase=cls.f_apr,
                                       titulo="Secador solar", resumen=RESUMEN, palabras_clave="solar")
        UsuarioTrabajo.objects.create(usuario=cls.pon, trabajo=cls.t, es_autor=True, orden_autor=1)
        cls.asig = Evaluador.objects.create(usuario=cls.ev, trabajo=cls.t, numero=1)

    def setUp(self):
        self.c = APIClient()
        self.url = f"/api/trabajos/mis-solicitudes/{self.t.pk}/extenso/"

    def subir(self, nombre="extenso.pdf", contenido=b"%PDF-1.4 x"):
        return self.c.post(self.url, {"archivo": SimpleUploadedFile(nombre, contenido)}, format="multipart")

    def test_subida_valida_cambia_fase_y_el_evaluador_lo_descarga(self):
        self.c.force_authenticate(self.pon)
        self.assertTrue(self.c.get("/api/trabajos/mis-solicitudes/").json()[0]["puede_subir_extenso"])
        r = self.subir()
        self.assertEqual(r.status_code, 201)
        self.t.refresh_from_db()
        # con evaluador disponible, el extenso pasa directo a evaluación (ya no hay paso manual del coordinador)
        self.assertEqual(self.t.fase_id, self.f_eval.pk)
        # mientras nadie haya enviado su dictamen, el ponente aún puede cambiar el archivo y sigue en evaluación
        self.assertEqual(self.subir("v2.pdf", b"%PDF-1.4 y").status_code, 201)
        self.t.refresh_from_db()
        self.assertEqual(self.t.fase_id, self.f_eval.pk)
        self.assertEqual(self.c.get(self.url).status_code, 200)
        self.c.force_authenticate(self.ev)
        det = self.c.get(f"/api/evaluaciones/asignadas/{self.asig.pk}/").json()
        self.assertTrue(det["trabajo"]["archivo"]["url"].endswith("/archivo/"))
        self.assertEqual(self.c.get(det["trabajo"]["archivo"]["url"]).status_code, 200)

    def _docx_real(self):
        import subprocess, tempfile, os
        from . import extenso as ext
        exe = ext._soffice()
        if exe is None:
            self.skipTest("LibreOffice no está instalado")
        with tempfile.TemporaryDirectory() as tmp:
            txt = os.path.join(tmp, "e.txt")
            open(txt, "w").write("Extenso de prueba")
            subprocess.run([exe, "--headless", f"-env:UserInstallation=file://{tmp}/p", "--convert-to", "docx", "--outdir", tmp, txt], check=True, capture_output=True, timeout=120)
            return open(os.path.join(tmp, "e.docx"), "rb").read()

    def test_un_extenso_en_word_se_convierte_a_pdf_para_el_evaluador(self):
        contenido = self._docx_real()
        self.c.force_authenticate(self.pon)
        self.assertEqual(self.subir("mi_trabajo.docx", contenido).status_code, 201)
        self.assertEqual(self.c.get(self.url).status_code, 200)                      # el ponente recibe su original
        self.assertIn(".docx", self.c.get(self.url)["Content-Disposition"])
        self.c.force_authenticate(self.ev)
        r = self.c.get(f"/api/evaluaciones/asignadas/{self.asig.pk}/archivo/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r["Content-Type"], "application/pdf")
        self.assertTrue(b"".join(r.streaming_content).startswith(b"%PDF"))

    def test_si_no_hay_conversor_el_evaluador_recibe_un_mensaje_claro(self):
        from unittest import mock
        self.c.force_authenticate(self.pon)
        with mock.patch("trabajos.extenso._soffice", return_value=None):
            self.assertEqual(self.subir("mi_trabajo.docx", b"PK\x03\x04 no es un docx real").status_code, 201)
            self.c.force_authenticate(self.ev)
            r = self.c.get(f"/api/evaluaciones/asignadas/{self.asig.pk}/archivo/")
        self.assertEqual(r.status_code, 409)
        self.assertIn("PDF", r.json()["detail"])

    def test_validaciones_y_permisos(self):
        self.c.force_authenticate(self.pon)
        self.assertEqual(self.subir("virus.exe").status_code, 400)
        self.assertEqual(self.subir("grande.pdf", b"0" * (10 * 1024 * 1024 + 1)).status_code, 400)
        self.assertEqual(self.c.post(self.url, {}, format="multipart").status_code, 400)
        self.c.force_authenticate(self.otro)
        self.assertEqual(self.subir().status_code, 404)  # no es autor
        self.c.force_authenticate(self.ev)
        self.assertEqual(self.c.get(self.url).status_code, 403)

    def test_no_se_sube_antes_de_la_aprobacion_del_resumen(self):
        self.t.fase = self.f_eval
        self.t.save()
        self.c.force_authenticate(self.pon)
        self.assertEqual(self.subir().status_code, 409)

    def test_coordinador_aprueba_extenso(self):
        self.c.force_authenticate(self.pon)
        self.subir()
        self.c.force_authenticate(self.coord)
        fila = self.c.get("/api/trabajos/solicitudes/").json()["resultados"][0]
        self.assertIsNotNone(fila["extenso"])
        acciones = {a["accion"] for a in fila["acciones"]}
        self.assertIn("aprobar_extenso", acciones)
        self.assertEqual(self.c.get(f"/api/trabajos/solicitudes/{self.t.pk}/extenso/").status_code, 200)
        r = self.c.post(f"/api/trabajos/solicitudes/{self.t.pk}/dictamen/", {"accion": "aprobar_extenso"}, format="json")
        self.assertEqual(r.status_code, 200)
        self.t.refresh_from_db()
        self.assertEqual(self.t.fase_id, self.f_ok.pk)


class TopeEvaluadorTests(EvaluacionTests):
    """El evaluador no puede pasar del máximo de trabajos del congreso (5 por defecto)."""

    def test_tope_por_evaluador(self):
        self.assertEqual(self.congreso.max_trabajos_por_evaluador, 5)
        self.congreso.max_trabajos_por_evaluador = 1
        self.congreso.save()
        otro = Trabajo.objects.create(congreso=self.congreso, actividad=self.act, area=self.area, fase=self.fase,
                                      titulo="Otro trabajo", resumen=RESUMEN, palabras_clave="x")
        self.assertEqual(self.asignar(self.ev1).status_code, 201)
        self.c.force_authenticate(self.coord)
        r = self.c.post(f"/api/trabajos/solicitudes/{otro.pk}/evaluadores/", {"usuario": self.ev1.pk}, format="json")
        self.assertEqual(r.status_code, 409)
        self.assertIn("máximo", r.json()["detail"])
        self.assertEqual(self.c.post(f"/api/trabajos/solicitudes/{otro.pk}/evaluadores/", {"usuario": self.ev2.pk}, format="json").status_code, 201)
        # el coordinador puede subir el tope
        self.assertEqual(self.c.patch(f"/api/congreso/limites/congresos/{self.congreso.pk}/", {"max_trabajos_por_evaluador": 3}, format="json").status_code, 200)
        self.assertEqual(self.c.patch(f"/api/congreso/limites/congresos/{self.congreso.pk}/", {"max_trabajos_por_evaluador": 0}, format="json").status_code, 400)


class TrabajosActivosTests(CoordinadorTests):
    def test_activos_solo_aceptados_con_progreso(self):
        self.c.force_authenticate(self.coord)
        self.assertEqual(len(self.c.get("/api/trabajos/solicitudes/?activos=1").json()["resultados"]), 0)  # solo enviado
        self.t.fase = self.f_apr
        self.t.save()
        r = self.c.get("/api/trabajos/solicitudes/?activos=1").json()["resultados"]
        self.assertEqual(len(r), 1)
        self.assertEqual(r[0]["progreso"]["total"], 2)  # enviado, aprobado (el rechazado no cuenta)
        self.assertEqual(r[0]["progreso"]["porcentaje"], 100)
        self.t.fase = self.f_rec
        self.t.save()
        self.assertEqual(len(self.c.get("/api/trabajos/solicitudes/?activos=1").json()["resultados"]), 0)
