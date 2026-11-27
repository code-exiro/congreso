"""Flujo: el coordinador asigna al evaluador del resumen (eso lo aprueba para evaluación) y el evaluador decide (borrador local)."""
import datetime
import shutil
import tempfile

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from catalogs.models import AcademicLevel, AcademicStatus, Area, Campus, Country, Institution, State
from congreso import ventanas as vt
from congreso.models import Actividad, Congreso, CongresoActividad, CongresoFechaImportante, FechaImportante, LimiteTrabajo
from users.models import Privilege, Profile, Role, RolePrivilege, UserRole

from .models import Evaluador, Fase, Pregunta, Trabajo

User = get_user_model()
RESUMEN = "Planteamiento del problema, objetivo, metodología y resultados preliminares del trabajo. " * 2


def rol(nombre, codigos):
    r, _ = Role.objects.get_or_create(name=nombre)
    for c in codigos:
        p, _ = Privilege.objects.get_or_create(code=c, defaults={"name": c})
        RolePrivilege.objects.get_or_create(role=r, privilege=p)
    return r


_MEDIA = tempfile.mkdtemp()


@override_settings(MEDIA_ROOT=_MEDIA)
class FlujoAutomaticoTests(TestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(_MEDIA, ignore_errors=True)

    @classmethod
    def setUpTestData(cls):
        cls.pon = User.objects.create_user(email="pon@x.com", password="x12345678", first_name="Ana", last_name="Pérez")
        UserRole.objects.create(user=cls.pon, role=rol("pon_auto", ["subir_trabajo", "ver_sus_trabajos"]))
        pais = Country.objects.get_or_create(name="México")[0]
        Profile.objects.update_or_create(user=cls.pon, defaults=dict(
            state=State.objects.get_or_create(country=pais, name="Jalisco")[0], institution=Institution.objects.get_or_create(name="UNAM")[0],
            academic_level=AcademicLevel.objects.get_or_create(degree="Maestría")[0],
            campus=Campus.objects.get_or_create(institution=Institution.objects.get_or_create(name="UNAM")[0], name="Campus de prueba")[0],
            academic_status=AcademicStatus.objects.get_or_create(code="terminado", defaults={"name": "Terminado"})[0], biography="Semblanza de prueba.",
            dialing_code="+52", mobile_phone="5512345678",
        ))
        cls.evs = []
        for i in (1, 2, 3):
            u = User.objects.create_user(email=f"ev{i}@x.com", password="x12345678", first_name=f"Eva{i}")
            UserRole.objects.create(user=u, role=rol("ev_auto", ["evaluar_trabajo", "ver_sus_evaluaciones"]))
            cls.evs.append(u)
        cls.coord = User.objects.create_user(email="co@x.com", password="x12345678")
        UserRole.objects.create(user=cls.coord, role=rol("co_auto", ["evaluar_general", "asignar_evaluador"]))
        cls.area = Area.objects.get_or_create(code="FE", defaults={"name": "Electricidad"})[0]
        cls.congreso = Congreso.objects.create(
            nombre_congreso="CONING", edicion_congreso=22, modalidad_congreso="Presencial", correo_congreso="c@x.com",
            contrasena_aplicacion="x", contacto_correo="c@x.com", contacto_telefono="5512345678",
        )
        cls.act = Actividad.objects.create(nombre="ponencia", evaluadores_por_trabajo=2)
        CongresoActividad.objects.create(congreso=cls.congreso, actividad=cls.act)
        LimiteTrabajo.objects.create(actividad=cls.act, limite=10)
        cls.f = {}
        for n, (nombre, sec) in enumerate([
            ("resumen_enviado", 1), ("resumen_evaluacion", 2), ("resumen_rechazado", 3), ("resumen_aprobado", 3),
            ("extenso_enviado", 4), ("extenso_evaluacion", 5), ("extenso_rechazado", 6), ("Extenso_aprobado", 7)], start=1):
            cls.f[nombre.lower()] = Fase.objects.create(actividad=cls.act, nombre=nombre, secuencia=sec)
        cls.preg_res = Pregunta.objects.create(fase=cls.f["resumen_evaluacion"], texto="¿El resumen es claro?")
        cls.preg_ext = Pregunta.objects.create(fase=cls.f["extenso_evaluacion"], texto="¿El extenso sigue la plantilla?")

    def setUp(self):
        self.c = APIClient()

    # --- ayudas -------------------------------------------------------------------------------------
    def enviar_resumen(self):
        self.c.force_authenticate(self.pon)
        r = self.c.post("/api/trabajos/mis-solicitudes/", {
            "congreso": self.congreso.pk, "actividad": self.act.pk, "area": self.area.pk,
            "titulo": "Secador solar", "resumen": RESUMEN, "palabras_clave": "solar"}, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        return Trabajo.objects.get(pk=r.json()["id"])

    def coord_asigna(self, trabajo, usuario):
        """El coordinador lee el resumen y asigna al evaluador: así queda aprobado para evaluación."""
        self.c.force_authenticate(self.coord)
        r = self.c.post(f"/api/trabajos/solicitudes/{trabajo.pk}/evaluadores/", {"usuario": usuario.pk}, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        trabajo.refresh_from_db()

    def evaluar(self, usuario, trabajo, etapa, dictamen, comentario="", respuesta=True):
        pregunta = self.preg_res if etapa == "resumen" else self.preg_ext
        fila = Evaluador.objects.filter(usuario=usuario, trabajo=trabajo, etapa=etapa, dictamen__isnull=True).get()
        self.c.force_authenticate(usuario)
        r = self.c.post(f"/api/evaluaciones/asignadas/{fila.pk}/enviar/", {
            "respuestas": [{"pregunta": pregunta.pk, "cumple": respuesta, "comentario": "" if respuesta else "Falta objetivo"}],
            "dictamen": dictamen, "comentario": comentario}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        trabajo.refresh_from_db()

    def subir_extenso(self, trabajo):
        self.c.force_authenticate(self.pon)
        r = self.c.post(f"/api/trabajos/mis-solicitudes/{trabajo.pk}/extenso/",
                        {"archivo": SimpleUploadedFile("e.pdf", b"%PDF-1.4 x")}, format="multipart")
        self.assertEqual(r.status_code, 201, r.content)
        trabajo.refresh_from_db()

    def fase(self, t):
        return t.fase.nombre.lower()

    # --- pruebas ------------------------------------------------------------------------------------
    def test_al_enviar_el_resumen_no_se_asigna_evaluador_hasta_que_el_coordinador_lo_hace(self):
        t = self.enviar_resumen()
        self.assertEqual(self.fase(t), "resumen_enviado")
        self.assertFalse(Evaluador.objects.filter(trabajo=t).exists())
        self.coord_asigna(t, self.evs[0])
        self.assertEqual(self.fase(t), "resumen_evaluacion")                       # asignar = aprobar para evaluación
        fila = Evaluador.objects.get(trabajo=t)
        self.assertEqual((fila.usuario, fila.etapa, fila.ronda, fila.numero), (self.evs[0], "resumen", 1, 1))

    def test_borrar_congreso_con_trabajos_y_evaluaciones(self):
        from io import StringIO

        from django.core.management import call_command

        Congreso.objects.create(
            nombre_congreso="CONING", edicion_congreso=21, modalidad_congreso="Presencial", correo_congreso="c@x.com",
            contrasena_aplicacion="x", contacto_correo="c@x.com", contacto_telefono="5512345678",
        )
        t = self.enviar_resumen()
        self.coord_asigna(t, self.evs[0])
        self.evaluar(self.evs[0], t, "resumen", "aceptado")
        call_command("borrar_congreso", 22, "--con-trabajos", stdout=StringIO())   # vista previa: no borra
        self.assertTrue(Trabajo.objects.filter(pk=t.pk).exists())
        call_command("borrar_congreso", 22, "--con-trabajos", "--si", stdout=StringIO())
        self.assertFalse(Trabajo.objects.filter(pk=t.pk).exists())
        self.assertFalse(Congreso.objects.filter(edicion_congreso=22).exists())
        self.assertTrue(User.objects.filter(email="pon@x.com").exists())          # los usuarios se conservan

    def test_camino_feliz_del_resumen_al_extenso_aprobado(self):
        t = self.enviar_resumen()
        e1 = self.evs[0]
        self.coord_asigna(t, e1)
        self.evaluar(e1, t, "resumen", "aceptado")
        self.assertEqual(self.fase(t), "resumen_aprobado")

        self.subir_extenso(t)
        self.assertEqual(self.fase(t), "extenso_evaluacion")
        self.assertEqual(Evaluador.objects.get(trabajo=t, etapa="extenso").usuario, e1)   # el mismo evaluador del resumen
        self.evaluar(e1, t, "extenso", "aceptado")
        self.assertEqual(self.fase(t), "extenso_evaluacion")                        # falta el segundo
        self.assertFalse(Evaluador.objects.filter(trabajo=t, etapa="extenso", numero=2).exists())   # no se asigna solo
        self.coord_asigna(t, self.evs[1])
        ext2 = Evaluador.objects.get(trabajo=t, etapa="extenso", numero=2)
        self.assertEqual((ext2.usuario, ext2.ronda), (self.evs[1], Evaluador.objects.get(trabajo=t, etapa="extenso", numero=1).ronda))
        self.evaluar(ext2.usuario, t, "extenso", "aceptado")
        self.assertEqual(self.fase(t), "extenso_aprobado")

    def test_resumen_con_cambios_vuelve_al_ponente_y_al_mismo_evaluador(self):
        t = self.enviar_resumen()
        ev = self.evs[1]
        self.coord_asigna(t, ev)
        self.evaluar(ev, t, "resumen", "aceptado_cambios", comentario="Precisa el objetivo", respuesta=False)
        self.assertEqual(self.fase(t), "resumen_enviado")
        self.assertIn("Precisa el objetivo", t.observaciones)
        self.assertIn("¿El resumen es claro?", t.observaciones)
        self.c.force_authenticate(self.pon)
        self.assertTrue(self.c.get("/api/trabajos/mis-solicitudes/").json()[0]["puede_editar"])
        r = self.c.patch(f"/api/trabajos/mis-solicitudes/{t.pk}/", {"titulo": "Secador solar corregido"}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        t.refresh_from_db()
        self.assertEqual(self.fase(t), "resumen_evaluacion")                        # no necesita al coordinador otra vez
        self.assertEqual(Evaluador.objects.get(trabajo=t, ronda=2).usuario, ev)
        self.evaluar(ev, t, "resumen", "aceptado")
        self.assertEqual(self.fase(t), "resumen_aprobado")
        self.assertEqual(t.observaciones, "")

    def test_corregir_un_resumen_que_nunca_tuvo_evaluador_no_lo_manda_solo(self):
        t = self.enviar_resumen()
        self.c.force_authenticate(self.pon)
        self.assertEqual(self.c.patch(f"/api/trabajos/mis-solicitudes/{t.pk}/", {"titulo": "Otro título"}, format="json").status_code, 200)
        t.refresh_from_db()
        self.assertEqual(self.fase(t), "resumen_enviado")
        self.assertFalse(Evaluador.objects.filter(trabajo=t).exists())

    def test_resumen_que_debe_modificarse_vuelve_al_ponente_que_puede_editarlo(self):
        t = self.enviar_resumen()
        self.coord_asigna(t, self.evs[0])
        self.evaluar(self.evs[0], t, "resumen", "rechazado", comentario="Fuera del tema del congreso", respuesta=False)
        t.refresh_from_db()
        self.assertEqual(self.fase(t), "resumen_enviado")                           # editable, no un callejón sin salida
        self.assertIn("Fuera del tema del congreso", t.observaciones)
        self.c.force_authenticate(self.pon)
        self.assertTrue(next(x for x in self.c.get("/api/trabajos/mis-solicitudes/").json() if x["id"] == t.pk)["puede_editar"])
        self.assertEqual(self.c.patch(f"/api/trabajos/mis-solicitudes/{t.pk}/", {"resumen": "Resumen corregido " * 20}, format="json").status_code, 200)
        t.refresh_from_db()
        self.assertEqual(self.fase(t), "resumen_evaluacion")                        # regresó al mismo evaluador
        self.assertEqual(Evaluador.objects.get(trabajo=t, ronda=2).usuario, self.evs[0])

    def test_no_se_puede_aceptar_un_resumen_con_respuestas_no(self):
        t = self.enviar_resumen()
        self.coord_asigna(t, self.evs[0])
        self.c.force_authenticate(self.evs[0])
        fila = Evaluador.objects.get(trabajo=t)
        r = self.c.post(f"/api/evaluaciones/asignadas/{fila.pk}/enviar/", {
            "respuestas": [{"pregunta": self.preg_res.pk, "cumple": False, "comentario": "Falta objetivo"}], "dictamen": "aceptado"}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_resumen_rechazado_a_mano_tambien_se_puede_corregir(self):
        t = self.enviar_resumen()
        self.coord_asigna(t, self.evs[0])
        self.c.force_authenticate(self.coord)
        self.assertEqual(self.c.post(f"/api/trabajos/solicitudes/{t.pk}/dictamen/", {"accion": "rechazar", "observaciones": "No cumple el formato pedido"}, format="json").status_code, 200)
        t.refresh_from_db()
        self.assertEqual(self.fase(t), "resumen_rechazado")
        self.c.force_authenticate(self.pon)
        self.assertEqual(self.c.patch(f"/api/trabajos/mis-solicitudes/{t.pk}/", {"resumen": "Resumen corregido " * 20}, format="json").status_code, 200)
        t.refresh_from_db()
        self.assertEqual(self.fase(t), "resumen_evaluacion")

    def test_extenso_con_cambios_debe_modificarse_y_reinicia_con_el_primer_evaluador(self):
        t = self.enviar_resumen()
        e1 = self.evs[0]
        self.coord_asigna(t, e1)
        self.evaluar(e1, t, "resumen", "aceptado")
        self.subir_extenso(t)
        self.evaluar(e1, t, "extenso", "aceptado_cambios", comentario="Usa la plantilla", respuesta=False)
        self.assertEqual(self.fase(t), "extenso_rechazado")
        self.assertIn("Usa la plantilla", t.observaciones)
        self.subir_extenso(t)                                                       # el ponente corrige y reenvía
        self.assertEqual(self.fase(t), "extenso_evaluacion")
        self.assertEqual(Evaluador.objects.get(trabajo=t, etapa="extenso", ronda=2).usuario, e1)

    def _trabajo_con_extenso_en_primer_evaluador(self):
        t = self.enviar_resumen()
        self.coord_asigna(t, self.evs[0])
        self.evaluar(self.evs[0], t, "resumen", "aceptado")
        self.subir_extenso(t)
        return t

    def test_el_segundo_evaluador_lo_asigna_el_coordinador_y_el_sistema_avisa_que_falta(self):
        t = self._trabajo_con_extenso_en_primer_evaluador()
        self.evaluar(self.evs[0], t, "extenso", "aceptado")
        self.assertFalse(Evaluador.objects.filter(trabajo=t, etapa="extenso", numero=2).exists())
        self.c.force_authenticate(self.coord)
        lista = self.c.get("/api/trabajos/solicitudes/").data
        fila = next(x for x in lista["resultados"] if x["id"] == t.pk)
        self.assertTrue(fila["espera_evaluador"])
        self.assertEqual(fila["evaluadores_requeridos"], 2)

    def test_el_coordinador_no_puede_asignar_al_autor_ni_a_quien_llego_a_su_maximo(self):
        self.congreso.max_trabajos_por_evaluador = 1
        self.congreso.save()
        t = self._trabajo_con_extenso_en_primer_evaluador()
        otro = self.enviar_resumen()
        self.coord_asigna(otro, self.evs[1])                                        # ev2 ya está en su máximo
        self.evaluar(self.evs[0], t, "extenso", "aceptado")
        self.c.force_authenticate(self.coord)
        r = self.c.post(f"/api/trabajos/solicitudes/{t.pk}/evaluadores/", {"usuario": self.evs[1].pk}, format="json")
        self.assertEqual(r.status_code, 409)
        lista = self.c.get(f"/api/trabajos/evaluadores/?congreso={self.congreso.pk}").data
        ev2 = next(x for x in lista if x["id"] == self.evs[1].pk)
        self.assertTrue(ev2["lleno"])
        self.assertEqual((ev2["asignados"], ev2["maximo"]), (1, 1))
        self.congreso.max_trabajos_por_evaluador = 2                                # subir el tope lo habilita
        self.congreso.save()
        self.assertEqual(self.c.post(f"/api/trabajos/solicitudes/{t.pk}/evaluadores/", {"usuario": self.evs[1].pk}, format="json").status_code, 201)

    def test_excepcion_por_evaluador_sube_o_baja_su_tope(self):
        from congreso.models import LimiteEvaluador
        self.congreso.max_trabajos_por_evaluador = 1
        self.congreso.save()
        self.c.force_authenticate(self.coord)
        r = self.c.post("/api/congreso/limites/evaluadores/", {"correo": self.evs[1].email, "congreso": self.congreso.pk, "limite_personalizado": 3}, format="json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data["excepciones_evaluador"][0]["limite_personalizado"], 3)
        for _ in range(2):                                                          # ev2 puede recibir más que el general
            self.coord_asigna(self.enviar_resumen(), self.evs[1])
        lista = self.c.get(f"/api/trabajos/evaluadores/?congreso={self.congreso.pk}").data
        ev2 = next(x for x in lista if x["id"] == self.evs[1].pk)
        self.assertEqual((ev2["asignados"], ev2["maximo"], ev2["lleno"]), (2, 3, False))
        self.assertEqual(next(x for x in lista if x["id"] == self.evs[0].pk)["maximo"], 1)   # los demás siguen con el general
        self.assertEqual(self.c.post("/api/congreso/limites/evaluadores/", {"correo": self.pon.email, "congreso": self.congreso.pk, "limite_personalizado": 3}, format="json").status_code, 400)
        self.assertEqual(self.c.delete(f"/api/congreso/limites/evaluadores/{LimiteEvaluador.objects.get().pk}/").status_code, 200)
        self.assertFalse(LimiteEvaluador.objects.exists())

    def test_el_ponente_puede_cambiar_el_extenso_hasta_que_alguien_lo_dictamine(self):
        t = self._trabajo_con_extenso_en_primer_evaluador()
        self.subir_extenso(t)                                                       # reemplazo: sigue en evaluación, mismo evaluador
        self.assertEqual(self.fase(t), "extenso_evaluacion")
        self.assertEqual(Evaluador.objects.filter(trabajo=t, etapa="extenso").count(), 1)
        self.evaluar(self.evs[0], t, "extenso", "aceptado")
        self.c.force_authenticate(self.pon)
        r = self.c.post(f"/api/trabajos/mis-solicitudes/{t.pk}/extenso/", {"archivo": SimpleUploadedFile("e2.pdf", b"%PDF-1.4 y")}, format="multipart")
        self.assertEqual(r.status_code, 409)                                        # ya hubo un dictamen: se bloquea

    # --- fechas importantes (plazos del proceso) -----------------------------------------------------
    def fechas(self, **plazos):
        """plazos: clave -> (dias_desde_hoy_inicio, dias_desde_hoy_fin). Reemplaza las fechas del congreso."""
        CongresoFechaImportante.objects.filter(congreso=self.congreso).delete()
        hoy = timezone.localdate()
        for clave, (a, b) in plazos.items():
            fi, _ = FechaImportante.objects.get_or_create(nombre=vt.NOMBRES[clave])
            CongresoFechaImportante.objects.create(congreso=self.congreso, fecha_importante=fi,
                                                   fecha_inicio=hoy + datetime.timedelta(days=a), fecha_fin=hoy + datetime.timedelta(days=b))

    def test_evaluador_ve_su_plazo_de_evaluacion(self):
        t = self.enviar_resumen()
        self.coord_asigna(t, self.evs[0])
        fila = Evaluador.objects.get(trabajo=t)
        self.c.force_authenticate(self.evs[0])
        self.assertIsNone(self.c.get(f"/api/evaluaciones/asignadas/{fila.pk}/").json()["plazo"])      # sin fechas: sin aviso
        self.fechas(evaluacion_resumen=(-1, 3))
        p = self.c.get(f"/api/evaluaciones/asignadas/{fila.pk}/").json()["plazo"]
        self.assertTrue(p["abierta"])
        self.assertIn("para evaluar este trabajo", p["mensaje"])
        self.fechas(evaluacion_resumen=(2, 4))
        p = self.c.get(f"/api/evaluaciones/asignadas/{fila.pk}/").json()["plazo"]
        self.assertTrue(p["futura"])
        self.assertIn("Todavía no", p["mensaje"])

    def mi(self, t):
        self.c.force_authenticate(self.pon)
        return next(x for x in self.c.get("/api/trabajos/mis-solicitudes/").json() if x["id"] == t.pk)

    def asignar_status(self, t, usuario):
        self.c.force_authenticate(self.coord)
        return self.c.post(f"/api/trabajos/solicitudes/{t.pk}/evaluadores/", {"usuario": usuario.pk}, format="json")

    def test_durante_la_recepcion_el_ponente_edita_y_el_coordinador_aun_no_asigna(self):
        t = self.enviar_resumen()
        self.fechas(recepcion=(-1, 6), asignacion_resumen=(7, 12))
        self.assertTrue(self.mi(t)["puede_editar"])
        self.assertEqual(self.c.patch(f"/api/trabajos/mis-solicitudes/{t.pk}/", {"titulo": "Nuevo título"}, format="json").status_code, 200)
        r = self.asignar_status(t, self.evs[0])
        self.assertEqual(r.status_code, 409)
        self.assertIn("Todavía no se pueden asignar", r.json()["detail"])
        self.c.force_authenticate(self.coord)
        fila = next(x for x in self.c.get("/api/trabajos/solicitudes/").json()["resultados"] if x["id"] == t.pk)
        self.assertIn("Todavía no", fila["asignacion_bloqueada"])

    def test_al_cerrar_la_recepcion_el_ponente_ya_no_edita_y_se_abre_la_asignacion(self):
        t = self.enviar_resumen()
        self.fechas(recepcion=(-10, -1), asignacion_resumen=(0, 5), evaluacion_resumen=(0, 10))
        datos = self.mi(t)
        self.assertFalse(datos["puede_editar"])
        self.assertIn("Ya no se puede editar ni retirar el resumen", datos["aviso_edicion"])
        self.assertEqual(self.c.patch(f"/api/trabajos/mis-solicitudes/{t.pk}/", {"titulo": "Otro"}, format="json").status_code, 409)
        self.assertEqual(self.c.delete(f"/api/trabajos/mis-solicitudes/{t.pk}/").status_code, 409)
        self.assertEqual(self.asignar_status(t, self.evs[0]).status_code, 201)

    def test_fuera_del_plazo_de_asignacion_el_coordinador_no_puede(self):
        t = self.enviar_resumen()
        self.fechas(recepcion=(-10, -5), asignacion_resumen=(-4, -2))
        r = self.asignar_status(t, self.evs[0])
        self.assertEqual(r.status_code, 409)
        self.assertIn("Ya no se puede asignar evaluadores", r.json()["detail"])

    def test_el_evaluador_solo_envia_dentro_del_plazo_de_evaluacion(self):
        t = self.enviar_resumen()
        self.fechas(recepcion=(-10, -5), asignacion_resumen=(-4, 5), evaluacion_resumen=(2, 9))
        self.coord_asigna(t, self.evs[0])
        fila = Evaluador.objects.get(trabajo=t)
        self.c.force_authenticate(self.evs[0])
        cuerpo = {"respuestas": [{"pregunta": self.preg_res.pk, "cumple": True}], "dictamen": "aceptado"}
        r = self.c.post(f"/api/evaluaciones/asignadas/{fila.pk}/enviar/", cuerpo, format="json")
        self.assertEqual(r.status_code, 409)
        self.assertIn("Todavía no se puede enviar la evaluación", r.json()["detail"])
        self.fechas(recepcion=(-10, -5), asignacion_resumen=(-4, 5), evaluacion_resumen=(-1, 9))
        self.assertEqual(self.c.post(f"/api/evaluaciones/asignadas/{fila.pk}/enviar/", cuerpo, format="json").status_code, 200)

    def test_correcciones_del_resumen_se_permiten_en_el_periodo_de_evaluacion(self):
        t = self.enviar_resumen()
        self.coord_asigna(t, self.evs[0])
        self.evaluar(self.evs[0], t, "resumen", "aceptado_cambios", respuesta=False)
        self.fechas(recepcion=(-10, -5), asignacion_resumen=(-4, 5), evaluacion_resumen=(-3, 6))
        self.assertTrue(self.mi(t)["puede_editar"])                                 # devuelto: corrige durante la evaluación
        self.fechas(recepcion=(-10, -5), asignacion_resumen=(-4, 5), evaluacion_resumen=(-3, -1))
        datos = self.mi(t)
        self.assertFalse(datos["puede_editar"])
        self.assertIn("Ya no se puede corregir el resumen", datos["aviso_edicion"])

    def test_el_extenso_solo_se_sube_dentro_de_su_plazo(self):
        t = self.enviar_resumen()
        self.coord_asigna(t, self.evs[0])
        self.evaluar(self.evs[0], t, "resumen", "aceptado")
        self.fechas(entrega_extenso=(3, 9))
        self.c.force_authenticate(self.pon)
        r = self.c.post(f"/api/trabajos/mis-solicitudes/{t.pk}/extenso/", {"archivo": SimpleUploadedFile("e.pdf", b"%PDF-1.4 x")}, format="multipart")
        self.assertEqual(r.status_code, 409)
        self.assertIn("Todavía no se puede subir el extenso", r.json()["detail"])
        self.assertIn("Todavía no se puede subir el extenso", self.mi(t)["aviso_extenso"])
        self.fechas(entrega_extenso=(-1, 9))
        self.subir_extenso(t)
        self.assertEqual(self.fase(t), "extenso_evaluacion")

    def test_asignar_al_segundo_evaluador_del_extenso_respeta_su_plazo(self):
        t = self._trabajo_con_extenso_en_primer_evaluador()
        self.evaluar(self.evs[0], t, "extenso", "aceptado")
        self.fechas(entrega_extenso=(-9, -2), asignacion_extenso=(2, 8))
        self.assertIn("Todavía no se puede asignar evaluadores", self.asignar_status(t, self.evs[1]).json()["detail"])
        self.fechas(entrega_extenso=(-9, -2), asignacion_extenso=(-1, 8))
        self.assertEqual(self.asignar_status(t, self.evs[1]).status_code, 201)

    def test_el_orden_de_las_fechas_se_valida(self):
        hoy = timezone.localdate()
        d = datetime.timedelta
        mal = {vt.NOMBRES[vt.RECEPCION]: (hoy, hoy + d(days=6)), vt.NOMBRES[vt.ASIGNACION_RESUMEN]: (hoy + d(days=3), hoy + d(days=9))}
        self.assertEqual(len(vt.errores_de_orden((n, i, f) for n, (i, f) in mal.items())), 1)
        bien = {vt.NOMBRES[vt.RECEPCION]: (hoy, hoy + d(days=6)), vt.NOMBRES[vt.ASIGNACION_RESUMEN]: (hoy + d(days=7), hoy + d(days=9))}
        self.assertEqual(vt.errores_de_orden((n, i, f) for n, (i, f) in bien.items()), [])

    def test_el_resumen_solo_admite_un_evaluador(self):
        t = self.enviar_resumen()
        self.coord_asigna(t, self.evs[0])
        self.c.force_authenticate(self.coord)
        r = self.c.post(f"/api/trabajos/solicitudes/{t.pk}/evaluadores/", {"usuario": self.evs[1].pk}, format="json")
        self.assertEqual(r.status_code, 409)

    def test_el_evaluador_no_puede_enviar_si_el_coordinador_ya_movio_el_trabajo(self):
        t = self.enviar_resumen()
        self.coord_asigna(t, self.evs[0])
        fila = Evaluador.objects.get(trabajo=t)
        self.c.force_authenticate(self.coord)
        self.assertEqual(self.c.post(f"/api/trabajos/solicitudes/{t.pk}/dictamen/", {"accion": "aprobar"}, format="json").status_code, 200)
        self.c.force_authenticate(fila.usuario)
        r = self.c.post(f"/api/evaluaciones/asignadas/{fila.pk}/enviar/", {
            "respuestas": [{"pregunta": self.preg_res.pk, "cumple": True}], "dictamen": "aceptado"}, format="json")
        self.assertEqual(r.status_code, 409)
