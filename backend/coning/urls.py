from django.urls import path

from .views import (
    LandingCongressUpdateView,
    LandingDataView,
    LandingDateCollectionView,
    LandingDateDetailView,
    LandingPageUpdateView,
    LandingSponsorCollectionView,
    LandingSponsorDetailView,
)


urlpatterns = [
    path("landing/", LandingDataView.as_view(), name="landing-data"),
    path("landing/admin/congress/", LandingCongressUpdateView.as_view(), name="landing-congress-update"),
    path("landing/admin/page/", LandingPageUpdateView.as_view(), name="landing-page-update"),
    path("landing/admin/dates/", LandingDateCollectionView.as_view(), name="landing-date-create"),
    path("landing/admin/dates/<int:fecha_id>/", LandingDateDetailView.as_view(), name="landing-date-detail"),
    path("landing/admin/sponsors/", LandingSponsorCollectionView.as_view(), name="landing-sponsor-create"),
    path("landing/admin/sponsors/<int:patrocinador_id>/", LandingSponsorDetailView.as_view(), name="landing-sponsor-detail"),
]
