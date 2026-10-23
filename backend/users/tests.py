from django.test import TestCase

import tempfile
from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.exceptions import FieldDoesNotExist, ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import IntegrityError, connection, transaction
from django.db.migrations.executor import MigrationExecutor
from django.db.models.deletion import ProtectedError
from django.test import TransactionTestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.test import APIClient, APITestCase, APIRequestFactory, force_authenticate
from rest_framework.views import APIView

from catalogs.models import AcademicLevel, Country, Institution, State
from .forms import CustomUserCreationForm
from .models import (
    LegalDocument, Menu, MenuPrivilege, Privilege, Profile,
    Role, RolePrivilege, UserLegalDocument, UserRole,
)
from .permissions import HasPrivilege
from .serializers import UserSerializer
from .services import get_user_menus, get_user_privilege_codes


User = get_user_model()
PASSWORD = "Correcta!7nY2zK8#L4"


class RegistrationWorkflowTests(APITestCase):
    def setUp(self):
        self.media = tempfile.TemporaryDirectory()
        self.addCleanup(self.media.cleanup)
        self.settings_override = override_settings(MEDIA_ROOT=self.media.name)
        self.settings_override.enable()
        self.addCleanup(self.settings_override.disable)
        self.terms = self.create_document(LegalDocument.Type.TERMS)
        self.privacy = self.create_document(LegalDocument.Type.PRIVACY_NOTICE)

    def create_document(self, document_type, version="1.0", **extra):
        return LegalDocument.objects.create(
            type=document_type, version=version, name=f"Documento de prueba {document_type}",
            file=SimpleUploadedFile("documento.txt", b"Contenido exclusivamente de prueba."),
            **({"is_active": True} | extra),
        )

    def payload(self, **extra):
        return {
            "email": "irene@example.test", "first_name": "Irene", "last_name": "Torres",
            "maternal_last_name": "Luna", "password": PASSWORD, "password_confirm": PASSWORD,
            "accepted_terms": True, "accepted_privacy_notice": True,
            "terms_document_id": self.terms.pk, "privacy_document_id": self.privacy.pk,
            **extra,
        }

    def register(self, **extra):
        return self.client.post(reverse("register"), self.payload(**extra), format="json")

    def test_registration_creates_profile_role_and_versioned_acceptances(self):
        response = self.register()
        self.assertEqual(response.status_code, 201, response.data)
        user = User.objects.get(email="irene@example.test")
        self.assertTrue(user.check_password(PASSWORD))
        self.assertEqual(user.user_roles.get().role.name, "Ponente")
        self.assertFalse(user.profile.is_complete)
        self.assertEqual(set(user.legal_acceptances.values_list("document_id", flat=True)), {self.terms.pk, self.privacy.pk})
        self.assertEqual(user.legal_acceptances.values("accepted_at").distinct().count(), 1)
        self.assertNotIn("username", response.data["user"])
        self.assertFalse(user.accepted_terms)  # Campo exclusivamente histórico.
        self.assertIsNone(user.terms_accepted_at)
        with self.assertRaises(FieldDoesNotExist):
            User._meta.get_field("username")

    def test_login_uses_email_without_case_sensitivity(self):
        self.assertEqual(self.register(email="IRENE@Example.Test").status_code, 201)
        response = self.client.post(reverse("login"), {"email": "Irene@EXAMPLE.TEST", "password": PASSWORD}, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["user"]["email"], "irene@example.test")

    def test_password_spaces_are_preserved(self):
        password = "  8hY!pL2#nS9&kM7  "
        self.assertEqual(self.register(password=password, password_confirm=password).status_code, 201)
        self.assertEqual(self.client.post(reverse("login"), {"email": "irene@example.test", "password": password}).status_code, 200)
        self.assertEqual(self.client.post(reverse("login"), {"email": "irene@example.test", "password": password.strip()}).status_code, 400)

    def test_duplicate_email_with_different_case_is_rejected(self):
        self.assertEqual(self.register().status_code, 201)
        response = self.register(email="IRENE@EXAMPLE.TEST")
        self.assertEqual(response.status_code, 400)
        self.assertIn("email", response.data)
        self.assertEqual(User.objects.count(), 1)
        with self.assertRaises(IntegrityError), transaction.atomic():
            User.objects.bulk_create([User(email="IRENE@EXAMPLE.TEST")])

    def test_django_password_validators_are_applied(self):
        response = self.register(password="12345678", password_confirm="12345678")
        self.assertEqual(response.status_code, 400)
        self.assertIn("password", response.data)
        self.assertFalse(User.objects.exists())

    def test_password_confirmation_is_required(self):
        response = self.register(password_confirm="otra-clave-123!")
        self.assertEqual(response.status_code, 400)
        self.assertIn("password_confirm", response.data)

    def test_legal_consent_cannot_be_false(self):
        response = self.register(accepted_terms=False)
        self.assertEqual(response.status_code, 400)
        self.assertFalse(User.objects.exists())

    def test_inactive_default_role_prevents_partial_registration(self):
        Role.objects.update_or_create(name="Ponente", defaults={"is_active": False})
        response = self.register()
        self.assertEqual(response.status_code, 400)
        self.assertFalse(User.objects.exists())
        self.assertFalse(Profile.objects.exists())
        self.assertFalse(Role.objects.get(name="Ponente").is_active)

    def test_missing_current_document_prevents_registration(self):
        self.terms.is_active = False
        self.terms.save()
        response = self.register()
        self.assertEqual(response.status_code, 400)
        self.assertFalse(User.objects.exists())

    def test_document_changed_since_display_requires_new_consent(self):
        self.terms.is_active = False
        self.terms.save()
        self.create_document(LegalDocument.Type.TERMS, version="2.0")
        response = self.register()
        self.assertEqual(response.status_code, 400)
        self.assertIn("terms_document_id", response.data)
        self.assertFalse(User.objects.exists())

    def test_future_document_is_not_published_or_accepted(self):
        self.terms.published_at = timezone.now() + timedelta(days=1)
        self.terms.save()
        response = self.client.get(reverse("legal_documents"))
        self.assertEqual([document["id"] for document in response.data], [self.privacy.pk])
        self.assertEqual(self.register().status_code, 400)

    def test_failure_saving_second_acceptance_rolls_back_everything(self):
        original_create = UserLegalDocument.objects.create

        def fail_on_privacy(**kwargs):
            if kwargs["document"].type == LegalDocument.Type.PRIVACY_NOTICE:
                raise RuntimeError("Fallo de prueba al guardar la segunda aceptación")
            return original_create(**kwargs)

        with patch("users.serializers.UserLegalDocument.objects.create", side_effect=fail_on_privacy):
            with self.assertRaises(RuntimeError):
                self.register()
        self.assertEqual(User.objects.count(), 0)
        self.assertEqual(Profile.objects.count(), 0)
        self.assertEqual(UserRole.objects.count(), 0)
        self.assertEqual(UserLegalDocument.objects.count(), 0)

    def test_jwt_me_and_refresh_flow(self):
        self.assertEqual(self.client.get(reverse("me")).status_code, 401)
        self.register()
        response = self.client.post(reverse("login"), {"email": "irene@example.test", "password": PASSWORD})
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")
        me = self.client.get(reverse("me"))
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.data["email"], "irene@example.test")
        self.assertIn("profile", me.data)
        refresh = self.client.post(reverse("token_refresh"), {"refresh": response.data["refresh"]})
        self.assertEqual(refresh.status_code, 200)
        self.assertIn("access", refresh.data)

    def test_inactive_user_and_username_only_login_are_rejected(self):
        user = User.objects.create_user("inactive@example.test", PASSWORD, is_active=False)
        self.assertEqual(self.client.post(reverse("login"), {"email": user.email, "password": PASSWORD}).status_code, 400)
        self.assertEqual(self.client.post(reverse("login"), {"username": user.email, "password": PASSWORD}).status_code, 400)

    def test_profile_completion_is_calculated_and_cannot_change_owner(self):
        self.register()
        user = User.objects.get(email="irene@example.test")
        other = User.objects.create_user("otro@example.test", PASSWORD)
        Profile.objects.create(user=other)
        country = Country.objects.create(name="México")
        state = State.objects.create(country=country, name="Ciudad de México")
        institution = Institution.objects.create(name="UNAM")
        level = AcademicLevel.objects.create(degree="Licenciatura")
        self.client.force_authenticate(user)
        response = self.client.patch(reverse("profile"), {
            "state": state.pk, "institution": institution.pk, "academic_level": level.pk,
            "dialing_code": "52", "mobile_phone": "5512345678", "is_complete": False,
            "user": other.pk,
        }, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertTrue(response.data["is_complete"])
        self.assertEqual(response.data["country"], country.pk)
        self.assertFalse(Profile.objects.get(user=other).is_complete)
        response = self.client.patch(reverse("profile"), {"mobile_phone": ""}, format="json")
        self.assertFalse(response.data["is_complete"])

    def test_profile_endpoint_requires_authentication(self):
        self.assertEqual(self.client.get(reverse("profile")).status_code, 401)
        self.assertEqual(self.client.patch(reverse("profile"), {"mobile_phone": "123"}).status_code, 401)

    def test_accepted_document_is_immutable_and_historical_rows_are_protected(self):
        self.register()
        self.terms.name = "Cambio posterior a la aceptación"
        with self.assertRaises(ValidationError):
            self.terms.save()
        self.terms.refresh_from_db()
        self.terms.is_active = False
        self.terms.save()  # La desactivación para publicar otra versión sí está permitida.
        acceptance = UserLegalDocument.objects.get(document=self.terms)
        acceptance.accepted_at += timedelta(hours=1)
        with self.assertRaises(ValidationError):
            acceptance.save()
        with self.assertRaises(ProtectedError):
            self.terms.delete()
        with self.assertRaises(ProtectedError):
            User.objects.get(email="irene@example.test").delete()

    def test_admin_creation_form_and_pages_use_email(self):
        form = CustomUserCreationForm(data={
            "email": "NUEVO@EXAMPLE.TEST", "first_name": "Nora", "last_name": "López",
            "password1": PASSWORD, "password2": PASSWORD,
        })
        self.assertTrue(form.is_valid(), form.errors)
        created = form.save()
        self.assertEqual(created.email, "nuevo@example.test")
        self.assertTrue(created.check_password(PASSWORD))
        admin = User.objects.create_superuser("admin@example.test", PASSWORD)
        self.client.force_login(admin)
        for url in (reverse("admin:users_user_changelist"), reverse("admin:users_user_add"), reverse("admin:users_user_change", args=[created.pk])):
            with self.subTest(url=url):
                self.assertEqual(self.client.get(url).status_code, 200)
        response = self.client.post(reverse("admin:users_user_add"), {
            "email": "desde-admin@example.test", "first_name": "Julia", "last_name": "Díaz",
            "password1": PASSWORD, "password2": PASSWORD, "_save": "Guardar",
        })
        self.assertEqual(response.status_code, 302)
        self.assertTrue(Profile.objects.filter(user__email="desde-admin@example.test").exists())


class PrivilegeWorkflowTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user("roles@example.test", PASSWORD)
        self.active_role = Role.objects.create(name="Evaluador")
        self.inactive_role = Role.objects.create(name="Inactivo", is_active=False)
        self.allowed = Privilege.objects.create(code="trabajos.ver", name="Ver trabajos")
        self.denied = Privilege.objects.create(code="usuarios.gestionar", name="Gestionar usuarios")
        for role, privilege in ((self.active_role, self.allowed), (self.inactive_role, self.denied)):
            UserRole.objects.create(user=self.user, role=role)
            RolePrivilege.objects.create(role=role, privilege=privilege)

    def test_only_active_roles_supply_privileges_and_menus_are_distinct(self):
        visible = Menu.objects.create(name="Trabajos", route="/trabajos")
        hidden = Menu.objects.create(name="Usuarios", route="/usuarios")
        inactive = Menu.objects.create(name="Inactivo", route="/inactivo", is_active=False)
        for menu, privilege in ((visible, self.allowed), (visible, self.denied), (hidden, self.denied), (inactive, self.allowed)):
            MenuPrivilege.objects.create(menu=menu, privilege=privilege)
        self.assertEqual(get_user_privilege_codes(self.user), ["trabajos.ver"])
        self.assertEqual(list(get_user_menus(self.user)), [visible])
        self.assertEqual(UserSerializer(self.user).data["roles"], ["Evaluador"])
        self.active_role.is_active = False
        self.active_role.save()
        self.assertEqual(get_user_privilege_codes(self.user), [])
        self.assertEqual(list(get_user_menus(self.user)), [])

    def test_privilege_permission_enforces_backend_access(self):
        class ProtectedView(APIView):
            permission_classes = [IsAuthenticated, HasPrivilege]
            required_privilege = "trabajos.ver"

            def get(self, request):
                return Response({"ok": True})

        factory = APIRequestFactory()
        request = factory.get("/test/")
        force_authenticate(request, user=self.user)
        self.assertEqual(ProtectedView.as_view()(request).status_code, 200)
        self.active_role.is_active = False
        self.active_role.save()
        request = factory.get("/test/")
        force_authenticate(request, user=self.user)
        self.assertEqual(ProtectedView.as_view()(request).status_code, 403)


class HistoricalMigrationTests(TransactionTestCase):
    latest = ("users", "0005_backfill_profiles_default_role")
    schema = ("users", "0004_email_profile_menu_legal")

    def setUp(self):
        executor = MigrationExecutor(connection)
        previous = next(dependency for dependency in executor.loader.disk_migrations[self.schema].dependencies if dependency[0] == "users")
        executor.migrate([previous])
        self.old_apps = executor.loader.project_state([previous]).apps

    def tearDown(self):
        MigrationExecutor(connection).migrate([self.latest])
        super().tearDown()

    def test_user_password_and_old_consent_dates_survive_migration(self):
        OldUser = self.old_apps.get_model("users", "User")
        accepted_at = timezone.now() - timedelta(days=10)
        user = OldUser.objects.create_user(
            username="legacy", email="LEGACY@EXAMPLE.TEST", password=PASSWORD,
            first_name="Persona", accepted_terms=True, accepted_privacy_notice=True,
            terms_accepted_at=accepted_at, privacy_notice_accepted_at=accepted_at,
        )
        original_password = user.password
        MigrationExecutor(connection).migrate([self.latest])
        migrated = User.objects.get(pk=user.pk)
        self.assertEqual(migrated.email, "legacy@example.test")
        self.assertEqual(migrated.password, original_password)
        self.assertTrue(migrated.check_password(PASSWORD))
        self.assertTrue(migrated.accepted_terms)
        self.assertEqual(migrated.terms_accepted_at, accepted_at)
        self.assertFalse(migrated.profile.is_complete)
        self.assertFalse(migrated.legal_acceptances.exists())  # No inventar una versión histórica.

    def test_case_collision_aborts_before_any_email_is_changed(self):
        OldUser = self.old_apps.get_model("users", "User")
        first = OldUser.objects.create_user(username="uno", email="CASE@EXAMPLE.TEST", password=PASSWORD)
        original_email = first.email
        duplicate = OldUser.objects.create_user(username="dos", email="case@example.test", password=PASSWORD)
        try:
            with self.assertRaisesRegex(RuntimeError, "mismo correo"):
                MigrationExecutor(connection).migrate([self.latest])
            self.assertEqual(OldUser.objects.get(pk=first.pk).email, original_email)
        finally:
            OldUser.objects.filter(pk=duplicate.pk).delete()

    def test_missing_email_aborts_migration(self):
        OldUser = self.old_apps.get_model("users", "User")
        user = OldUser.objects.create_user(username="sin-correo", email="", password=PASSWORD)
        try:
            with self.assertRaisesRegex(RuntimeError, "no tiene correo"):
                MigrationExecutor(connection).migrate([self.latest])
        finally:
            OldUser.objects.filter(pk=user.pk).delete()


class LegalAdministrationNewTests(APITestCase):
    def setUp(self):
        self.media = tempfile.TemporaryDirectory()
        self.addCleanup(self.media.cleanup)
        self.override = override_settings(MEDIA_ROOT=self.media.name)
        self.override.enable()
        self.addCleanup(self.override.disable)
        self.admin_user = User.objects.create_user("legaladmin@example.test", PASSWORD)
        self.user = User.objects.create_user("regular@example.test", PASSWORD)
        self.role = Role.objects.create(name="Gestor legal")
        UserRole.objects.create(user=self.admin_user, role=self.role)
        for code in ["ver", "crear", "editar", "publicar", "desactivar"]:
            privilege, _ = Privilege.objects.get_or_create(code=f"documentos_legales.{code}", defaults={"name": code})
            RolePrivilege.objects.create(role=self.role, privilege=privilege)
        self.client.force_authenticate(self.admin_user)

    def test_creation_is_draft_and_publication_replaces_active(self):
        data = {"type": "TERMS", "version": "1", "name": "Términos", "published_at": timezone.now().isoformat(), "file": SimpleUploadedFile("terms.txt", b"terms")}
        created = self.client.post(reverse("admin_legal_documents"), data, format="multipart")
        self.assertEqual(created.status_code, 201, created.data)
        self.assertFalse(created.data["is_active"])
        pk = created.data["id"]
        self.assertEqual(len(self.client.get(reverse("legal_documents")).data), 0)
        self.assertEqual(self.client.post(reverse("admin_legal_document_publish", args=[pk])).status_code, 200)
        self.assertEqual(len(self.client.get(reverse("legal_documents")).data), 1)
        new_data = {"type": "TERMS", "version": "2", "name": "Términos 2", "published_at": timezone.now().isoformat(), "file": SimpleUploadedFile("terms2.txt", b"terms2")}
        second = self.client.post(reverse("admin_legal_documents"), new_data, format="multipart")
        self.assertEqual(second.status_code, 201, second.data)
        self.client.post(reverse("admin_legal_document_publish", args=[second.data["id"]]))
        self.assertFalse(LegalDocument.objects.get(pk=pk).is_active)

    def test_acceptance_is_personal_idempotent_and_version_sensitive(self):
        docs = []
        for doc_type in (LegalDocument.Type.TERMS, LegalDocument.Type.PRIVACY_NOTICE):
            docs.append(LegalDocument.objects.create(type=doc_type, version="1", name=doc_type, file=SimpleUploadedFile(f"{doc_type}.txt", b"x"), is_active=True))
        self.client.force_authenticate(self.user)
        r = self.client.post(reverse("legal_acceptances"), {"document_id": docs[0].pk}, format="json")
        self.assertEqual(r.status_code, 201, r.data)
        r = self.client.post(reverse("legal_acceptances"), {"document_id": docs[0].pk}, format="json")
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(UserLegalDocument.objects.filter(user=self.user).count(), 1)
        self.assertFalse(self.client.get(reverse("me")).data["profile"]["legal_complete"])
        self.client.post(reverse("legal_acceptances"), {"document_id": docs[1].pk}, format="json")
        self.assertTrue(self.client.get(reverse("me")).data["profile"]["legal_complete"])
        old = docs[0]
        old.is_active = False
        old.save()
        new = LegalDocument.objects.create(type=old.type, version="2", name="Nuevos términos", file=SimpleUploadedFile("new.txt", b"new"), is_active=True)
        self.assertIn(new.pk, self.client.get(reverse("me")).data["profile"]["pending_legal_document_ids"])
        self.assertEqual(self.client.post(reverse("legal_acceptances"), {"document_id": old.pk}, format="json").status_code, 400)

    def test_regular_user_cannot_manage_documents(self):
        self.client.force_authenticate(self.user)
        self.assertEqual(self.client.get(reverse("admin_legal_documents")).status_code, 403)
        self.assertEqual(self.client.post(reverse("admin_legal_documents"), {}, format="json").status_code, 403)


    def test_new_legal_version_does_not_block_profile(self):
        from users.services import effective_profile_status

        self.client.force_authenticate(self.user)

        before = effective_profile_status(self.user)

        LegalDocument.objects.create(
            type=LegalDocument.Type.TERMS,
            version="2",
            name="Nuevos términos",
            file=SimpleUploadedFile("new_terms.txt", b"new terms"),
            is_active=True,
        )

        after = effective_profile_status(self.user)

        self.assertEqual(
            before["is_complete"],
            after["is_complete"],
        )

        self.assertFalse(after["legal_complete"])
        self.assertEqual(
            len(after["pending_legal_document_ids"]),
            1,
        )

