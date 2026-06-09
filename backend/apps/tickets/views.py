import uuid

from django.core import signing
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework.decorators import (
    api_view, authentication_classes, permission_classes,
)
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps import access, payments
from apps.events.models import Deal, DealOffer, Event
from apps.profiles.models import Profile
from apps.security import sign_qr, verify_code, verify_qr

from .models import OwnedTicket, Redemption
from .serializers import OwnedTicketSerializer, RedemptionSerializer


def _ticket_qs(user):
    """The authenticated user's own tickets/passes."""
    return (
        OwnedTicket.objects.filter(user=user)
        .select_related('event__venue', 'option')
        .prefetch_related('event__hosts', 'event__ticket_options', 'event__deals', 'event__deals__offers')
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


# ── Deals: redemption (Phase 3) ───────────────────────────────────────────────
def _validate_staff_code(venue, code) -> bool:
    """True if `code` matches one of the venue's active staff codes."""
    if not code or venue is None:
        return False
    for sc in venue.staff_codes.filter(active=True):
        if verify_code(code, sc.code_hash):
            return True
    return False


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def deal_redeem(request, pk):
    """POST /api/deals/{id}/redeem/ {offer_id, staff_code} -> Redemption.

    Validates the venue staff code, re-checks the deal CTA, consumes one claim
    against per-user/total limits atomically, then mints a Wallet voucher.
    Entering the validated staff code IS the use — no later scan step."""
    deal = get_object_or_404(Deal.objects.select_related('event__venue'), pk=pk)
    offer = get_object_or_404(DealOffer, pk=request.data.get('offer_id'), deal=deal)
    staff_code = request.data.get('staff_code', '')
    tier = getattr(request.user, 'membership_tier', access.FREE)
    venue = deal.event.venue

    deal_dict = access.deal_dict_from_model(deal)
    offer_dict = next((o for o in deal_dict['offers'] if o['id'] == str(offer.id)), {})

    if not _validate_staff_code(venue, staff_code):
        return Response({'detail': 'Invalid or inactive staff code.'}, status=400)

    with transaction.atomic():
        Deal.objects.select_for_update().get(pk=deal.pk)   # lock the deal row
        user_count = Redemption.objects.filter(
            user=request.user, offer=offer, status='redeemed').count()
        total_count = Redemption.objects.filter(deal=deal, status='redeemed').count()
        cta = access.resolve_deal_cta(deal_dict, offer_dict, tier, user_count, total_count)
        if cta != 'redeem':
            return Response({'detail': 'Cannot redeem this offer.', 'cta': cta}, status=409)

        redemption = Redemption.objects.create(
            user=request.user, deal=deal, offer=offer, event=deal.event,
            title=offer.title,
            venue=deal.venue or (venue.display_name if venue else ''),
            image=offer.image, status='redeemed',
            code=f'VEN-{uuid.uuid4().hex[:10].upper()}',
            holder_name=request.user.full_name,
        )

    return Response(RedemptionSerializer(redemption).data, status=201)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def redemption_void(request, pk):
    """POST /api/redemptions/{id}/void/ — void the user's own voucher."""
    r = get_object_or_404(Redemption, pk=pk, user=request.user)
    if r.status != 'voided':
        r.status = 'voided'
        r.save(update_fields=['status'])
    return Response(RedemptionSerializer(r).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def redemptions_list(request):
    """GET /api/redemptions/ — the user's Wallet > Deals."""
    qs = Redemption.objects.filter(user=request.user).select_related(
        'deal', 'offer', 'event')
    paginator = PageNumberPagination()
    page = paginator.paginate_queryset(qs, request)
    data = RedemptionSerializer(page, many=True, context={'request': request}).data
    return paginator.get_paginated_response(data)


# ── Paid tickets: payment capture + refund (Phase 4) ──────────────────────────
def _capture_pass(pass_obj):
    """Flip a paid pass issued -> valid and sign its QR (on payment capture)."""
    if pass_obj.status == 'issued':
        pass_obj.status = 'valid'
        pass_obj.qr_value = sign_qr(pass_obj)
        pass_obj.save(update_fields=['status', 'qr_value'])
    return pass_obj


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def stripe_webhook(request):
    """POST /api/webhooks/stripe/ — on payment_intent.succeeded, capture the
    pass (issued -> valid + signed QR). Signature-verified; no auth."""
    if not payments.is_configured():
        return Response(status=503)
    try:
        event = payments.verify_webhook(
            request.body, request.META.get('HTTP_STRIPE_SIGNATURE', ''))
    except Exception:
        return Response({'detail': 'invalid signature'}, status=400)

    if event['type'] == 'payment_intent.succeeded':
        pass_id = event['data']['object'].get('metadata', {}).get('pass_id')
        pass_obj = OwnedTicket.objects.select_related('event').filter(pk=pass_id).first()
        if pass_obj:
            _capture_pass(pass_obj)
    return Response({'received': True})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def pass_refund(request, pk):
    """POST /api/passes/{id}/refund/ — refund a pass and release its capacity.

    Allowed for the pass owner or an event host/venue. Refunds via Stripe for
    paid passes; idempotent."""
    pass_obj = get_object_or_404(OwnedTicket.objects.select_related('event'), pk=pk)
    if pass_obj.user_id != request.user.id and not _can_scan(request.user, pass_obj.event):
        return Response({'detail': 'Not authorized.'}, status=403)

    if pass_obj.status in ('refunded', 'voided'):
        return Response(OwnedTicketSerializer(pass_obj, context={'request': request}).data)

    if pass_obj.price and pass_obj.price > 0:
        if not payments.is_configured():
            return Response({'detail': 'Refunds unavailable (payments not configured).'}, status=503)
        if pass_obj.stripe_payment_intent:
            payments.refund_intent(pass_obj.stripe_payment_intent)

    with transaction.atomic():
        event = Event.objects.select_for_update().get(pk=pass_obj.event_id)
        pass_obj.status = 'refunded'
        pass_obj.save(update_fields=['status'])
        if event.issued_count >= pass_obj.quantity:
            event.issued_count = event.issued_count - pass_obj.quantity
            event.save(update_fields=['issued_count'])

    return Response(OwnedTicketSerializer(pass_obj, context={'request': request}).data)
