"""Subida y descarga del extenso (borrador local). Documento «extenso» del catálogo; el archivo se sirve con sesión."""
import logging
import os
import shutil
import subprocess
import tempfile
from pathlib import Path

from django.core.files.base import ContentFile
from django.http import FileResponse, Http404
from rest_framework import status
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from . import plazos
from .automatizacion import filas_vigentes, iniciar_revision
from .flujo import normalizar
from .models import Documento, Fase, Trabajo, TrabajoDocumento, UsuarioTrabajo
from .permissions import TieneAlgunPrivilegio

logger = logging.getLogger(__name__)
RUTAS_SOFFICE = (
    r"C:\Program Files\LibreOffice\program\soffice.exe",
    r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
    "/Applications/LibreOffice.app/Contents/MacOS/soffice",
)
EXTENSIONES = {".pdf", ".doc", ".docx"}
TAMANO_MAX = 10 * 1024 * 1024  # 10 MB
FASES_SUBIDA = {"resumen_aprobado", "extenso_enviado", "extenso_rechazado"}


def documento_extenso():
    doc, _ = Documento.objects.get_or_create(nombre="extenso", defaults={"tipo_documento": "DOC", "descripcion": "Extenso del trabajo"})
    return doc


def extenso_de(trabajo):
    return TrabajoDocumento.objects.filter(trabajo=trabajo, documento=documento_extenso()).first()


def fase_extenso_enviado(trabajo):
    for f in Fase.objects.filter(actividad=trabajo.actividad, activa=True):
        if normalizar(f.nombre) == "extenso_enviado":
            return f
    return None


def en_evaluacion_sin_dictamen(trabajo):
    """El extenso está con el evaluador pero nadie ha enviado todavía su dictamen: el ponente aún puede cambiar el archivo."""
    if normalizar(trabajo.fase.nombre) != "extenso_evaluacion":
        return False
    filas = list(filas_vigentes(trabajo, "extenso"))
    return bool(filas) and not any(f.dictamen for f in filas)


def puede_subir_extenso(trabajo, usuario):
    if normalizar(trabajo.fase.nombre) not in FASES_SUBIDA and not en_evaluacion_sin_dictamen(trabajo):
        return False
    if not plazos.subida_extenso(trabajo)[0]:
        return False
    if fase_extenso_enviado(trabajo) is None:
        return False
    return UsuarioTrabajo.objects.filter(trabajo=trabajo, usuario=usuario, es_autor=True).exists()


def info_extenso(trabajo):
    td = extenso_de(trabajo)
    if not td:
        return None
    return {"nombre": os.path.basename(td.contenido.name), "tamano": td.contenido.size if td.contenido.storage.exists(td.contenido.name) else None}


def _soffice():
    exe = shutil.which("soffice") or shutil.which("libreoffice")
    if exe:
        return exe
    return next((r for r in RUTAS_SOFFICE if os.path.exists(r)), None)


def _nombre_pdf(td):
    """Nombre en el almacenamiento de la versión PDF de un extenso en Word (el original no se toca)."""
    return td.contenido.name + ".pdf"


def es_pdf(td):
    return os.path.splitext(td.contenido.name)[1].lower() == ".pdf"


def borrar_pdf_derivado(td):
    if not es_pdf(td) and td.contenido.storage.exists(_nombre_pdf(td)):
        td.contenido.storage.delete(_nombre_pdf(td))


def convertir_a_pdf(td):
    """Convierte el extenso (DOC/DOCX) a PDF con LibreOffice y lo guarda junto al original. Devuelve True si quedó el PDF."""
    if es_pdf(td):
        return True
    storage = td.contenido.storage
    if storage.exists(_nombre_pdf(td)):
        return True
    exe = _soffice()
    if exe is None:
        logger.warning("No se encontró LibreOffice (soffice): el extenso %s no se pudo convertir a PDF.", td.contenido.name)
        return False
    try:
        with tempfile.TemporaryDirectory() as tmp:
            origen = os.path.join(tmp, "extenso" + os.path.splitext(td.contenido.name)[1].lower())
            with td.contenido.open("rb") as f, open(origen, "wb") as out:
                shutil.copyfileobj(f, out)
            perfil = Path(tmp, "perfil").as_uri()
            subprocess.run([exe, "--headless", "--norestore", f"-env:UserInstallation={perfil}", "--convert-to", "pdf", "--outdir", tmp, origen],
                           check=True, capture_output=True, timeout=120)
            destino = os.path.join(tmp, "extenso.pdf")
            if not os.path.exists(destino):
                return False
            with open(destino, "rb") as f:
                storage.save(_nombre_pdf(td), ContentFile(f.read()))
        return True
    except Exception:  # noqa: BLE001 — cualquier fallo de la conversión no debe tumbar la subida
        logger.exception("Falló la conversión a PDF de %s", td.contenido.name)
        return False


def responder_archivo(trabajo, original=False):
    """Sirve el extenso. Evaluador y coordinador lo reciben en PDF (se convierte si hace falta); el ponente, el original."""
    td = extenso_de(trabajo)
    if not td or not td.contenido.storage.exists(td.contenido.name):
        raise Http404("Este trabajo todavía no tiene extenso.")
    if original or es_pdf(td):
        return FileResponse(td.contenido.open("rb"), as_attachment=False, filename=os.path.basename(td.contenido.name))
    if not convertir_a_pdf(td):
        return Response({"detail": "El extenso está en Word y no se pudo convertir a PDF en este servidor. Pide al ponente que lo suba en PDF."},
                        status=status.HTTP_409_CONFLICT)
    nombre = os.path.splitext(os.path.basename(td.contenido.name))[0] + ".pdf"
    return FileResponse(td.contenido.storage.open(_nombre_pdf(td), "rb"), as_attachment=False, filename=nombre, content_type="application/pdf")


class ExtensoPonenteView(APIView):
    """GET descarga / POST sube el extenso de un trabajo propio. POST multipart con `archivo`."""

    permission_classes = [TieneAlgunPrivilegio]
    privilegios_por_metodo = {"GET": ("ver_sus_trabajos", "subir_trabajo"), "POST": ("subir_trabajo",)}
    parser_classes = [MultiPartParser]

    def _trabajo(self, request, pk):
        return Trabajo.objects.select_related("actividad", "fase").filter(pk=pk, autores__usuario=request.user).first()

    def get(self, request, pk):
        t = self._trabajo(request, pk)
        if not t:
            return Response({"detail": "No encontramos esa solicitud."}, status=status.HTTP_404_NOT_FOUND)
        return responder_archivo(t, original=True)

    def post(self, request, pk):
        t = self._trabajo(request, pk)
        if not t:
            return Response({"detail": "No encontramos esa solicitud."}, status=status.HTTP_404_NOT_FOUND)
        if not puede_subir_extenso(t, request.user):
            return Response({"detail": plazos.subida_extenso(t)[1] or "Todavía no puedes subir el extenso de este trabajo."}, status=status.HTTP_409_CONFLICT)
        archivo = request.FILES.get("archivo")
        if archivo is None:
            return Response({"detail": "Selecciona el archivo del extenso."}, status=status.HTTP_400_BAD_REQUEST)
        if os.path.splitext(archivo.name)[1].lower() not in EXTENSIONES:
            return Response({"detail": "El extenso debe ser un archivo PDF, DOC o DOCX."}, status=status.HTTP_400_BAD_REQUEST)
        if archivo.size > TAMANO_MAX:
            return Response({"detail": "El archivo no puede pesar más de 10 MB."}, status=status.HTTP_400_BAD_REQUEST)
        reemplazo_en_evaluacion = en_evaluacion_sin_dictamen(t)
        previo = extenso_de(t)
        if previo:
            borrar_pdf_derivado(previo)
            previo.contenido.delete(save=False)
            previo.delete()
        nuevo = TrabajoDocumento.objects.create(trabajo=t, documento=documento_extenso(), contenido=archivo)
        convertir_a_pdf(nuevo)  # el evaluador lo ve en PDF; si falla ahora se reintenta al abrirlo
        if not reemplazo_en_evaluacion:  # si ya estaba con el evaluador solo cambia el archivo: sigue en evaluación con el mismo evaluador
            t.fase = fase_extenso_enviado(t)
            t.observaciones = ""
            t.save()
            iniciar_revision(t, "extenso")  # lo revisa primero el evaluador del resumen, si puede
        from .serializers import serializar_trabajo
        return Response(serializar_trabajo(t, request.user), status=status.HTTP_201_CREATED)
