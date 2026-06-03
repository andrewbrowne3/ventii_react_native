from django.conf import settings
from django.db import models

from apps.events.models import Event, TicketOption


class OwnedTicket(models.Model):
    """A ticket a user holds. Mirrors `OwnedTicket` in src/types/index.ts."""

    STATUS_CHOICES = [
        ('active', 'Active'),
        ('used', 'Used'),
        ('expired', 'Expired'),
        ('transferred', 'Transferred'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='tickets',
    )
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='owned_tickets')
    option = models.ForeignKey(TicketOption, on_delete=models.PROTECT, related_name='owned_tickets')
    quantity = models.PositiveIntegerField(default=1)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    purchased_at = models.DateTimeField(auto_now_add=True)
    # PLACEHOLDER payload — not a real scannable QR (matches the app's intent).
    qr_payload = models.CharField(max_length=255, blank=True)
    order_id = models.CharField(max_length=64, blank=True)

    class Meta:
        ordering = ['-purchased_at']

    def __str__(self) -> str:
        return f'{self.user} — {self.event} ({self.status})'
