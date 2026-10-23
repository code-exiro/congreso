from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (LegalDocumentsView, LoginView, MeView, ProfileView, RegisterView,
    AdminLegalDocumentsView, AdminLegalDocumentDetailView, AdminLegalDocumentPublishView,
    AdminLegalDocumentDeactivateView, OwnLegalAcceptanceView)


urlpatterns = [
    path("auth/register/", RegisterView.as_view(), name="register"),
    path("auth/login/", LoginView.as_view(), name="login"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("auth/me/", MeView.as_view(), name="me"),
    path("auth/profile/", ProfileView.as_view(), name="profile"),
    path("auth/legal-documents/", LegalDocumentsView.as_view(), name="legal_documents"),
    path("auth/legal-acceptances/", OwnLegalAcceptanceView.as_view(), name="legal_acceptances"),
    path("admin/legal-documents/", AdminLegalDocumentsView.as_view(), name="admin_legal_documents"),
    path("admin/legal-documents/<int:pk>/", AdminLegalDocumentDetailView.as_view(), name="admin_legal_document_detail"),
    path("admin/legal-documents/<int:pk>/publish/", AdminLegalDocumentPublishView.as_view(), name="admin_legal_document_publish"),
    path("admin/legal-documents/<int:pk>/deactivate/", AdminLegalDocumentDeactivateView.as_view(), name="admin_legal_document_deactivate"),
]
