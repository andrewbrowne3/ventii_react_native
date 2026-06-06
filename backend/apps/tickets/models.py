from django.conf import settings
from django.db import models

from apps.events.models import Deal, DealOffer, Event, TicketOption


class OwnedTicket(models.Model):
    """A ticket/pass a user holds — the `Pass` in ventii-ticketing.ts.

    A free RSVP is the SAME object with price 0 and kind 'rsvp'; the host scans
    it identically. VENTII is the system of record for everything it issues."""

    # Pass lifecycle (ventii-ticketing.ts). Free RSVPs are `valid` immediately;
    # paid passes are `issued` until payment captures, then `valid`.
    STATUS_CHOICES = [
        ('issued', 'Issued'),
        ('valid', 'Valid'),
        ('checked_in', 'Checked in'),
        ('refunded', 'Refunded'),
        ('voided', 'Voided'),
    ]
    KIND_CHOICES = [
        ('rsvp', 'RSVP'),
        ('ticket', 'Ticket'),
        ('member', 'Member'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='tickets',
    )
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='owned_tickets')
    # Null for a plain RSVP (no ticket option).
    option = models.ForeignKey(
        TicketOption, on_delete=models.PROTECT, related_name='owned_tickets',
        null=True, blank=True,
    )
    quantity = models.PositiveIntegerField(default=1)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='valid')
    purchased_at = models.DateTimeField(auto_now_add=True)
    # PLACEHOLDER payload — not a real scannable QR (matches the app's intent).
    qr_payload = models.CharField(max_length=255, blank=True)
    order_id = models.CharField(max_length=64, blank=True)

    # ── Pass contract fields (ventii-ticketing.ts:Pass). ──
    kind = models.CharField(max_length=10, choices=KIND_CHOICES, default='ticket')
    price = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    currency = models.CharField(max_length=3, default='USD')
    # Server-allocated; uniqueness enforced at mint time. (Unique DB constraint
    # added in a later phase once every row is backfilled.)
    confirmation_code = models.CharField(max_length=32, blank=True)
    holder_name = models.CharField(max_length=160, blank=True)
    # Server-signed token; '' until the backend signs it. Never fabricated client-side.
    qr_value = models.TextField(blank=True)
    entry_instructions = models.CharField(max_length=240, default='Show this pass at the door.')

    class Meta:
        ordering = ['-purchased_at']

    def __str__(self) -> str:
        return f'{self.user} — {self.event} ({self.status})'


class Redemption(models.Model):
    """A redeemed deal voucher — the `Redemption` in 05_VENTII_deals_CODE.ts.

    A Redemption is to a deal what a Pass is to a ticket. Redeeming IS the use,
    so `redeemed` is terminal (besides `voided`). Redemption rows double as the
    per-user claim ledger driving limit_per_user / total_limit."""

    STATUS_CHOICES = [
        ('redeemed', 'Redeemed'),
        ('voided', 'Voided'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='redemptions',
    )
    deal = models.ForeignKey(Deal, on_delete=models.CASCADE, related_name='redemptions')
    offer = models.ForeignKey(DealOffer, on_delete=models.CASCADE, related_name='redemptions')
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='redemptions')
    title = models.CharField(max_length=160)        # snapshot at redemption time
    venue = models.CharField(max_length=160, blank=True)
    image = models.URLField(blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='redeemed')
    code = models.CharField(max_length=32, blank=True)   # server-allocated receipt
    holder_name = models.CharField(max_length=160, blank=True)
    redeemed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-redeemed_at']

    def __str__(self) -> str:
        return f'{self.user} — {self.title} ({self.status})'
