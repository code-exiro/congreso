from django.db import connection
from django.http import QueryDict

from .models import AcademicLevel, Country, Institution, State

TEMPORARY_STATES = {
    1: ("México", "Estado de México"),
    2: ("México", "Ciudad de México"),
    3: ("México", "Jalisco"),
    4: ("México", "Nuevo León"),
    5: ("México", "Puebla"),
    6: ("México", "Querétaro"),
    7: ("México", "Guanajuato"),
    8: ("México", "Hidalgo"),
    9: ("México", "Morelos"),
    10: ("México", "Veracruz"),
}

TEMPORARY_INSTITUTIONS = {
    1: "FES Cuautitlán - UNAM",
    2: "Universidad Nacional Autónoma de México (UNAM)",
    3: "Instituto Politécnico Nacional (IPN)",
    4: "Universidad Autónoma Metropolitana (UAM)",
    5: "Tecnológico Nacional de México (TecNM)",
    6: "Universidad Autónoma del Estado de México (UAEMéx)",
    7: "Instituto Tecnológico y de Estudios Superiores de Monterrey (ITESM)",
    8: "Otra institución académica o industria",
}

TEMPORARY_ACADEMIC_LEVELS = {
    1: ("Técnico Superior Universitario", "Formación técnica superior universitaria"),
    2: ("Estudiante de Licenciatura / Ingeniería", "Estudios de grado en curso"),
    3: ("Licenciatura / Ingeniería", "Grado de licenciatura o ingeniería"),
    4: ("Especialidad", "Estudios de especialidad"),
    5: ("Maestría", "Grado de maestría"),
    6: ("Doctorado", "Grado de doctorado"),
    7: ("Posdoctorado", "Estancia o grado posdoctoral"),
}


def _sync_postgres_sequence(model):
    if connection.vendor != "postgresql":
        return
    table_name = model._meta.db_table
    pk_col = model._meta.pk.column
    quote_name = connection.ops.quote_name
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT pg_get_serial_sequence(%s, %s);",
            [table_name, pk_col],
        )
        row = cursor.fetchone()
        if row and row[0]:
            seq_name = row[0]
            cursor.execute(
                f"SELECT setval(%s, COALESCE((SELECT MAX({quote_name(pk_col)}) FROM {quote_name(table_name)}), 1), "
                f"(SELECT MAX({quote_name(pk_col)}) IS NOT NULL FROM {quote_name(table_name)}));",
                [seq_name],
            )


def _set_field_value(data, field, value):
    if isinstance(data, QueryDict):
        data[field] = str(value)
    else:
        data[field] = value


def resolve_temporary_catalog_data(raw_data):
    """
    Asegura que los IDs temporales enviados desde el frontend existan en las
    tablas de catálogos mientras se integran los endpoints reales de catálogos.
    Si el ID ya existe en la BD real, no altera nada.
    """
    data = raw_data.copy() if isinstance(raw_data, QueryDict) else dict(raw_data)

    for field in ("state", "institution", "academic_level"):
        raw_val = data.get(field)
        if raw_val in (None, "") or isinstance(raw_val, bool):
            continue

        try:
            pk = int(raw_val)
        except (ValueError, TypeError):
            continue

        if pk <= 0:
            continue

        if field == "state":
            if State.objects.filter(pk=pk).exists() or pk not in TEMPORARY_STATES:
                continue
            country_name, state_name = TEMPORARY_STATES[pk]
            country, created_country = Country.objects.get_or_create(name=country_name)
            if created_country:
                _sync_postgres_sequence(Country)
            existing = State.objects.filter(country=country, name=state_name).first()
            if existing:
                _set_field_value(data, field, existing.pk)
            else:
                State.objects.create(id=pk, country=country, name=state_name)
                _sync_postgres_sequence(State)

        elif field == "institution":
            if Institution.objects.filter(pk=pk).exists() or pk not in TEMPORARY_INSTITUTIONS:
                continue
            inst_name = TEMPORARY_INSTITUTIONS[pk]
            existing = Institution.objects.filter(name=inst_name).first()
            if existing:
                _set_field_value(data, field, existing.pk)
            else:
                Institution.objects.create(id=pk, name=inst_name)
                _sync_postgres_sequence(Institution)

        elif field == "academic_level":
            if AcademicLevel.objects.filter(pk=pk).exists() or pk not in TEMPORARY_ACADEMIC_LEVELS:
                continue
            degree, description = TEMPORARY_ACADEMIC_LEVELS[pk]
            existing = AcademicLevel.objects.filter(degree=degree).first()
            if existing:
                _set_field_value(data, field, existing.pk)
            else:
                AcademicLevel.objects.create(id=pk, degree=degree, description=description)
                _sync_postgres_sequence(AcademicLevel)

    return data
