import json
from pathlib import Path

from django.db import migrations, models
import django.db.models.deletion


def seed_campuses(apps, schema_editor):
    alias = schema_editor.connection.alias
    Institution = apps.get_model("catalogs", "Institution")
    Campus = apps.get_model("catalogs", "Campus")

    data_path = Path(__file__).resolve().parent.parent / "data" / "profile_catalogs.json"
    with data_path.open("r", encoding="utf-8") as fh:
        payload = json.load(fh)

    inst_map = {obj.name.lower(): obj for obj in Institution.objects.using(alias).all()}
    existing = {
        (iid, name.lower())
        for iid, name in Campus.objects.using(alias).values_list("institution_id", "name")
    }

    new_campuses = []
    for inst_name, items in payload.get("campuses_by_institution", {}).items():
        inst = inst_map.get(inst_name.lower())
        if not inst:
            continue
        for item in items:
            key = (inst.pk, item["name"].lower())
            if key not in existing:
                existing.add(key)
                new_campuses.append(
                    Campus(
                        institution_id=inst.pk,
                        name=item["name"],
                        acronym=item.get("acronym", ""),
                    )
                )

    if new_campuses:
        Campus.objects.using(alias).bulk_create(new_campuses, batch_size=300, ignore_conflicts=True)


class Migration(migrations.Migration):

    dependencies = [
        ("catalogs", "0002_profile_catalogs_schema_and_seed"),
    ]

    operations = [
        migrations.CreateModel(
            name="Campus",
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
                    "name",
                    models.CharField(
                        max_length=255,
                        verbose_name="nombre del campus",
                    ),
                ),
                (
                    "acronym",
                    models.CharField(
                        blank=True,
                        default="",
                        max_length=80,
                        verbose_name="acrónimo",
                    ),
                ),
                (
                    "institution",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="campuses",
                        to="catalogs.institution",
                        verbose_name="institución",
                    ),
                ),
            ],
            options={
                "verbose_name": "campus",
                "verbose_name_plural": "campus",
                "ordering": ["name"],
            },
        ),
        migrations.AddConstraint(
            model_name="campus",
            constraint=models.UniqueConstraint(
                fields=("institution", "name"),
                name="unique_campus_per_institution",
            ),
        ),
        migrations.RunPython(seed_campuses, migrations.RunPython.noop),
    ]
