from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Email-as-login user. Mirrors the `User` interface in src/types/index.ts."""

    email = models.EmailField(unique=True)
    city = models.CharField(max_length=120, blank=True)
    profile_picture = models.URLField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    @property
    def full_name(self) -> str:
        name = f'{self.first_name} {self.last_name}'.strip()
        return name or self.username

    def __str__(self) -> str:
        return self.email
