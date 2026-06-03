from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import ActivityItem, InboxThread
from .serializers import ActivityItemSerializer, InboxThreadSerializer


class InboxThreadViewSet(viewsets.ReadOnlyModelViewSet):
    """Message threads for the authenticated user.

    GET /api/inbox/           -> threads
    GET /api/inbox/activity/  -> the user's activity feed
    """

    serializer_class = InboxThreadSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return InboxThread.objects.filter(user=self.request.user).select_related(
            'participant_profile', 'participant_user',
        )

    @action(detail=False, methods=['get'])
    def activity(self, request):
        qs = (
            ActivityItem.objects.filter(user=request.user)
            .select_related('actor_profile', 'actor_user', 'event__venue')
            .prefetch_related('event__hosts', 'event__ticket_options', 'event__deals')
        )
        page = self.paginate_queryset(qs)
        serializer = ActivityItemSerializer(page, many=True, context={'request': request})
        return self.get_paginated_response(serializer.data)
