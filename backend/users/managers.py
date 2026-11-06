from django.contrib.auth.base_user import BaseUserManager


class UserManager(BaseUserManager):
    use_in_migrations = True

    @classmethod
    def normalize_email(cls, email):
        # Política de la aplicación: el correo no distingue mayúsculas.
        return super().normalize_email(email).strip().lower() if email else ""

    def get_by_natural_key(self, email):
        return self.get(email=self.normalize_email(email))

    async def aget_by_natural_key(self, email):
        return await self.aget(email=self.normalize_email(email))

    def create_user(self, email, password=None, **extra_fields):
        if not email or not email.strip():
            raise ValueError("El correo electrónico es obligatorio.")
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        user = self.model(email=self.normalize_email(email), **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        if extra_fields.get("is_staff") is not True:
            raise ValueError("El superusuario debe tener is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("El superusuario debe tener is_superuser=True.")
        return self.create_user(email, password, **extra_fields)
