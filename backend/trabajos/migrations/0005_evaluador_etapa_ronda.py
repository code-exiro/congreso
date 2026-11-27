from django.db import migrations, models


def etapa_segun_fase(apps, schema_editor):
    """Las asignaciones que ya existían se quedan en la etapa que tenga hoy su trabajo."""
    Evaluador = apps.get_model("trabajos", "Evaluador")
    alias = schema_editor.connection.alias
    for ev in Evaluador.objects.using(alias).select_related("trabajo__fase"):
        if (ev.trabajo.fase.nombre or "").strip().lower().startswith("extenso"):
            ev.etapa = "extenso"
            ev.save(update_fields=["etapa"])


class Migration(migrations.Migration):
    dependencies = [("trabajos", "0004_autorizacionconstancia")]

    operations = [
        migrations.AddField(
            model_name="evaluador", name="etapa",
            field=models.CharField(choices=[("resumen", "Resumen"), ("extenso", "Extenso")], default="resumen", max_length=10, verbose_name="etapa"),
        ),
        migrations.AddField(
            model_name="evaluador", name="ronda",
            field=models.PositiveIntegerField(default=1, verbose_name="ronda"),
        ),
        migrations.RemoveConstraint(model_name="evaluador", name="unico_evaluador_trabajo"),
        migrations.AddConstraint(
            model_name="evaluador",
            constraint=models.UniqueConstraint(fields=("usuario", "trabajo", "etapa", "ronda"), name="unico_evaluador_trabajo_etapa_ronda"),
        ),
        migrations.RunPython(etapa_segun_fase, migrations.RunPython.noop),
    ]
