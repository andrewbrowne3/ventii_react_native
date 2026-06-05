from rest_framework import viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated

from apps.profiles.models import Profile

from .models import Event
from .serializers import EventCreateSerializer, EventSerializer


class EventViewSet(viewsets.ModelViewSet):
    """Events are public to read; an authenticated profile can post its own."""

    def get_queryset(self):
        return (
            Event.objects.select_related('venue')
            .prefetch_related('hosts', 'ticket_options', 'deals')
            .all()
        )

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return EventCreateSerializer
        return EventSerializer

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAuthenticated()]
        return [AllowAny()]

    def perform_create(self, serializer):
        event = serializer.save()
        # The creator's profile becomes a host, so the event shows up under
        # them in the feed and on their profile.
        profile = Profile.objects.filter(owner=self.request.user).first()
        if profile:
            event.hosts.add(profile)
