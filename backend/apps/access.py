"""VENTII access logic — server-authoritative twin of the client contracts.

A pure Python port of the pure functions in `ventii-ticketing.ts` and
`05_VENTII_deals_CODE.ts`. NO Django models, NO network, NO secrets — just the
decisions the frontend predicts and the server must re-enforce (never trust the
client).

Core functions operate on plain dicts shaped exactly like the contract's
`EventTicketing` / `Deal` / `DealOffer`, so they can be tested directly against
the contract's EXAMPLE_CONFIGS / EXAMPLE_DEALS. Thin `*_from_*` adapters build
those dicts from Django model instances for the views to call.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

# ── Membership tiers (ladder: guest < free < pro < gold) ──────────────────────
GUEST, FREE, PRO, GOLD = "guest", "free", "pro", "gold"
TIER_CHOICES = [(GUEST, "Guest"), (FREE, "Free"), (PRO, "Pro"), (GOLD, "Gold")]
TIER_RANK = {GUEST: 0, FREE: 1, PRO: 2, GOLD: 3}


def user_meets_tier(tier: str, required: Optional[str]) -> bool:
    """True if `tier` is at or above `required`. Falsy `required` == open to all."""
    if not required:
        return True
    return TIER_RANK[tier] >= TIER_RANK[required]


# ── The two access axes ───────────────────────────────────────────────────────
# A `ticketing` value of None means the event is save-only (commitment "none").

def get_visibility(t: Optional[dict]) -> str:
    return (t or {}).get("visibility") or "open"


def get_commitment(t: Optional[dict]) -> str:
    if not t:
        return "none"
    if t.get("commitment"):
        return t["commitment"]
    if t.get("externalUrl"):
        return "external"
    if t.get("isTicketed"):
        return "ticket"
    return "rsvp"


def access_label(visibility: str, commitment: str) -> str:
    if visibility == "member":
        return "Member-only"
    if visibility == "passcode":
        return "Passcode"
    return {
        "none": "Open (save only)",
        "rsvp": "Open RSVP",
        "ticket": "Ticketed",
        "external": "External",
    }[commitment]


def resolve_access_type(t: Optional[dict]) -> dict:
    v = get_visibility(t)
    c = get_commitment(t)
    return {"visibility": v, "commitment": c, "label": access_label(v, c)}


# ── Visibility ────────────────────────────────────────────────────────────────
def can_view_details(t: Optional[dict], user_tier: str, passcode_ok: Optional[bool] = None) -> bool:
    """Tier never gates visibility for a Gold event — everyone sees details +
    price; the gate is only on committing. `member` visibility is the rare
    fully-hidden case (gated by commitRequiredTier, default gold)."""
    v = get_visibility(t)
    if v == "open":
        return True
    if v == "passcode":
        return passcode_ok is True
    if v == "member":
        return user_meets_tier(user_tier, (t or {}).get("commitRequiredTier") or GOLD)
    raise ValueError(f"Unhandled visibility: {v}")


# ── Capacity (free RSVPs count) ───────────────────────────────────────────────
def capacity_info(t: Optional[dict], issued_count: int) -> dict:
    cap = (t or {}).get("capacity")
    if cap is None:
        return {"capacity": None, "issued": issued_count, "remaining": None, "soldOut": False}
    remaining = max(0, cap - issued_count)
    return {"capacity": cap, "issued": issued_count, "remaining": remaining, "soldOut": remaining <= 0}


# ── Per-option availability (e.g. a Gold-only discounted ticket) ──────────────
def is_option_available_to(option: dict, tier: str) -> bool:
    return bool(option.get("available", True)) and user_meets_tier(tier, option.get("requiredTier"))


# ── The commit CTA — the central decision ─────────────────────────────────────
# save_only | rsvp | checkout | open_external | locked_member | sold_out
def resolve_commit_cta(t: Optional[dict], user_tier: str, issued_count: int,
                       passcode_ok: Optional[bool] = None) -> str:
    commitment = get_commitment(t)
    if commitment == "none":
        return "save_only"
    if commitment == "external":
        return "open_external"

    gate = (t or {}).get("commitRequiredTier")
    if gate and not user_meets_tier(user_tier, gate):
        return "locked_member"

    if capacity_info(t, issued_count)["soldOut"]:
        return "sold_out"

    return "checkout" if commitment == "ticket" else "rsvp"


def can_commit(t: Optional[dict], user_tier: str, issued_count: int,
               passcode_ok: Optional[bool] = None) -> bool:
    return resolve_commit_cta(t, user_tier, issued_count, passcode_ok) in ("rsvp", "checkout")


# ── Deals ─────────────────────────────────────────────────────────────────────
def _parse_iso(s: Optional[str]) -> Optional[datetime]:
    if not s:
        return None
    return datetime.fromisoformat(s)


def is_deal_active(deal: dict, now: Optional[datetime] = None) -> bool:
    now = now or datetime.now(timezone.utc)
    frm = _parse_iso(deal.get("validFrom"))
    until = _parse_iso(deal.get("validUntil"))
    if frm and now < frm:
        return False
    if until and now > until:
        return False
    return True


def is_offer_available_to(offer: dict, deal: dict, tier: str) -> bool:
    return user_meets_tier(tier, offer.get("requiredTier") or deal.get("requiredTier"))


# redeem | locked_member | expired | sold_out | already_redeemed
def resolve_deal_cta(deal: dict, offer: dict, user_tier: str,
                     user_redeemed_count: int = 0, total_redeemed_count: int = 0,
                     now: Optional[datetime] = None) -> str:
    if not is_deal_active(deal, now):
        return "expired"

    gate = offer.get("requiredTier") or deal.get("requiredTier")
    if gate and not user_meets_tier(user_tier, gate):
        return "locked_member"

    total_limit = deal.get("totalLimit")
    if total_limit is not None and total_redeemed_count >= total_limit:
        return "sold_out"

    limit_per_user = offer.get("limitPerUser")
    if limit_per_user is not None and user_redeemed_count >= limit_per_user:
        return "already_redeemed"

    return "redeem"


def can_redeem(deal: dict, offer: dict, user_tier: str,
               user_redeemed_count: int = 0, total_redeemed_count: int = 0,
               now: Optional[datetime] = None) -> bool:
    return resolve_deal_cta(deal, offer, user_tier, user_redeemed_count,
                            total_redeemed_count, now) == "redeem"


# ── Model adapters (build contract-shaped dicts from Django instances) ─────────
def ticketing_from_event(event) -> Optional[dict]:
    """Build an EventTicketing-shaped dict from a Django Event, or None if the
    event is save-only (commitment 'none' and nothing ticketed/external)."""
    options = [
        {
            "id": str(o.id),
            "name": o.name,
            "description": o.description,
            "price": float(o.price),
            "available": o.available,
            "requiredTier": o.required_tier or None,
            "isMemberExclusive": o.is_member_exclusive,
        }
        for o in event.ticket_options.all()
    ]
    is_ticketed = any(o["price"] > 0 for o in options) or bool(options)
    commitment = event.commitment or None
    if commitment == "none" and not is_ticketed and not event.external_url:
        return None
    return {
        "isTicketed": is_ticketed,
        "currency": event.currency,
        "ticketOptions": options,
        "visibility": event.visibility,
        "commitment": commitment,
        "externalUrl": event.external_url or None,
        "commitRequiredTier": event.commit_required_tier or None,
        "capacity": event.capacity,
    }


def deal_dict_from_model(deal) -> dict:
    return {
        "id": str(deal.id),
        "eventId": str(deal.event_id),
        "title": deal.title,
        "subtitle": deal.subtitle,
        "venue": deal.venue,
        "validFrom": deal.valid_from.isoformat() if deal.valid_from else None,
        "validUntil": deal.valid_until.isoformat() if deal.valid_until else None,
        "requiredTier": deal.required_tier or None,
        "totalLimit": deal.total_limit,
        "offers": [
            {
                "id": str(o.id),
                "title": o.title,
                "image": o.image,
                "limitPerUser": o.limit_per_user,
                "requiredTier": o.required_tier or None,
            }
            for o in deal.offers.all()
        ],
    }
