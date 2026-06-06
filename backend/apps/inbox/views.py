from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import ActivityItem, InboxThread
from .serializers import ActivityItemSerializer, InboxThreadSerializer


def _thread_qs(user):
    return InboxThread.objects.filter(user=user).select_related(
        'participant_profile', 'participant_user',
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def inbox_list(request):
    """GET /api/inbox/ — the user's message threads."""
    paginator = PageNumberPagination()
    page = paginator.paginate_queryset(_thread_qs(request.user), request)
    data = InboxThreadSerializer(page, many=True, context={'request': request}).data
    return paginator.get_paginated_response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def inbox_detail(request, pk):
    """GET /api/inbox/{id}/."""
    thread = get_object_or_404(_thread_qs(request.user), pk=pk)
    return Response(InboxThreadSerializer(thread, context={'request': request}).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def inbox_activity(request):
    """GET /api/inbox/activity/ — the user's activity feed."""
    qs = (
        ActivityItem.objects.filter(user=request.user)
        .select_related('actor_profile', 'actor_user', 'event__venue')
        .prefetch_related('event__hosts', 'event__ticket_options', 'event__deals', 'event__deals__offers')
    )
    paginator = PageNumberPagination()
    page = paginator.paginate_queryset(qs, request)
    data = ActivityItemSerializer(page, many=True, context={'request': request}).data
    return paginator.get_paginated_response(data)
