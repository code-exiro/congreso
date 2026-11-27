from rest_framework import serializers
from rest_framework.validators import UniqueTogetherValidator

from .models import Congreso, Pagina

# La pantalla envía "Virtual" y "Híbrida"; el modelo guarda "Online" y "Híbrido".
MODALIDADES = {"Virtual": "Online", "Híbrida": "Híbrido"}


class CongresoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Congreso
        fields = [
            "nombre_congreso", "edicion_congreso", "modalidad_congreso", "correo_congreso",
            "contrasena_aplicacion", "convocatoria", "aviso_privacidad", "terminos_condiciones",
            "plantilla_extenso", "plantilla_constancia", "plantilla_fondo_videoponencia",
            "plantilla_presentacion", "plantilla_autores", "ubicacion_sede", "contacto_correo",
            "contacto_telefono", "url_revista", "issn", "qr_congreso",
        ]
        validators = [
            UniqueTogetherValidator(
                queryset=Congreso.objects.all(),
                fields=["nombre_congreso", "edicion_congreso"],
                message="Ya existe un congreso con ese nombre y edición.",
            )
        ]


class PaginaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pagina
        fields = [
            "color_banner", "cartel", "banner", "logo_congreso", "logo_departamento",
            "imagen_login", "imagen_contrasena", "imagen_crear_cuenta", "programa",
        ]
