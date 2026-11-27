import shutil
import tempfile

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from catalogs.models import Area
from trabajos.models import Fase, Trabajo, UsuarioTrabajo
from users.models import Privilege, Role, RolePrivilege, UserRole

from .models import Actividad, ConceptoCuota, Congreso, Cuota, Pago

User = get_user_model()
_MEDIA = tempfile.mkdtemp()
RESUMEN = "Planteamiento, objetivo, metodología y resultados preliminares del trabajo presentado. " * 2


@override_settings(MEDIA_ROOT=_MEDIA)
class PagosTests(TestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(_MEDIA, ignore_errors=True)

    @classmethod
    def setUpTestData(cls):
        def rol(nombre, codigos):
            r = Role.objects.create(name=nombre)
            for c in codigos:
                p, _ = Privilege.objects.get_or_create(code=c, defaults={"name": c})
                RolePrivilege.objects.create(role=r, privilege=p)
            return r
        cls.pon = User.objects.create_user(email="pon@x.com", password="x12345678", first_name="Ana")
        cls.co = User.objects.create_user(email="co@x.com", password="x12345678")
        cls.nuevo = User.objects.create_user(email="nuevo@x.com", password="x12345678")
        cls.adm = User.objects.create_user(email="adm@x.com", password="x12345678")
        r_pon = rol("pon_pagos", ["solicitud_pago"])
        for u in (cls.pon, cls.co, cls.nuevo):
            UserRole.objects.create(user=u, role=r_pon)
        UserRole.objects.create(user=cls.adm, role=rol("adm_pagos", ["admin_pagos"]))
        cls.congreso = Congreso.objects.create(
            nombre_congreso="CONING", edicion_congreso=22, modalidad_congreso="Presencial", correo_congreso="c@x.com",
            contrasena_aplicacion="x", contacto_correo="c@x.com", contacto_telefono="5512345678",
        )
        cls.externo = ConceptoCuota.objects.create(nombre="Comunidad externa")
        cls.alumno = ConceptoCuota.objects.create(nombre="Alumnos con credencial vigente")
        cls.q_ext = Cuota.objects.create(congreso=cls.congreso, concepto=cls.externo, monto=500)
        cls.q_alu = Cuota.objects.create(congreso=cls.congreso, concepto=cls.alumno, monto=300)
        act = Actividad.objects.create(nombre="ponencia")
        cls.f_env = Fase.objects.create(actividad=act, nombre="resumen_enviado", secuencia=1)
        cls.f_apr = Fase.objects.create(actividad=act, nombre="resumen_aprobado", secuencia=3)
        cls.t = Trabajo.objects.create(congreso=cls.congreso, actividad=act, area=Area.objects.get_or_create(code="FE", defaults={"name": "E"})[0],
                                       fase=cls.f_env, titulo="Secador solar", resumen=RESUMEN, palabras_clave="x")
        UsuarioTrabajo.objects.create(usuario=cls.pon, trabajo=cls.t, es_autor=True, orden_autor=1)
        UsuarioTrabajo.objects.create(usuario=cls.co, trabajo=cls.t, es_autor=False, orden_autor=2)

    def setUp(self):
        self.c = APIClient()

    def aprobar(self):
        self.t.fase = self.f_apr
        self.t.save()

    def enviar(self, cuota=None, referencia="REF-12345", archivo=True, **extra):
        datos = {"congreso": self.congreso.pk, "cuota": (cuota or self.q_ext).pk, "referencia": referencia, **extra}
        if archivo:
            datos["comprobante"] = SimpleUploadedFile("ticket.jpg", b"\xff\xd8img")
        return self.c.post("/api/pagos/mis-pagos/", datos, format="multipart")

    def test_sin_resumen_aceptado_no_hay_ficha_ni_pago(self):
        self.c.force_authenticate(self.pon)
        self.assertEqual(self.c.get("/api/pagos/mis-pagos/").json(), [])
        self.assertEqual(self.enviar().status_code, 409)

    def test_flujo_ponente_y_validacion(self):
        self.aprobar()
        self.c.force_authenticate(self.pon)
        fila = self.c.get("/api/pagos/mis-pagos/").json()[0]
        self.assertTrue(fila["elegible"])
        self.assertEqual(fila["pago"]["estado"], "sin_enviar")
        self.assertEqual({q["concepto"] for q in fila["cuotas"]}, {"Comunidad externa", "Alumnos con credencial vigente"})
        # validaciones
        self.assertEqual(self.enviar(archivo=False).status_code, 400)
        self.assertEqual(self.enviar(referencia="1").status_code, 400)
        self.assertEqual(self.enviar(cuota=self.q_alu).status_code, 400)  # pide la credencial
        r = self.enviar()
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(r.json()["estado"], "revision")
        self.assertEqual(self.enviar().status_code, 409)  # ya está en revisión
        pid = r.json()["id"]
        self.assertEqual(self.c.get(f"/api/pagos/mis-pagos/{pid}/comprobante/").status_code, 200)
        # el encargado lo rechaza (exige motivo) y la ponente reenvía
        self.c.force_authenticate(self.adm)
        lista = self.c.get("/api/pagos/validacion/").json()["resultados"]
        self.assertEqual({x["usuario"]["correo"] for x in lista}, {"pon@x.com", "co@x.com"})  # el coautor también debe pagar
        self.assertEqual(self.c.patch(f"/api/pagos/validacion/{pid}/", {"estado": "rechazado"}, format="json").status_code, 400)
        self.assertEqual(self.c.patch(f"/api/pagos/validacion/{pid}/", {"estado": "rechazado", "comentario": "La referencia no se ve"}, format="json").status_code, 200)
        self.c.force_authenticate(self.pon)
        self.assertEqual(self.c.get("/api/pagos/mis-pagos/").json()[0]["pago"]["comentario"], "La referencia no se ve")
        r2 = self.enviar(referencia="REF-99999")
        self.assertEqual(r2.status_code, 201)
        self.assertEqual(Pago.objects.filter(usuario=self.pon).count(), 1)
        # validado: comentario por defecto del sistema
        self.c.force_authenticate(self.adm)
        v = self.c.patch(f"/api/pagos/validacion/{r2.json()['id']}/", {"estado": "validado"}, format="json").json()
        self.assertEqual(v["estado"], "validado")
        self.assertIn("validados", v["comentario"])
        self.assertTrue(Pago.objects.get(pk=v["id"]).validado)
        self.assertEqual(self.c.get("/api/pagos/validacion/?estado=validado").json()["resultados"][0]["usuario"]["correo"], "pon@x.com")
        self.assertEqual(len(self.c.get("/api/pagos/validacion/?q=co@x").json()["resultados"]), 1)

    def test_permisos(self):
        self.aprobar()
        self.c.force_authenticate(self.pon)
        self.assertEqual(self.c.get("/api/pagos/validacion/").status_code, 403)
        self.c.force_authenticate(self.adm)
        self.assertEqual(self.c.get("/api/pagos/mis-pagos/").status_code, 403)
        # un ponente no ve el comprobante de otro
        self.c.force_authenticate(self.pon)
        pid = self.enviar().json()["id"]
        self.c.force_authenticate(self.co)
        self.assertEqual(self.c.get(f"/api/pagos/mis-pagos/{pid}/comprobante/").status_code, 404)


@override_settings(MEDIA_ROOT=_MEDIA)
class ConstanciasTests(PagosTests):
    """Las constancias dependen de que el trabajo culmine Y de que el pago esté validado."""

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.pon_ver = Privilege.objects.get_or_create(code="ver_sus_constancias", defaults={"name": "c"})[0]
        for rol_ in Role.objects.filter(name="pon_pagos"):
            RolePrivilege.objects.get_or_create(role=rol_, privilege=cls.pon_ver)
        # tipo taller sin fases de extenso: termina en resumen_aprobado
        cls.autoriza = User.objects.create_user(email="autoriza@x.com", password="x12345678")
        r_aut = Role.objects.create(name="adm_constancias")
        RolePrivilege.objects.create(role=r_aut, privilege=Privilege.objects.get_or_create(code="autorizar_constancias", defaults={"name": "a"})[0])
        UserRole.objects.create(user=cls.autoriza, role=r_aut)
        cls.f_ext = Fase.objects.create(actividad=cls.t.actividad, nombre="extenso_enviado", secuencia=4)
        cls.f_fin = Fase.objects.create(actividad=cls.t.actividad, nombre="presentancion_aprobada", secuencia=13)

    def constancias(self):
        self.c.force_authenticate(self.pon)
        return self.c.get("/api/constancias/mis-constancias/").json()[0]

    def test_en_proceso_bloqueada_y_liberada(self):
        self.aprobar()  # resumen aprobado, falta extenso, video, presentación
        r = self.constancias()
        self.assertEqual(r["constancias"][0]["estado"], "en_proceso")
        self.t.fase = self.f_fin
        self.t.save()
        r = self.constancias()
        self.assertEqual(r["constancias"][0]["estado"], "bloqueada")
        self.assertEqual(r["pago"]["estado"], "sin_enviar")
        # envía el pago -> sigue bloqueada mientras esté en revisión
        pid = self.enviar().json()["id"]
        self.assertEqual(self.constancias()["constancias"][0]["estado"], "bloqueada")
        self.c.force_authenticate(self.adm)
        self.c.patch(f"/api/pagos/validacion/{pid}/", {"estado": "validado"}, format="json")
        r = self.constancias()
        # pago validado, pero falta la autorización del administrador
        self.assertEqual(r["constancias"][0]["estado"], "pendiente")
        self.c.force_authenticate(self.autoriza)
        fila = UsuarioTrabajo.objects.get(usuario=self.pon, trabajo=self.t)
        self.assertEqual(self.c.post("/api/constancias/autorizacion/", {"ids": [fila.pk]}, format="json").status_code, 200)
        r = self.constancias()
        self.assertEqual(r["constancias"][0]["estado"], "liberada")
        self.assertEqual(r["constancias"][0]["titulo"], "Constancia de ponente")
        # el coautor también la tiene, pero sin su propio pago sigue bloqueada
        self.c.force_authenticate(self.co)
        UserRole.objects.get_or_create(user=self.co, role=Role.objects.get(name="pon_pagos"))
        rc = self.c.get("/api/constancias/mis-constancias/").json()[0]
        self.assertEqual((rc["constancias"][0]["rol"], rc["constancias"][0]["estado"]), ("Coautor", "bloqueada"))

    def test_autorizacion_exige_privilegio_pago_validado_y_se_puede_revocar(self):
        self.t.fase = self.f_fin
        self.t.save()
        fila = UsuarioTrabajo.objects.get(usuario=self.pon, trabajo=self.t)
        # sin privilegio: 403
        self.c.force_authenticate(self.pon)
        self.assertEqual(self.c.post("/api/constancias/autorizacion/", {"ids": [fila.pk]}, format="json").status_code, 403)
        self.c.force_authenticate(self.autoriza)
        # sin pago validado no se puede autorizar
        r = self.c.post("/api/constancias/autorizacion/", {"ids": [fila.pk]}, format="json")
        self.assertEqual(r.status_code, 409)
        self.assertEqual(self.c.get("/api/constancias/autorizacion/?estado=sin_pago").json()["conteo"]["sin_pago"], 2)
        # con pago validado queda pendiente y luego autorizada
        self.c.force_authenticate(self.pon)
        pid = self.enviar().json()["id"]
        self.c.force_authenticate(self.adm)
        self.c.patch(f"/api/pagos/validacion/{pid}/", {"estado": "validado"}, format="json")
        self.c.force_authenticate(self.autoriza)
        self.assertEqual(self.c.get("/api/constancias/autorizacion/?estado=pendiente").json()["conteo"]["pendiente"], 1)
        self.assertEqual(self.c.post("/api/constancias/autorizacion/", {"ids": [fila.pk]}, format="json").json()["autorizadas"], 1)
        self.assertEqual(self.c.get("/api/constancias/autorizacion/").json()["conteo"]["autorizada"], 1)
        self.assertEqual(self.c.delete(f"/api/constancias/autorizacion/{fila.pk}/").status_code, 204)
        self.c.force_authenticate(self.pon)
        self.assertEqual(self.c.get("/api/constancias/mis-constancias/").json()[0]["constancias"][0]["estado"], "pendiente")
