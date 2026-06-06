from django.core import signing
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps import access
from apps.profiles.models import Profile
from apps.security import verify_qr

from .models import OwnedTicket
from .serializers import OwnedTicketSerializer


def _ticket_qs(user):
    """The authenticated user's own tickets/passes."""
    return (
        OwnedTicket.objects.filter(user=user)
        .select_related('event__venue', 'option')
        .prefetch_related('event__hosts', 'event__ticket_options', 'event__deals')
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def tickets_list(request):
    """GET /api/tickets/ — the user's wallet."""
    paginator = PageNumberPagination()
    page = paginator.paginate_queryset(_ticket_qs(request.user), request)
    data = OwnedTicketSerializer(page, many=True, context={'request': request}).data
    return paginator.get_paginated_response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ticket_detail(request, pk):
    """GET /api/tickets/{id}/ — one of the user's own passes."""
    ticket = get_object_or_404(_ticket_qs(request.user), pk=pk)
    return Response(OwnedTicketSerializer(ticket, context={'request': request}).data)


# ── Door scanning (Phase 2) ───────────────────────────────────────────────────
def _can_scan(user, event) -> bool:
    """A user may scan an event's passes if they're staff, or own a Profile
    that is one of the event's hosts or its venue."""
    if user.is_staff or user.is_superuser:
        return True
    profile_ids = list(Profile.objects.filter(owner=user).values_list('id', flat=True))
    if not profile_ids:
        return False
    if event.venue_id in profile_ids:
        return True
    return event.hosts.filter(id__in=profile_ids).exists()


def _scan_pass_info(p) -> dict:
    """Minimal pass info for the door UI."""
    return {
        'id': str(p.id),
        'confirmation_code': p.confirmation_code,
        'holder_name': p.holder_name,
        'ticket_type': p.option.name if p.option_id else 'RSVP',
        'status': p.status,
        'event_title': p.event.title,
    }


def _check_in_atomic(pass_id):
    """Atomic single-use check-in. Returns (pass, was_first_to_check_in).

    Under concurrent scans exactly one caller flips valid->checked_in; the rest
    see it already checked in. The decision happens under a row lock."""
    with transaction.atomic():
        p = OwnedTicket.objects.select_for_update().select_related('event', 'option').get(pk=pass_id)
        if p.status == 'valid':
            p.status = 'checked_in'
            p.save(update_fields=['status'])
            return p, True
        return p, False


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def scan(request):
    """POST /api/scan/ {qr_value} — verify a pass and check it in at the door.

    verify signature -> load pass -> authorize scanner -> evaluate -> atomic
    single-use check-in. Returns {ok, reason, pass}."""
    token = request.data.get('qr_value') or request.data.get('token')
    if not token:
        return Response({'ok': False, 'reason': 'no_qr'}, status=400)

    try:
        payload = verify_qr(token)
    except signing.BadSignature:
        return Response({'ok': False, 'reason': 'invalid_signature'}, status=400)

    pass_obj = (
        OwnedTicket.objects.select_related('event', 'option')
        .filter(pk=payload.get('pid')).first()
    )
    if not pass_obj or pass_obj.confirmation_code != payload.get('cc'):
        return Response({'ok': False, 'reason': 'not_found'}, status=404)

    if not _can_scan(request.user, pass_obj.event):
        return Response(
            {'ok': False, 'reason': 'not_authorized'}, status=403,
        )

    result = access.evaluate_scan(pass_obj.status, bool(pass_obj.qr_value))
    if result['reason'] != 'valid':
        # Terminal/non-admittable state — report without locking.
        return Response(
            {'ok': False, 'reason': result['reason'], 'pass': _scan_pass_info(pass_obj)},
            status=200,
        )

    checked, was_first = _check_in_atomic(pass_obj.id)
    return Response(
        {
            'ok': was_first,
            'reason': 'valid' if was_first else 'already_checked_in',
            'pass': _scan_pass_info(checked),
        },
        status=200,
    )
