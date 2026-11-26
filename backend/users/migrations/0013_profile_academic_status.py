from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("catalogs", "0002_profile_catalogs_schema_and_seed"),
        ("users", "0012_link_menus_to_real_privileges"),
    ]

    operations = [
        migrations.AddField(
            model_name="profile",
            name="academic_status",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="profiles",
                to="catalogs.academicstatus",
                verbose_name="estatus académico",
            ),
        ),
        migrations.AlterField(
            model_name="profile",
            name="dialing_code",
            field=models.CharField(blank=True, max_length=50, verbose_name="lada"),
        ),
    ]
