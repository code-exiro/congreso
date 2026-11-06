from django.db import migrations

PRIVILEGES = {
    "documentos_legales.ver": ("Ver documentos legales", "Consultar todas las versiones."),
    "documentos_legales.crear": ("Crear documentos legales", "Capturar nuevas versiones sin publicarlas."),
    "documentos_legales.editar": ("Editar documentos legales", "Modificar borradores sin aceptaciones."),
    "documentos_legales.publicar": ("Publicar documentos legales", "Activar una versión vigente."),
    "documentos_legales.desactivar": ("Desactivar documentos legales", "Retirar una versión sin eliminar su historial."),
}

def seed(apps, schema_editor):
    Privilege = apps.get_model("users", "Privilege")
    for code, (name, description) in PRIVILEGES.items():
        Privilege.objects.get_or_create(code=code, defaults={"name": name, "description": description})

class Migration(migrations.Migration):
    dependencies = [("users", "0006_legal_document_inactive_default")]
    operations = [migrations.RunPython(seed, migrations.RunPython.noop)]
