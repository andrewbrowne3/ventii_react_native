from django.conf import settings
from django.db import models


class Profile(models.Model):
    """A Place / Talent / Community / Brand profile. Mirrors `Profile` in src/types."""

    TYPE_CHOICES = [
        ('place', 'Place'),
        ('talent', 'Talent'),
        ('community', 'Community'),
        ('brand', 'Brand'),
    ]

    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    handle = models.CharField(max_length=80, unique=True)
    display_name = models.CharField(max_length=160)
    tagline = models.CharField(max_length=240, blank=True)
    bio = models.TextField(blank=True)
    avatar_url = models.URLField(blank=True)
    cover_url = models.URLField(blank=True)
    verified = models.BooleanField(default=False)
    follower_count = models.PositiveIntegerField(default=0)

    # ProfileCapabilities — stored as a JSON object {has_events: bool, ...}.
    capabilities = models.JSONField(default=dict, blank=True)

    # Flattened location / social; serialized back into nested objects.
    city = models.CharField(max_length=120, blank=True)
    neighborhood = models.CharField(max_length=120, blank=True)
    instagram = models.CharField(max_length=120, blank=True)
    website = models.URLField(blank=True)

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='profiles',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-follower_count', 'display_name']

    def __str__(self) -> str:
        return f'{self.display_name} ({self.type})'
