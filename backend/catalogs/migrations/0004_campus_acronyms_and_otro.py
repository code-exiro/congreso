from django.db import migrations


CAMPUS_ACRONYM_UPDATES = {
    "Facultad de Estudios Superiores Cuautitlán": "FESC",
    "Facultad de Estudios Superiores Iztacala": "FESI",
    "Facultad de Estudios Superiores Zaragoza": "FESZ",
}


def update_acronyms_and_add_otro(apps, schema_editor):
    alias = schema_editor.connection.alias
    Institution = apps.get_model("catalogs", "Institution")
    Campus = apps.get_model("catalogs", "Campus")

    # 1. Actualizar abreviaciones de campus (FESC, FESI, FESZ)
    for campus_name, acronym in CAMPUS_ACRONYM_UPDATES.items():
        Campus.objects.using(alias).filter(name__iexact=campus_name).update(acronym=acronym)

    # 2. Agregar institución "Otro" y su campus "Otro"
    otro_inst = Institution.objects.using(alias).filter(name__iexact="Otro").first()
    if otro_inst is None:
        otro_inst = Institution.objects.using(alias).create(name="Otro", acronym="")

    otro_campus = (
        Campus.objects.using(alias)
        .filter(institution=otro_inst, name__iexact="Otro")
        .first()
    )
    if otro_campus is None:
        Campus.objects.using(alias).create(
            institution=otro_inst,
            name="Otro",
            acronym="",
        )


class Migration(migrations.Migration):

    dependencies = [
        ("catalogs", "0003_campus_and_seed"),
    ]

    operations = [
        migrations.RunPython(update_acronyms_and_add_otro, migrations.RunPython.noop),
    ]
