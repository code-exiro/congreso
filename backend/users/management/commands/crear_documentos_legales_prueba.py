from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from users.models import LegalDocument

DOCUMENTOS = (
    (LegalDocument.Type.TERMS, "Términos y condiciones (DOCUMENTO DE PRUEBA)", "terminos_prueba.pdf"),
    (LegalDocument.Type.PRIVACY_NOTICE, "Aviso de privacidad (DOCUMENTO DE PRUEBA)", "aviso_privacidad_prueba.pdf"),
)


def pdf_minimo(titulo):
    """PDF de una página con texto, generado a mano (sin dependencias)."""
    texto = f"{titulo} - Documento provisional solo para pruebas".replace("(", "").replace(")", "")
    texto = texto.encode("latin-1", "replace").decode("latin-1")
    flujo = f"BT /F1 14 Tf 50 750 Td ({texto}) Tj ET"
    objetos = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
        f"<< /Length {len(flujo)} >>\nstream\n{flujo}\nendstream",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    salida = "%PDF-1.4\n"
    posiciones = []
    for i, obj in enumerate(objetos, 1):
        posiciones.append(len(salida.encode("latin-1")))
        salida += f"{i} 0 obj\n{obj}\nendobj\n"
    inicio = len(salida.encode("latin-1"))
    salida += f"xref\n0 {len(objetos) + 1}\n0000000000 65535 f \n"
    salida += "".join(f"{p:010d} 00000 n \n" for p in posiciones)
    salida += f"trailer\n<< /Size {len(objetos) + 1} /Root 1 0 R >>\nstartxref\n{inicio}\n%%EOF\n"
    return salida.encode("latin-1")


class Command(BaseCommand):
    help = "Crea y publica un Aviso de privacidad y unos Términos y condiciones de PRUEBA (idempotente; no toca los que ya estén vigentes)."

    @transaction.atomic
    def handle(self, *args, **options):
        for tipo, nombre, archivo in DOCUMENTOS:
            if LegalDocument.objects.filter(type=tipo, is_active=True).exists():
                self.stdout.write(f"Ya hay un documento vigente de tipo {tipo}; se deja igual.")
                continue
            doc = LegalDocument(
                type=tipo, version="PRUEBA-1", name=nombre,
                published_at=timezone.now() - timezone.timedelta(minutes=1), is_active=True,
            )
            doc.file.save(archivo, ContentFile(pdf_minimo(nombre)), save=False)
            doc.save()
            self.stdout.write(self.style.SUCCESS(f"Creado y publicado: {nombre}"))
