from django.db import models

from apps.profiles.models import Profile


class Event(models.Model):
    """Mirrors the `Event` interface in src/types/index.ts."""

    STATUS_CHOICES = [
        ('upcoming', 'Upcoming'),
        ('live', 'Live'),
        ('ended', 'Ended'),
        ('cancelled', 'Cancelled'),
    ]

    title = models.CharField(max_length=200)
    flyer_url = models.URLField(blank=True)
    date = models.DateField()
    start_time = models.CharField(max_length=40)          # "10:00 PM"
    end_time = models.CharField(max_length=40, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='upcoming')
    description = models.TextField(blank=True)
    vibe_tags = models.JSONField(default=list, blank=True)
    music_tags = models.JSONField(default=list, blank=True)

    hosts = models.ManyToManyField(Profile, related_name='events_hosted', blank=True)
    venue = models.ForeignKey(
        Profile, on_delete=models.CASCADE, related_name='events_at_venue',
    )

    cover_charge = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    age_restriction = models.CharField(max_length=20, blank=True)   # '21+', '18+', 'All Ages'
    going_count = models.PositiveIntegerField(default=0)
    interested_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['date', 'start_time']

    def __str__(self) -> str:
        return self.title


class TicketOption(models.Model):
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='ticket_options')
    name = models.CharField(max_length=80)              # 'GA', 'VIP'
    description = models.CharField(max_length=240, blank=True)
    price = models.DecimalField(max_digits=8, decimal_places=2)
    fee = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    remaining = models.PositiveIntegerField(null=True, blank=True)
    perks = models.JSONField(default=list, blank=True)

    def __str__(self) -> str:
        return f'{self.name} — {self.event.title}'


class Deal(models.Model):
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='deals')
    title = models.CharField(max_length=160)
    description = models.CharField(max_length=240, blank=True)
    valid_until = models.DateTimeField(null=True, blank=True)
    redeemed = models.BooleanField(default=False)

    def __str__(self) -> str:
        return self.title
