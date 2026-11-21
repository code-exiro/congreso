from django.urls import path

from .views import LandingDataView


urlpatterns = [
    path("landing/", LandingDataView.as_view(), name="landing-data"),
]
