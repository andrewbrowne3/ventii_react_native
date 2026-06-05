from django.db.models import Q
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.events.models import Event
from apps.events.serializers import EventSerializer

from .models import Profile
from .serializers import ProfileSerializer


class ProfileViewSet(viewsets.ReadOnlyModelViewSet):
    """Public read access to host/venue profiles."""

    queryset = Profile.objects.all()
    serializer_class = ProfileSerializer
    permission_classes = [AllowAny]

    @action(detail=True, methods=['get'])
    def events(self, request, pk=None):
        """GET /api/profiles/{id}/events/ — events this profile hosts or hosts at.

        An event is "this profile's" if the profile is one of its hosts OR is
        the venue. Same event rows the feed uses, viewed from one profile's
        angle (no duplication — events stay standalone).
        """
        profile = self.get_object()
        qs = (
            Event.objects.filter(Q(hosts=profile) | Q(venue=profile))
            .distinct()
            .select_related('venue')
            .prefetch_related('hosts', 'ticket_options', 'deals')
            .order_by('date', 'start_time')
        )
        page = self.paginate_queryset(qs)
        serializer = EventSerializer(
            page if page is not None else qs, many=True, context={'request': request},
        )
        return (
            self.get_paginated_response(serializer.data)
            if page is not None
            else Response(serializer.data)
        )
