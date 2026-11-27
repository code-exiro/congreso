from django.urls import path

from .views import CampusView, CatalogosView

urlpatterns = [
    path("catalogos/", CatalogosView.as_view(), name="catalogos"),
    path("catalogos/campus/", CampusView.as_view(), name="catalogos_campus"),
]
