from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.profiles.models import Profile

from .models import Event
from .serializers import EventCreateSerializer, EventSerializer


def _event_qs():
    return (
        Event.objects.select_related('venue')
        .prefetch_related('hosts', 'ticket_options', 'deals')
        .all()
    )


@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def events_list_create(request):
    """GET /api/events/ (public) — list. POST (auth) — create an event."""
    if request.method == 'GET':
        paginator = PageNumberPagination()
        page = paginator.paginate_queryset(_event_qs(), request)
        data = EventSerializer(page, many=True, context={'request': request}).data
        return paginator.get_paginated_response(data)

    # POST — an authenticated profile posts its own event.
    if not request.user.is_authenticated:
        return Response({'detail': 'Authentication required.'}, status=401)
    serializer = EventCreateSerializer(data=request.data, context={'request': request})
    serializer.is_valid(raise_exception=True)
    event = serializer.save()
    # The creator's profile becomes a host, so the event shows up under them.
    profile = Profile.objects.filter(owner=request.user).first()
    if profile:
        event.hosts.add(profile)
    return Response(
        EventCreateSerializer(event, context={'request': request}).data, status=201,
    )


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([AllowAny])
def event_detail(request, pk):
    """GET (public) — retrieve. PUT/PATCH/DELETE (auth) — modify."""
    event = get_object_or_404(_event_qs(), pk=pk)

    if request.method == 'GET':
        return Response(EventSerializer(event, context={'request': request}).data)

    if not request.user.is_authenticated:
        return Response({'detail': 'Authentication required.'}, status=401)

    if request.method == 'DELETE':
        event.delete()
        return Response(status=204)

    serializer = EventCreateSerializer(
        event, data=request.data, partial=(request.method == 'PATCH'),
        context={'request': request},
    )
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(EventCreateSerializer(event, context={'request': request}).data)
