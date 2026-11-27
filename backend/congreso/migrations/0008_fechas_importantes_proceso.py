from django.db import migrations

# BORRADOR local: fechas importantes que gobiernan el proceso de un trabajo (ver congreso/ventanas.py).
FECHAS = [
    ("Recepción de resúmenes", "Plazo para que los ponentes envíen, editen o retiren su resumen."),
    ("Asignación de evaluadores de resúmenes", "Plazo para que el coordinador asigne evaluador a cada resumen (empieza al cerrar la recepción)."),
    ("Evaluación de resúmenes", "Plazo para que los evaluadores califiquen resúmenes y los ponentes corrijan observaciones."),
    ("Entrega de extenso", "Plazo para que los ponentes suban o reemplacen su extenso."),
    ("Asignación de evaluadores de extensos", "Plazo para que el coordinador asigne evaluadores a los extensos."),
    ("Evaluación de extensos", "Plazo para que los evaluadores califiquen extensos y los ponentes corrijan observaciones."),
    ("Realización del congreso", "Fechas en que se lleva a cabo el congreso."),
]


def crear(apps, schema_editor):
    FechaImportante = apps.get_model("congreso", "FechaImportante")
    for nombre, descripcion in FECHAS:
        obj, creada = FechaImportante.objects.using(schema_editor.connection.alias).get_or_create(nombre=nombre, defaults={"descripcion": descripcion})
        if not creada and not obj.descripcion:
            obj.descripcion = descripcion
            obj.save(update_fields=["descripcion"])


class Migration(migrations.Migration):
    dependencies = [("congreso", "0007_limiteevaluador")]
    operations = [migrations.RunPython(crear, migrations.RunPython.noop)]
