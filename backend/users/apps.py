from django.apps import AppConfig, apps as django_apps
from django.db import connections
from django.db.models.signals import post_migrate


def heal_all_tables_after_migrate(sender, using="default", **kwargs):
    connection = connections[using]
    if connection.vendor != "postgresql":
        return

    quote_name = connection.ops.quote_name
    with connection.cursor() as cursor:
        for model in django_apps.get_models():
            if not model._meta.managed:
                continue
            table_name = model._meta.db_table
            official_columns = {
                field.column for field in model._meta.local_concrete_fields
            }

            cursor.execute(
                """
                SELECT column_name, is_nullable
                FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = %s
                """,
                [table_name],
            )
            rows = cursor.fetchall()
            if not rows:
                continue

            for col_name, is_nullable in rows:
                if col_name not in official_columns and is_nullable == "NO":
                    cursor.execute(
                        f"ALTER TABLE {quote_name(table_name)} "
                        f"ALTER COLUMN {quote_name(col_name)} DROP NOT NULL;"
                    )

            pk_field = model._meta.pk
            if pk_field and pk_field.get_internal_type() in (
                "AutoField",
                "BigAutoField",
                "SmallAutoField",
            ):
                pk_col = pk_field.column
                cursor.execute(
                    "SELECT pg_get_serial_sequence(%s, %s);",
                    [table_name, pk_col],
                )
                seq_row = cursor.fetchone()
                if seq_row and seq_row[0]:
                    seq_name = seq_row[0]
                    cursor.execute(
                        f"SELECT setval(%s, COALESCE((SELECT MAX({quote_name(pk_col)}) FROM {quote_name(table_name)}), 1), "
                        f"(SELECT MAX({quote_name(pk_col)}) IS NOT NULL FROM {quote_name(table_name)}));",
                        [seq_name],
                    )


class UsersConfig(AppConfig):
    name = "users"

    def ready(self):
        post_migrate.connect(
            heal_all_tables_after_migrate,
            sender=self,
            dispatch_uid="users.heal_all_tables_after_migrate",
        )
