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

from catalogs.models import AcademicLevel, AcademicStatus, Area, Campus, Country, DialingCode, Institution, State
from .forms import CustomUserCreationForm
from .models import (
    LegalDocument, Menu, MenuPrivilege, Privilege, Profile,
    Role, RolePrivilege, UserArea, UserLegalDocument, UserPrivilege, UserRole,
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
        self.assertEqual(user.user_roles.get().role.name, "ponente")
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
        Role.objects.filter(name__iexact="ponente").update(is_active=False)
        response = self.register()
        self.assertEqual(response.status_code, 400)
        self.assertFalse(User.objects.exists())
        self.assertFalse(Profile.objects.exists())
        self.assertFalse(Role.objects.get(name__iexact="ponente").is_active)

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
        country = Country.objects.get(name="México")
        state = State.objects.filter(country=country).first()
        institution = Institution.objects.first()
        campus = Campus.objects.filter(institution=institution).first()
        level = AcademicLevel.objects.first()
        status_obj = AcademicStatus.objects.get(code="terminado")
        self.client.force_authenticate(user)
        # Lada y teléfono son opcionales; semblanza, campus y estatus académico son obligatorios
        response = self.client.patch(reverse("profile"), {
            "state": state.pk,
            "institution": institution.pk,
            "campus": campus.pk,
            "academic_level": level.pk,
            "academic_status": status_obj.pk,
            "dialing_code": "",
            "mobile_phone": "",
            "biography": "Investigadora en ingeniería y docencia universitaria.",
            "is_complete": False,
            "user": other.pk,
        }, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertTrue(response.data["is_complete"])
        self.assertEqual(response.data["country"], country.pk)
        self.assertFalse(Profile.objects.get(user=other).is_complete)
        # Quitar semblanza vuelve incompleto el perfil
        response = self.client.patch(reverse("profile"), {"biography": ""}, format="json")
        self.assertFalse(response.data["is_complete"])

    def test_profile_endpoint_requires_authentication(self):
        self.assertEqual(self.client.get(reverse("profile")).status_code, 401)
        self.assertEqual(self.client.patch(reverse("profile"), {"mobile_phone": "123"}).status_code, 401)

    def test_profile_uses_real_catalogs_dependent_states_and_rejects_unknown_ids(self):
        self.register()
        user = User.objects.get(email="irene@example.test")
        self.client.force_authenticate(user)

        catalogs_resp = self.client.get(reverse("profile_catalogs"))
        self.assertEqual(catalogs_resp.status_code, 200)
        self.assertGreaterEqual(len(catalogs_resp.data["countries"]), 200)
        self.assertEqual(len(catalogs_resp.data["areas"]), 27)
        self.assertEqual(len(catalogs_resp.data["academic_levels"]), 9)
        self.assertEqual(
            {s["code"] for s in catalogs_resp.data["academic_statuses"]},
            {"cursando", "terminado"},
        )
        self.assertGreaterEqual(len(catalogs_resp.data["institutions"]), 170)
        self.assertGreaterEqual(len(catalogs_resp.data["dialing_codes"]), 200)

        mexico = Country.objects.get(name="México")
        states_resp = self.client.get(reverse("catalog_states_by_country"), {"country": mexico.pk})
        self.assertEqual(states_resp.status_code, 200)
        self.assertEqual(len(states_resp.data), 32)
        jalisco = next(s for s in states_resp.data if s["name"] == "Jalisco")

        unam = Institution.objects.get(acronym="UNAM")
        campuses_resp = self.client.get(reverse("catalog_campuses_by_institution"), {"institution": unam.pk})
        self.assertEqual(campuses_resp.status_code, 200)
        self.assertEqual(len(campuses_resp.data), 29)
        fes_cuautitlan = next(c for c in campuses_resp.data if "Cuautitlán" in c["name"])

        ipn = Institution.objects.get(acronym="IPN")
        ipn_campus = Campus.objects.filter(institution=ipn).first()
        mismatch_resp = self.client.patch(
            reverse("profile"),
            {"institution": unam.pk, "campus": ipn_campus.pk},
            format="json",
        )
        self.assertEqual(mismatch_resp.status_code, 400)
        self.assertIn("campus", mismatch_resp.data)

        level = AcademicLevel.objects.get(degree="Licenciatura")
        cursando = AcademicStatus.objects.get(code="cursando")

        response = self.client.patch(reverse("profile"), {
            "state": jalisco["id"],
            "institution": unam.pk,
            "campus": fes_cuautitlan["id"],
            "academic_level": level.pk,
            "academic_status": cursando.pk,
            "biography": "Estudiante de licenciatura en ingeniería.",
        }, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertTrue(response.data["is_complete"])
        self.assertEqual(response.data["country"], mexico.pk)
        self.assertEqual(response.data["state"], jalisco["id"])
        self.assertEqual(response.data["institution"], unam.pk)
        self.assertEqual(response.data["campus"], fes_cuautitlan["id"])
        self.assertEqual(response.data["academic_status"], cursando.pk)

        bad_response = self.client.patch(reverse("profile"), {"state": 999999}, format="json")
        self.assertEqual(bad_response.status_code, 400)
        self.assertIn("state", bad_response.data)

    def test_evaluator_areas_hidden_not_deleted_when_privilege_removed(self):
        self.register()
        user = User.objects.get(email="irene@example.test")
        self.client.force_authenticate(user)

        # Un ponente normal sin privilegio de evaluar no puede gestionar áreas
        initial = self.client.get(reverse("profile"))
        self.assertFalse(initial.data["can_manage_evaluator_areas"])
        self.assertEqual(initial.data["area_ids"], [])

        # Otorgar privilegio evaluar_trabajo (aunque su rol sea ponente)
        eval_priv = Privilege.objects.get(code="evaluar_trabajo")
        user_priv = UserPrivilege.objects.create(user=user, privilege=eval_priv, is_enabled=True)

        with_priv = self.client.get(reverse("profile"))
        self.assertTrue(with_priv.data["can_manage_evaluator_areas"])

        areas = list(Area.objects.all()[:2])
        save_resp = self.client.patch(
            reverse("profile"),
            {"area_ids": [a.pk for a in areas]},
            format="json",
        )
        self.assertEqual(save_resp.status_code, 200, save_resp.data)
        self.assertEqual(set(save_resp.data["area_ids"]), {a.pk for a in areas})

        # Al quitarle el privilegio de evaluar, las áreas se ocultan del perfil pero NO se borran de BD
        user_priv.is_enabled = False
        user_priv.save()
        hidden_resp = self.client.get(reverse("profile"))
        self.assertFalse(hidden_resp.data["can_manage_evaluator_areas"])
        self.assertEqual(hidden_resp.data["area_ids"], [])
        self.assertEqual(UserArea.objects.filter(user=user).count(), 2)

        # Guardar otro campo del perfil sin privilegio no borra sus áreas guardadas
        self.client.patch(reverse("profile"), {"biography": "Nueva semblanza."}, format="json")
        self.assertEqual(UserArea.objects.filter(user=user).count(), 2)

        # Si recupera el privilegio, las áreas reaparecen automáticamente
        user_priv.is_enabled = True
        user_priv.save()
        restored_resp = self.client.get(reverse("profile"))
        self.assertTrue(restored_resp.data["can_manage_evaluator_areas"])
        self.assertEqual(set(restored_resp.data["area_ids"]), {a.pk for a in areas})

    def test_change_email_and_change_password_endpoints(self):
        self.register()
        user = User.objects.get(email="irene@example.test")
        self.client.force_authenticate(user)

        # Cambio de correo con contraseña incorrecta falla
        bad_email = self.client.post(
            reverse("change_email"),
            {"current_password": "wrong-password", "new_email": "irene.nueva@example.test"},
            format="json",
        )
        self.assertEqual(bad_email.status_code, 400)

        # Cambio de correo válido
        ok_email = self.client.post(
            reverse("change_email"),
            {"current_password": PASSWORD, "new_email": "irene.nueva@example.test"},
            format="json",
        )
        self.assertEqual(ok_email.status_code, 200, ok_email.data)
        user.refresh_from_db()
        self.assertEqual(user.email, "irene.nueva@example.test")

        # Cambio de contraseña válido
        new_pwd = "NuevaClave!9xP4#mQ2"
        ok_pwd = self.client.post(
            reverse("change_password"),
            {
                "current_password": PASSWORD,
                "new_password": new_pwd,
                "new_password_confirm": new_pwd,
            },
            format="json",
        )
        self.assertEqual(ok_pwd.status_code, 200, ok_pwd.data)
        user.refresh_from_db()
        self.assertTrue(user.check_password(new_pwd))

    def test_otro_institution_campus_fes_acronyms_and_biography_word_limit(self):
        self.register()
        user = User.objects.get(email="irene@example.test")
        self.client.force_authenticate(user)

        # 1. Abreviaciones actualizadas de FES
        self.assertEqual(
            Campus.objects.get(name="Facultad de Estudios Superiores Cuautitlán").acronym,
            "FESC",
        )
        self.assertEqual(
            Campus.objects.get(name="Facultad de Estudios Superiores Iztacala").acronym,
            "FESI",
        )
        self.assertEqual(
            Campus.objects.get(name="Facultad de Estudios Superiores Zaragoza").acronym,
            "FESZ",
        )

        # 2. Institución "Otro" al final del catálogo con su único campus "Otro"
        catalogs_resp = self.client.get(reverse("profile_catalogs"))
        self.assertEqual(catalogs_resp.status_code, 200)
        self.assertEqual(catalogs_resp.data["institutions"][-1]["name"], "Otro")
        otro_inst_id = catalogs_resp.data["institutions"][-1]["id"]

        otro_campuses_resp = self.client.get(
            reverse("catalog_campuses_by_institution"),
            {"institution": otro_inst_id},
        )
        self.assertEqual(otro_campuses_resp.status_code, 200)
        self.assertEqual(len(otro_campuses_resp.data), 1)
        self.assertEqual(otro_campuses_resp.data[0]["name"], "Otro")

        # 3. Semblanza: 500 palabras con doble espacio es válida (doble espacio no cuenta como palabra)
        ok_bio = "  ".join(["palabra"] * 500)
        ok_resp = self.client.patch(reverse("profile"), {"biography": ok_bio}, format="json")
        self.assertEqual(ok_resp.status_code, 200, ok_resp.data)

        # 500 palabras + triple espacio cuenta como 501 y es rechazada
        triple_space_bio = " ".join(["palabra"] * 500) + "   "
        bad_triple = self.client.patch(reverse("profile"), {"biography": triple_space_bio}, format="json")
        self.assertEqual(bad_triple.status_code, 400)
        self.assertIn("biography", bad_triple.data)

        # 501 palabras reales es rechazada
        too_long_bio = " ".join(["palabra"] * 501)
        bad_long = self.client.patch(reverse("profile"), {"biography": too_long_bio}, format="json")
        self.assertEqual(bad_long.status_code, 400)
        self.assertIn("biography", bad_long.data)

    def test_profile_supports_picture_upload_and_removal(self):
        import io
        from PIL import Image

        self.register()
        user = User.objects.get(email="irene@example.test")
        self.client.force_authenticate(user)

        state = State.objects.first()
        institution = Institution.objects.first()
        campus = Campus.objects.filter(institution=institution).first()
        level = AcademicLevel.objects.first()
        status_obj = AcademicStatus.objects.get(code="terminado")

        buf = io.BytesIO()
        Image.new("RGB", (4, 4), color=(16, 33, 56)).save(buf, format="PNG")
        photo = SimpleUploadedFile("avatar.png", buf.getvalue(), content_type="image/png")

        upload_response = self.client.patch(
            reverse("profile"),
            {
                "state": str(state.pk),
                "institution": str(institution.pk),
                "campus": str(campus.pk),
                "academic_level": str(level.pk),
                "academic_status": str(status_obj.pk),
                "biography": "Semblanza de prueba para carga de foto.",
                "profile_picture": photo,
            },
            format="multipart",
        )
        self.assertEqual(upload_response.status_code, 200, upload_response.data)
        self.assertTrue(upload_response.data["is_complete"])
        self.assertTrue(bool(upload_response.data["profile_picture"]))

        clear_response = self.client.patch(
            reverse("profile"),
            {"profile_picture": None},
            format="json",
        )
        self.assertEqual(clear_response.status_code, 200, clear_response.data)
        self.assertIsNone(clear_response.data["profile_picture"])

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
        self.active_role, _ = Role.objects.update_or_create(
            name="evaluador",
            defaults={"is_active": True},
        )
        RolePrivilege.objects.filter(role=self.active_role).delete()
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
        self.assertEqual(UserSerializer(self.user).data["roles"], [self.active_role.name])
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

    def test_admin_and_ponente_roles_legal_documents_visibility(self):
        for role_name in ("administrador", "coordinador", "ponente", "evaluador"):
            self.assertTrue(
                Role.objects.filter(name=role_name, is_active=True).exists(),
                f"El rol {role_name} debe existir y estar activo",
            )

        admin_role = Role.objects.get(name="administrador")
        admin_user = User.objects.create_user("admin_role@example.test", PASSWORD)
        UserRole.objects.create(user=admin_user, role=admin_role)

        admin_data = UserSerializer(admin_user).data
        self.assertIn("documentos_legales.ver", admin_data["privileges"])
        self.assertTrue(any(m["route"] == "/configuraciones/documentos-legales" for m in admin_data["menus"]))

        self.client.force_authenticate(admin_user)
        response = self.client.get(reverse("admin_legal_documents"))
        self.assertEqual(response.status_code, 200)

        ponente_role = Role.objects.get(name="ponente")
        ponente_user = User.objects.create_user("ponente_role@example.test", PASSWORD)
        UserRole.objects.create(user=ponente_user, role=ponente_role)

        ponente_data = UserSerializer(ponente_user).data
        self.assertNotIn("documentos_legales.ver", ponente_data["privileges"])
        self.assertFalse(any(m["route"] == "/configuraciones/documentos-legales" for m in ponente_data["menus"]))

        self.client.force_authenticate(ponente_user)
        response_ponente = self.client.get(reverse("admin_legal_documents"))
        self.assertEqual(response_ponente.status_code, 403)



class RolesPrivilegesAdminTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user("admin-roles@example.test", PASSWORD, first_name="Admin", last_name="Roles")
        self.target = User.objects.create_user("ponente-test@example.test", PASSWORD, first_name="Ana", last_name="Pérez")
        self.admin_role, _ = Role.objects.get_or_create(name="administrador", defaults={"is_active": True})
        self.coordinador_role, _ = Role.objects.get_or_create(name="coordinador", defaults={"is_active": True})
        self.evaluador_role, _ = Role.objects.get_or_create(name="evaluador", defaults={"is_active": True})
        for code in ("inicio_sesion", "modificar_perfil", "modificar_privilegios", "ver_reportes"):
            priv, _ = Privilege.objects.get_or_create(code=code, defaults={"name": code})
            RolePrivilege.objects.get_or_create(role=self.admin_role, privilege=priv)
        UserRole.objects.get_or_create(user=self.admin, role=self.admin_role)
        self.client.force_authenticate(self.admin)

    def test_list_users_roles_and_privileges(self):
        users_resp = self.client.get(reverse("admin_users"))
        self.assertEqual(users_resp.status_code, 200)
        self.assertGreaterEqual(len(users_resp.data), 2)

        roles_resp = self.client.get(reverse("admin_roles"))
        self.assertEqual(roles_resp.status_code, 200)
        role_names = {r["name"] for r in roles_resp.data}
        self.assertTrue({"coordinador", "ponente", "evaluador", "admin pagos", "administrador"}.issubset(role_names))
        roles_by_name = {r["name"]: {p["code"] for p in r["privileges"]} for r in roles_resp.data}
        self.assertIn("admin_pagos", roles_by_name["admin pagos"])
        self.assertNotIn("admin_pagos", roles_by_name["coordinador"])

        privs_resp = self.client.get(reverse("admin_privileges"))
        self.assertEqual(privs_resp.status_code, 200)
        self.assertTrue(any(p["code"] == "subir_trabajo" and p["name"] == "subir_trabajo" for p in privs_resp.data))
        self.assertTrue(any(p["code"] == "modificar_privilegios" and p["name"] == "modificar_privilegios" for p in privs_resp.data))

    def test_assign_and_remove_user_roles(self):
        resp = self.client.put(
            reverse("admin_user_roles", args=[self.target.pk]),
            {"role_ids": [self.coordinador_role.pk, self.evaluador_role.pk]},
            format="json",
        )
        self.assertEqual(resp.status_code, 200, resp.data)
        assigned_names = {r["name"] for r in resp.data["roles"]}
        self.assertEqual(assigned_names, {"coordinador", "evaluador"})
        self.assertIn("asignar_evaluador", resp.data["privileges"])
        self.assertIn("evaluar_trabajo", resp.data["privileges"])

    def test_admin_cannot_strip_own_role_or_privileges(self):
        # 1. El administrador jamás puede quitarse el rol de administrador
        resp = self.client.put(
            reverse("admin_user_roles", args=[self.admin.pk]),
            {"role_ids": [self.evaluador_role.pk]},
            format="json",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertTrue(UserRole.objects.filter(user=self.admin, role=self.admin_role).exists())

        # 2. Tampoco puede deshabilitar privilegios propios del rol de administrador
        mod_priv = Privilege.objects.get(code="modificar_privilegios")
        revoke_self_resp = self.client.put(
            reverse("admin_user_roles", args=[self.admin.pk]),
            {
                "role_ids": [self.admin_role.pk],
                "revoked_privilege_ids": [mod_priv.pk],
            },
            format="json",
        )
        self.assertEqual(revoke_self_resp.status_code, 400)

        # 3. Si el administrador se asigna otro rol diferente (ej. evaluador) y privilegios extra (ej. ver_reportes),
        # sí puede agregárselos y después quitárselos manteniendo su rol de administrador.
        ver_reportes_priv = Privilege.objects.get(code="ver_reportes")
        add_extra_resp = self.client.put(
            reverse("admin_user_roles", args=[self.admin.pk]),
            {
                "role_ids": [self.admin_role.pk, self.evaluador_role.pk],
                "granted_privilege_ids": [ver_reportes_priv.pk],
            },
            format="json",
        )
        self.assertEqual(add_extra_resp.status_code, 200, add_extra_resp.data)
        self.assertIn(self.evaluador_role.pk, add_extra_resp.data["role_ids"])
        self.assertIn(ver_reportes_priv.pk, add_extra_resp.data["granted_privilege_ids"])

        remove_extra_resp = self.client.put(
            reverse("admin_user_roles", args=[self.admin.pk]),
            {
                "role_ids": [self.admin_role.pk],
                "granted_privilege_ids": [],
                "revoked_privilege_ids": [],
            },
            format="json",
        )
        self.assertEqual(remove_extra_resp.status_code, 200, remove_extra_resp.data)
        self.assertEqual(remove_extra_resp.data["role_ids"], [self.admin_role.pk])
        self.assertEqual(remove_extra_resp.data["granted_privilege_ids"], [])

    def test_update_role_privileges_and_prevent_self_lockout(self):
        ver_reportes_priv = Privilege.objects.get(code="ver_reportes")
        resp = self.client.patch(
            reverse("admin_role_detail", args=[self.evaluador_role.pk]),
            {"privilege_ids": [ver_reportes_priv.pk]},
            format="json",
        )
        self.assertEqual(resp.status_code, 200, resp.data)
        self.assertEqual([p["code"] for p in resp.data["privileges"]], ["ver_reportes"])

        # Attempting to deactivate own admin role should fail
        lockout_resp = self.client.patch(
            reverse("admin_role_detail", args=[self.admin_role.pk]),
            {"is_active": False},
            format="json",
        )
        self.assertEqual(lockout_resp.status_code, 400)
        self.admin_role.refresh_from_db()
        self.assertTrue(self.admin_role.is_active)

    def test_per_user_privilege_revocation_and_grant(self):
        ponente_role = Role.objects.get(name="ponente")
        subir_trabajo = Privilege.objects.get(code="subir_trabajo")
        solicitud_pago = Privilege.objects.get(code="solicitud_pago")
        ver_reportes = Privilege.objects.get(code="ver_reportes")

        resp = self.client.put(
            reverse("admin_user_roles", args=[self.target.pk]),
            {
                "role_ids": [ponente_role.pk],
                "revoked_privilege_ids": [subir_trabajo.pk, solicitud_pago.pk],
                "granted_privilege_ids": [ver_reportes.pk],
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 200, resp.data)
        self.assertIn("ver_sus_trabajos", resp.data["privileges"])
        self.assertNotIn("subir_trabajo", resp.data["privileges"])
        self.assertNotIn("solicitud_pago", resp.data["privileges"])
        self.assertIn("ver_reportes", resp.data["privileges"])
        self.assertEqual(set(resp.data["revoked_privilege_ids"]), {subir_trabajo.pk, solicitud_pago.pk})
        self.assertEqual(resp.data["granted_privilege_ids"], [ver_reportes.pk])

    def test_menus_appear_from_individual_privileges_without_requiring_role(self):
        # Ningún código auxiliar ficticio debe seguir existiendo en Privilege
        aux_codes = (
            "perfil.ver",
            "trabajos.mis_solicitudes",
            "trabajos.listado_solicitudes",
            "trabajos.activos",
            "evaluaciones.mis_asignadas",
            "eventos.asistencia",
            "eventos.mis_constancias",
            "configuraciones.roles_usuarios",
            "configuraciones.limite_evaluaciones",
            "configuraciones.personalizacion",
        )
        self.assertFalse(Privilege.objects.filter(code__in=aux_codes).exists())

        # 1. Administrador sin rol 'evaluador' se asigna evaluar_trabajo -> aparece /evaluaciones/asignadas
        evaluar_trabajo = Privilege.objects.get(code="evaluar_trabajo")
        ver_sus_evaluaciones = Privilege.objects.get(code="ver_sus_evaluaciones")
        resp = self.client.put(
            reverse("admin_user_roles", args=[self.admin.pk]),
            {
                "role_ids": [self.admin_role.pk],
                "granted_privilege_ids": [evaluar_trabajo.pk],
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 200, resp.data)
        me_routes = {m["route"] for m in self.client.get(reverse("me")).data["menus"]}
        self.assertIn("/evaluaciones/asignadas", me_routes)
        self.assertNotIn("/configuraciones/roles-usuarios", me_routes)

        # Al quitarse el privilegio extra sin cambiar su rol, desaparece /evaluaciones/asignadas
        remove_resp = self.client.put(
            reverse("admin_user_roles", args=[self.admin.pk]),
            {"role_ids": [self.admin_role.pk], "granted_privilege_ids": []},
            format="json",
        )
        self.assertEqual(remove_resp.status_code, 200, remove_resp.data)
        me_routes_after = {m["route"] for m in self.client.get(reverse("me")).data["menus"]}
        self.assertNotIn("/evaluaciones/asignadas", me_routes_after)

        # 2. Otorgar privilegios individuales de otros roles sin asignar esos roles habilita sus módulos
        subir_trabajo = Privilege.objects.get(code="subir_trabajo")
        ver_sus_constancias = Privilege.objects.get(code="ver_sus_constancias")
        asignar_evaluador = Privilege.objects.get(code="asignar_evaluador")
        diseno_pagina = Privilege.objects.get(code="diseño_pagina")
        docs_ver = Privilege.objects.get(code="documentos_legales.ver")
        modificar_privs = Privilege.objects.get(code="modificar_privilegios")

        grant_resp = self.client.put(
            reverse("admin_user_roles", args=[self.target.pk]),
            {
                "role_ids": [],
                "granted_privilege_ids": [
                    subir_trabajo.pk,
                    ver_sus_constancias.pk,
                    asignar_evaluador.pk,
                    diseno_pagina.pk,
                    docs_ver.pk,
                    modificar_privs.pk,
                ],
            },
            format="json",
        )
        self.assertEqual(grant_resp.status_code, 200, grant_resp.data)
        target_routes = {m.route for m in get_user_menus(self.target)}
        self.assertTrue(
            {
                "/trabajos/mis-solicitudes",
                "/eventos/asistencia",
                "/eventos/constancias",
                "/trabajos/solicitudes",
                "/trabajos/activos",
                "/configuraciones/limite-evaluaciones",
                "/configuraciones/personalizacion",
                "/configuraciones/documentos-legales",
                "/configuraciones/roles-privilegios",
            }.issubset(target_routes)
        )

        # 3. Usuario con rol evaluador si tiene revocados ambos privilegios de evaluación pierde /evaluaciones/asignadas
        RolePrivilege.objects.get_or_create(role=self.evaluador_role, privilege=evaluar_trabajo)
        RolePrivilege.objects.get_or_create(role=self.evaluador_role, privilege=ver_sus_evaluaciones)
        revoke_eval_resp = self.client.put(
            reverse("admin_user_roles", args=[self.target.pk]),
            {
                "role_ids": [self.evaluador_role.pk],
                "revoked_privilege_ids": [evaluar_trabajo.pk, ver_sus_evaluaciones.pk],
                "granted_privilege_ids": [],
            },
            format="json",
        )
        self.assertEqual(revoke_eval_resp.status_code, 200, revoke_eval_resp.data)
        self.assertNotIn("/evaluaciones/asignadas", {m.route for m in get_user_menus(self.target)})
