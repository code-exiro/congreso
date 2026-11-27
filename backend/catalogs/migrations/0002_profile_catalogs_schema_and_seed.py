import json
from pathlib import Path

from django.db import migrations, models
import django.db.models.deletion


def seed_profile_catalogs(apps, schema_editor):
    alias = schema_editor.connection.alias
    Country = apps.get_model("catalogs", "Country")
    State = apps.get_model("catalogs", "State")
    Area = apps.get_model("catalogs", "Area")
    AcademicLevel = apps.get_model("catalogs", "AcademicLevel")
    AcademicStatus = apps.get_model("catalogs", "AcademicStatus")
    Institution = apps.get_model("catalogs", "Institution")
    DialingCode = apps.get_model("catalogs", "DialingCode")

    data_path = Path(__file__).resolve().parent.parent / "data" / "profile_catalogs.json"
    with data_path.open("r", encoding="utf-8") as fh:
        payload = json.load(fh)

    # 1. Países
    existing_countries = {
        name.lower(): obj
        for obj in Country.objects.using(alias).all()
        for name in (obj.name,)
    }
    new_countries = [
        Country(name=name)
        for name in payload["countries"]
        if name.lower() not in existing_countries
    ]
    if new_countries:
        Country.objects.using(alias).bulk_create(new_countries, ignore_conflicts=True)
    country_map = {obj.name.lower(): obj for obj in Country.objects.using(alias).all()}

    # 2. Estados por país
    existing_states = set(
        State.objects.using(alias).values_list("country_id", "name")
    )
    existing_states_ci = {(cid, name.lower()) for cid, name in existing_states}
    new_states = []
    for country_name, state_names in payload["states_by_country"].items():
        country = country_map.get(country_name.lower())
        if not country:
            continue
        for state_name in state_names:
            key = (country.pk, state_name.lower())
            if key not in existing_states_ci:
                existing_states_ci.add(key)
                new_states.append(State(country_id=country.pk, name=state_name))
    if new_states:
        State.objects.using(alias).bulk_create(new_states, batch_size=500, ignore_conflicts=True)

    # 3. Áreas
    for item in payload["areas"]:
        Area.objects.using(alias).update_or_create(
            code=item["code"],
            defaults={"name": item["name"]},
        )

    # 4. Niveles académicos
    for item in payload["academic_levels"]:
        existing = AcademicLevel.objects.using(alias).filter(degree__iexact=item["degree"]).first()
        if existing is None:
            AcademicLevel.objects.using(alias).create(
                degree=item["degree"],
                description=item["description"],
            )
        elif not existing.description and item["description"]:
            existing.description = item["description"]
            existing.save(using=alias, update_fields=["description"])

    # 5. Estatus académico (Cursando / Terminado)
    for item in payload["academic_statuses"]:
        AcademicStatus.objects.using(alias).update_or_create(
            code=item["code"],
            defaults={"name": item["name"]},
        )

    # 6. Instituciones
    existing_insts = {
        obj.name.lower(): obj for obj in Institution.objects.using(alias).all()
    }
    new_insts = []
    for item in payload["institutions"]:
        key = item["name"].lower()
        if key not in existing_insts:
            new_insts.append(Institution(name=item["name"], acronym=item["acronym"]))
        else:
            obj = existing_insts[key]
            if not obj.acronym and item["acronym"]:
                obj.acronym = item["acronym"]
                obj.save(using=alias, update_fields=["acronym"])
    if new_insts:
        Institution.objects.using(alias).bulk_create(new_insts, batch_size=200, ignore_conflicts=True)

    # 7. Ladas telefónicas
    existing_ladas = {
        (code, cname.lower())
        for code, cname in DialingCode.objects.using(alias).values_list("code", "country_name")
    }
    new_ladas = []
    for item in payload["dialing_codes"]:
        key = (item["code"], item["country_name"].lower())
        if key not in existing_ladas:
            existing_ladas.add(key)
            country = country_map.get(item["country_name"].lower())
            new_ladas.append(
                DialingCode(
                    code=item["code"],
                    country_name=item["country_name"],
                    country_id=country.pk if country else None,
                )
            )
    if new_ladas:
        DialingCode.objects.using(alias).bulk_create(new_ladas, batch_size=200, ignore_conflicts=True)


class Migration(migrations.Migration):

    dependencies = [
        ("catalogs", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="institution",
            name="acronym",
            field=models.CharField(
                blank=True,
                default="",
                max_length=50,
                verbose_name="acrónimo",
            ),
        ),
        migrations.CreateModel(
            name="AcademicStatus",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "code",
                    models.CharField(
                        max_length=30,
                        unique=True,
                        verbose_name="clave de estatus académico",
                    ),
                ),
                (
                    "name",
                    models.CharField(
                        max_length=50,
                        unique=True,
                        verbose_name="estatus académico",
                    ),
                ),
            ],
            options={
                "verbose_name": "estatus académico",
                "verbose_name_plural": "estatus académicos",
                "ordering": ["id"],
            },
        ),
        migrations.CreateModel(
            name="DialingCode",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "code",
                    models.CharField(
                        max_length=50,
                        verbose_name="lada telefónica",
                    ),
                ),
                (
                    "country_name",
                    models.CharField(
                        max_length=150,
                        verbose_name="país de la lada",
                    ),
                ),
                (
                    "country",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="dialing_codes",
                        to="catalogs.country",
                        verbose_name="país",
                    ),
                ),
            ],
            options={
                "verbose_name": "lada telefónica",
                "verbose_name_plural": "ladas telefónicas",
                "ordering": ["country_name", "code"],
            },
        ),
        migrations.AddConstraint(
            model_name="dialingcode",
            constraint=models.UniqueConstraint(
                fields=("code", "country_name"),
                name="unique_dialing_code_per_country_name",
            ),
        ),
        migrations.RunPython(seed_profile_catalogs, migrations.RunPython.noop),
    ]
