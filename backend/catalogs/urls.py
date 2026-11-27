from django.urls import path

from .views import CampusesByInstitutionView, ProfileCatalogsView, StatesByCountryView

urlpatterns = [
    path("profile/", ProfileCatalogsView.as_view(), name="profile_catalogs"),
    path("states/", StatesByCountryView.as_view(), name="catalog_states_by_country"),
    path("campuses/", CampusesByInstitutionView.as_view(), name="catalog_campuses_by_institution"),
]
