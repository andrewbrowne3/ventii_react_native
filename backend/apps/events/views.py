import uuid

from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps import access
from apps.profiles.models import Profile
from apps.security import sign_qr
from apps.tickets.models import OwnedTicket
from apps.tickets.serializers import OwnedTicketSerializer

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


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def event_rsvp(request, pk):
    """POST /api/events/{id}/rsvp/ — mint a free RSVP pass into the wallet.

    Server-authoritative: re-checks the commit CTA and reserves capacity
    atomically (free RSVPs count). Idempotent — a user who already holds a live
    RSVP pass for this event gets that same pass back, with no double-count."""
    tier = getattr(request.user, 'membership_tier', access.FREE)

    with transaction.atomic():
        event = get_object_or_404(Event.objects.select_for_update(), pk=pk)

        existing = OwnedTicket.objects.filter(
            user=request.user, event=event, kind='rsvp',
            status__in=('issued', 'valid', 'checked_in'),
        ).first()
        if existing:
            return Response(
                OwnedTicketSerializer(existing, context={'request': request}).data,
                status=200,
            )

        cta = access.resolve_commit_cta(
            access.ticketing_from_event(event), tier, event.issued_count,
        )
        if cta != 'rsvp':
            return Response(
                {'detail': 'RSVP is not available for this event.', 'cta': cta},
                status=409,
            )

        # Reserve capacity under the row lock (free RSVPs count against it).
        event.issued_count = event.issued_count + 1
        event.save(update_fields=['issued_count'])

        pass_obj = OwnedTicket.objects.create(
            user=request.user, event=event, option=None, quantity=1,
            kind='rsvp', price=0, currency=event.currency, status='valid',
            holder_name=request.user.full_name,
            confirmation_code=f'VEN-{uuid.uuid4().hex[:10].upper()}',
        )
        pass_obj.qr_value = sign_qr(pass_obj)
        pass_obj.save(update_fields=['qr_value'])

    return Response(
        OwnedTicketSerializer(pass_obj, context={'request': request}).data, status=201,
    )
