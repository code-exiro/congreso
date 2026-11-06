from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    AdminLegalDocumentDeactivateView,
    AdminLegalDocumentDetailView,
    AdminLegalDocumentPublishView,
    AdminLegalDocumentsView,
    AdminPrivilegesListView,
    AdminRoleDetailView,
    AdminRolesView,
    AdminUserRoleUpdateView,
    AdminUsersRolesView,
    LegalDocumentsView,
    LoginView,
    MeView,
    OwnLegalAcceptanceView,
    ProfileView,
    RegisterView,
)


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
    path("admin/privileges/", AdminPrivilegesListView.as_view(), name="admin_privileges"),
    path("admin/roles/", AdminRolesView.as_view(), name="admin_roles"),
    path("admin/roles/<int:pk>/", AdminRoleDetailView.as_view(), name="admin_role_detail"),
    path("admin/users/", AdminUsersRolesView.as_view(), name="admin_users"),
    path("admin/users/<int:pk>/roles/", AdminUserRoleUpdateView.as_view(), name="admin_user_roles"),
]
