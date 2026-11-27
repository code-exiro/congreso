from django.core.exceptions import ValidationError
from django.core.validators import FileExtensionValidator, RegexValidator
from django.utils.deconstruct import deconstructible


def extensions(*allowed):
    return FileExtensionValidator(allowed_extensions=list(allowed))


@deconstructible
class MaxSizeMB:
    """Valida el peso máximo de un archivo (serializable en migraciones)."""

    def __init__(self, limit_mb):
        self.limit_mb = limit_mb

    def __call__(self, file):
        if file and file.size > self.limit_mb * 1024 * 1024:
            raise ValidationError(f"El archivo no debe pesar más de {self.limit_mb} MB.")

    def __eq__(self, other):
        return isinstance(other, MaxSizeMB) and self.limit_mb == other.limit_mb


def max_size_mb(limit_mb):
    return MaxSizeMB(limit_mb)


hex_color = RegexValidator(r"^#[0-9A-Fa-f]{6}$", "Usa un color hexadecimal, por ejemplo #14213D.")
phone_digits = RegexValidator(r"^[0-9]{10,15}$", "Solo dígitos, de 10 a 15.")
issn_format = RegexValidator(r"^[0-9]{4}-[0-9]{3}[0-9X]$", "Formato NNNN-NNNN.")
