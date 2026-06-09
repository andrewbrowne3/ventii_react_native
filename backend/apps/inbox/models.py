from django.conf import settings
from django.db import models

from apps.events.models import Event
from apps.profiles.models import Profile


class ActivityItem(models.Model):
    """An entry in a user's activity feed. Mirrors `ActivityItem` in src/types."""

    KIND_CHOICES = [
        ('rsvp_friend', 'Friend RSVP'),
        ('event_starting', 'Event starting'),
        ('host_message', 'Host message'),
        ('deal_unlocked', 'Deal unlocked'),
        ('ticket_reminder', 'Ticket reminder'),
        ('group_plan_vote', 'Group plan vote'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='activity',
    )
    kind = models.CharField(max_length=30, choices=KIND_CHOICES)
    actor_profile = models.ForeignKey(
        Profile, null=True, blank=True, on_delete=models.SET_NULL, related_name='+',
    )
    actor_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='+',
    )
    event = models.ForeignKey(Event, null=True, blank=True, on_delete=models.SET_NULL)
    message = models.CharField(max_length=400)
    read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']


class InboxThread(models.Model):
    """A message thread with a partner host or a friend. Mirrors `InboxThread`."""

    KIND_CHOICES = [('partner', 'Partner'), ('friend', 'Friend')]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='threads',
    )
    kind = models.CharField(max_length=20, choices=KIND_CHOICES)
    participant_profile = models.ForeignKey(
        Profile, null=True, blank=True, on_delete=models.SET_NULL, related_name='+',
    )
    participant_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='+',
    )
    last_message = models.CharField(max_length=400, blank=True)
    last_message_at = models.DateTimeField(null=True, blank=True)
    unread_count = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['-last_message_at']
