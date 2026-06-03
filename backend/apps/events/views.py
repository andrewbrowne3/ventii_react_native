from rest_framework import viewsets
from rest_framework.permissions import AllowAny

from .models import Event
from .serializers import EventSerializer


class EventViewSet(viewsets.ReadOnlyModelViewSet):
    """Public read access to events, with related objects prefetched."""

    serializer_class = EventSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return (
            Event.objects.select_related('venue')
            .prefetch_related('hosts', 'ticket_options', 'deals')
            .all()
        )
