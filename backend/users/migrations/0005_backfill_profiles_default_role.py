from django.db import migrations


def backfill_profiles_and_role(apps, schema_editor):
    alias = schema_editor.connection.alias
    User = apps.get_model("users", "User")
    Profile = apps.get_model("users", "Profile")
    Role = apps.get_model("users", "Role")
    for user_id in User.objects.using(alias).values_list("pk", flat=True).iterator():
        Profile.objects.using(alias).get_or_create(user_id=user_id)
    # No reactivar un rol que fue deshabilitado deliberadamente.
    Role.objects.using(alias).get_or_create(
        name="Ponente",
        defaults={"description": "Rol asignado automáticamente a usuarios registrados.", "is_active": True},
    )


class Migration(migrations.Migration):
    dependencies = [("users", "0004_email_profile_menu_legal")]
    operations = [migrations.RunPython(backfill_profiles_and_role, migrations.RunPython.noop)]
