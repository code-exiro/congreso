# backend/config/urls.py

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("users.urls")),
    path("api/", include("congreso.urls")),
    path("api/", include("trabajos.urls")),
    path("api/catalogs/", include("catalogs.urls")),
    # La app `coning` (de otro integrante) trae su propia landing en /api/landing/, que chocaría con la nuestra: va con prefijo.
    path("api/coning/", include("coning.urls")),
]

if settings.DEBUG:
    urlpatterns += static(
        settings.MEDIA_URL,
        document_root=settings.MEDIA_ROOT,
    )

