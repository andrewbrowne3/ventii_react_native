from django.db import models

from apps.access import TIER_CHOICES
from apps.profiles.models import Profile

# Two-axis access (ventii-ticketing.ts). All optional with safe defaults so
# existing seed data keeps working.
VISIBILITY_CHOICES = [
    ('open', 'Open'),
    ('passcode', 'Passcode'),
    ('member', 'Member'),
]
COMMITMENT_CHOICES = [
    ('none', 'None (save only)'),
    ('rsvp', 'RSVP'),
    ('ticket', 'Ticket'),
    ('external', 'External'),
]


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

    # ── Two-axis access (ventii-ticketing.ts). All optional. ──
    visibility = models.CharField(max_length=10, choices=VISIBILITY_CHOICES, default='open')
    # Blank == derive (external > ticket > rsvp). See apps.access.get_commitment.
    commitment = models.CharField(max_length=10, choices=COMMITMENT_CHOICES, blank=True)
    commit_required_tier = models.CharField(max_length=10, choices=TIER_CHOICES, blank=True)
    capacity = models.PositiveIntegerField(null=True, blank=True)   # null == uncapped
    # Denormalized, server-authoritative pool. Free RSVPs count against it.
    issued_count = models.PositiveIntegerField(default=0)
    passcode_hash = models.CharField(max_length=128, blank=True)    # hashed, never plaintext
    external_url = models.URLField(blank=True)
    currency = models.CharField(max_length=3, default='USD')

    class Meta:
        ordering = ['date', 'start_time']

    def __str__(self) -> str:
        return self.title

    @property
    def is_ticketed(self) -> bool:
        return self.ticket_options.exists()


class TicketOption(models.Model):
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='ticket_options')
    name = models.CharField(max_length=80)              # 'GA', 'VIP'
    description = models.CharField(max_length=240, blank=True)
    price = models.DecimalField(max_digits=8, decimal_places=2)
    fee = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    remaining = models.PositiveIntegerField(null=True, blank=True)
    perks = models.JSONField(default=list, blank=True)

    # ── Per-option gate (e.g. a Gold-only discounted ticket). ──
    available = models.BooleanField(default=True)
    required_tier = models.CharField(max_length=10, choices=TIER_CHOICES, blank=True)
    is_member_exclusive = models.BooleanField(default=False)

    def __str__(self) -> str:
        return f'{self.name} — {self.event.title}'


class Deal(models.Model):
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='deals')
    title = models.CharField(max_length=160)
    description = models.CharField(max_length=240, blank=True)
    valid_until = models.DateTimeField(null=True, blank=True)
    redeemed = models.BooleanField(default=False)   # legacy; superseded by Redemption

    # ── Deal contract (05_VENTII_deals_CODE.ts). All optional. ──
    subtitle = models.CharField(max_length=200, blank=True)        # validity copy
    venue = models.CharField(max_length=160, blank=True)
    success_message = models.CharField(max_length=240, blank=True)
    success_image = models.URLField(blank=True)
    valid_from = models.DateTimeField(null=True, blank=True)       # null == no lower bound
    required_tier = models.CharField(max_length=10, choices=TIER_CHOICES, blank=True)
    total_limit = models.PositiveIntegerField(null=True, blank=True)  # null == uncapped

    def __str__(self) -> str:
        return self.title


class DealOffer(models.Model):
    """One redeemable offer within a Deal (05_VENTII_deals_CODE.ts:DealOffer)."""

    deal = models.ForeignKey(Deal, on_delete=models.CASCADE, related_name='offers')
    title = models.CharField(max_length=160)
    image = models.URLField(blank=True)
    # null == unlimited claims for one user (an "infinite" offer).
    limit_per_user = models.PositiveIntegerField(null=True, blank=True)
    required_tier = models.CharField(max_length=10, choices=TIER_CHOICES, blank=True)

    def __str__(self) -> str:
        return f'{self.title} — {self.deal.title}'


class StaffCode(models.Model):
    """A venue's staff-issued code for deal redemption. Verified server-side,
    constant-time. Stored hashed, never plaintext."""

    venue = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='staff_codes')
    code_hash = models.CharField(max_length=128)
    active = models.BooleanField(default=True)
    rotates_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f'StaffCode<{self.venue}>'
