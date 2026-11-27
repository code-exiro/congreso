from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("catalogs", "0003_campus_and_seed"),
        ("users", "0013_profile_academic_status"),
    ]

    operations = [
        migrations.AddField(
            model_name="profile",
            name="campus",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="profiles",
                to="catalogs.campus",
                verbose_name="campus",
            ),
        ),
    ]
