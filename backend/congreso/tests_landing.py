from django.test import TestCase
from rest_framework.test import APIClient

from users.models import Privilege, Role, RolePrivilege, User, UserRole

from .models import Congreso, Pagina


def usuario(email, privilegio=None):
    u = User.objects.create_user(email=email, password="x12345678")
    if privilegio:
        r = Role.objects.create(name=f"r-{email}")
        p, _ = Privilege.objects.get_or_create(code=privilegio, defaults={"name": privilegio})
        RolePrivilege.objects.create(role=r, privilege=p)
        UserRole.objects.create(user=u, role=r)
    return u


def congreso(ed=1):
    return Congreso.objects.create(
        nombre_congreso="CONING", edicion_congreso=ed, modalidad_congreso="Presencial", correo_congreso="a@b.mx",
    )


class LandingTests(TestCase):
    def setUp(self):
        self.c = APIClient()
        self.cong = congreso(1)

    def test_get_publico(self):
        r = self.c.get("/api/landing/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["congreso"]["edicion"], 1)

    def test_la_landing_muestra_las_fechas_importantes_del_congreso(self):
        import datetime
        from . import ventanas as vt
        from .models import CongresoFechaImportante, FechaImportante
        self.assertEqual(self.c.get("/api/landing/").data["fechas_proceso"], [])           # sin fechas configuradas
        hoy = datetime.date.today()
        for clave, (i, f) in {vt.ENTREGA_EXTENSO: (10, 12), vt.RECEPCION: (0, 5)}.items():
            fi, _ = FechaImportante.objects.get_or_create(nombre=vt.NOMBRES[clave])
            CongresoFechaImportante.objects.create(congreso=self.cong, fecha_importante=fi,
                                                   fecha_inicio=hoy + datetime.timedelta(days=i), fecha_fin=hoy + datetime.timedelta(days=f))
        fechas = self.c.get("/api/landing/").data["fechas_proceso"]
        self.assertEqual([x["title"] for x in fechas], [vt.NOMBRES[vt.RECEPCION], vt.NOMBRES[vt.ENTREGA_EXTENSO]])   # en orden de fecha
        self.assertEqual(fechas[0]["startDate"], hoy.isoformat())
        self.assertTrue(all(x["proceso"] and x["color"] for x in fechas))

    def test_la_landing_muestra_los_archivos_subidos_al_crear_el_congreso(self):
        import shutil
        import tempfile
        from django.core.files.uploadedfile import SimpleUploadedFile
        from django.test import override_settings
        media = tempfile.mkdtemp()
        try:
            with override_settings(MEDIA_ROOT=media):
                self.assertEqual(self.c.get("/api/landing/").data["documentos_congreso"], [])
                self.cong.convocatoria = SimpleUploadedFile("conv.pdf", b"%PDF-1.4 x")
                self.cong.plantilla_extenso = SimpleUploadedFile("ext.docx", b"x")
                self.cong.plantilla_constancia = SimpleUploadedFile("const.docx", b"x")
                self.cong.save()
                docs = self.c.get("/api/landing/").data["documentos_congreso"]
        finally:
            shutil.rmtree(media, ignore_errors=True)
        por_titulo = {d["title"]: d for d in docs}
        self.assertEqual(por_titulo["Convocatoria"]["category"], "oficial")
        self.assertEqual(por_titulo["Plantilla de extensos"]["category"], "plantilla")
        self.assertTrue(por_titulo["Convocatoria"]["url"].startswith("http"))
        self.assertNotIn("Plantilla de constancia", por_titulo)          # la de constancias es de uso interno
        self.assertEqual(len(docs), 2)

    def test_put_requiere_admin(self):
        self.assertEqual(self.c.put("/api/landing/", {"contenido": {"a": 1}}, format="json").status_code, 401)
        self.c.force_authenticate(usuario("p@x.mx"))
        self.assertEqual(self.c.put("/api/landing/", {"contenido": {"a": 1}}, format="json").status_code, 403)

    def test_admin_guarda_y_nuevo_congreso_hereda(self):
        self.c.force_authenticate(usuario("a@x.mx", "diseño_pagina"))
        r = self.c.put("/api/landing/", {"contenido": {"colorPrimario": "#111111"}}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(self.c.get("/api/landing/").data["contenido"]["colorPrimario"], "#111111")
        from .landing import heredar_contenido
        nuevo = congreso(2)
        heredar_contenido(nuevo)
        self.assertEqual(Pagina.objects.get(congreso=nuevo).contenido["colorPrimario"], "#111111")
        self.assertEqual(self.c.get("/api/landing/").data["congreso"]["edicion"], 2)

    def test_archivo_formato_invalido(self):
        from django.core.files.uploadedfile import SimpleUploadedFile
        self.c.force_authenticate(usuario("a@x.mx", "diseño_pagina"))
        r = self.c.post("/api/landing/archivos/", {"archivo": SimpleUploadedFile("x.exe", b"1")}, format="multipart")
        self.assertEqual(r.status_code, 400)


class ConectarDatosCongresoTests(TestCase):
    def test_edicion_modalidad_sede_y_periodo_pasan_a_la_landing_sin_perder_lo_heredado(self):
        import datetime
        from .landing import conectar_datos_congreso, heredar_contenido
        from .models import CongresoFechaImportante, FechaImportante

        previo = congreso(21)
        Pagina.objects.create(congreso=previo, contenido={
            "colorPrimario": "#111111",
            "convocatoria": {"edition": "21°", "title": "Título editado", "period": "del 1 al 2 de enero de 2026.", "venue": "Otra sede"},
        })
        nuevo = congreso(22)
        nuevo.ubicacion_sede = "FES Cuautitlán, UNAM"
        nuevo.modalidad_congreso = "Híbrido"
        nuevo.save()
        heredar_contenido(nuevo)
        realiza = FechaImportante.objects.get_or_create(nombre="Realización del congreso")[0]
        CongresoFechaImportante.objects.create(congreso=nuevo, fecha_importante=realiza,
                                               fecha_inicio=datetime.date(2027, 8, 30), fecha_fin=datetime.date(2027, 9, 3))
        conectar_datos_congreso(nuevo)

        c = Pagina.objects.get(congreso=nuevo).contenido
        self.assertEqual(c["colorPrimario"], "#111111")               # lo heredado se conserva
        self.assertEqual(c["convocatoria"]["title"], "Título editado")  # y lo editable también
        self.assertEqual(c["convocatoria"]["edition"], "22°")
        self.assertEqual(c["convocatoria"]["modality"], "Híbrido")
        self.assertEqual(c["convocatoria"]["venue"], "FES Cuautitlán, UNAM")
        self.assertEqual(c["convocatoria"]["period"], "del 30 de agosto al 3 de septiembre de 2027.")
        # el congreso anterior no se modifica
        self.assertEqual(Pagina.objects.get(congreso=previo).contenido["convocatoria"]["edition"], "21°")

    def test_sin_fecha_de_realizacion_conserva_el_periodo_anterior(self):
        from .landing import conectar_datos_congreso
        cg = congreso(5)
        Pagina.objects.create(congreso=cg, contenido={"convocatoria": {"period": "viejo"}})
        conectar_datos_congreso(cg)
        self.assertEqual(Pagina.objects.get(congreso=cg).contenido["convocatoria"]["period"], "viejo")


class BorrarCongresoTests(TestCase):
    def test_borra_solo_el_de_prueba_y_la_landing_regresa_al_anterior(self):
        from io import StringIO
        from django.core.management import call_command
        from django.core.management.base import CommandError
        anterior = congreso(22)
        Pagina.objects.create(congreso=anterior, contenido={"x": 1})
        prueba = congreso(99)
        Pagina.objects.create(congreso=prueba, contenido={"x": 2})
        self.assertEqual(APIClient().get("/api/landing/").data["congreso"]["edicion"], 99)

        out = StringIO()
        call_command("borrar_congreso", edicion=99, stdout=out)            # simulacro: no borra
        self.assertTrue(Congreso.objects.filter(edicion_congreso=99).exists())
        call_command("borrar_congreso", edicion=99, confirmar=True, stdout=out)
        self.assertFalse(Congreso.objects.filter(edicion_congreso=99).exists())
        self.assertEqual(Pagina.objects.get(congreso=anterior).contenido, {"x": 1})
        self.assertEqual(APIClient().get("/api/landing/").data["congreso"]["edicion"], 22)
        with self.assertRaises(CommandError):                              # el único que queda no se borra
            call_command("borrar_congreso", edicion=22, confirmar=True, stdout=out)
