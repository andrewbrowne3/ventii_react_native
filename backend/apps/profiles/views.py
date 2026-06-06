from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.events.models import Event
from apps.events.serializers import EventSerializer

from .models import Profile
from .serializers import ProfileSerializer


@api_view(['GET'])
@permission_classes([AllowAny])
def profiles_list(request):
    """GET /api/profiles/ — public host/venue profiles."""
    paginator = PageNumberPagination()
    page = paginator.paginate_queryset(Profile.objects.all(), request)
    data = ProfileSerializer(page, many=True, context={'request': request}).data
    return paginator.get_paginated_response(data)


@api_view(['GET'])
@permission_classes([AllowAny])
def profile_detail(request, pk):
    """GET /api/profiles/{id}/."""
    profile = get_object_or_404(Profile, pk=pk)
    return Response(ProfileSerializer(profile, context={'request': request}).data)


@api_view(['GET'])
@permission_classes([AllowAny])
def profile_events(request, pk):
    """GET /api/profiles/{id}/events/ — events this profile hosts or hosts at.

    An event is "this profile's" if the profile is one of its hosts OR is the
    venue. Same event rows the feed uses, viewed from one profile's angle.
    """
    profile = get_object_or_404(Profile, pk=pk)
    qs = (
        Event.objects.filter(Q(hosts=profile) | Q(venue=profile))
        .distinct()
        .select_related('venue')
        .prefetch_related('hosts', 'ticket_options', 'deals')
        .order_by('date', 'start_time')
    )
    paginator = PageNumberPagination()
    page = paginator.paginate_queryset(qs, request)
    data = EventSerializer(page, many=True, context={'request': request}).data
    return paginator.get_paginated_response(data)
