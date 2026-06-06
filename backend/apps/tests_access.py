"""Tests for apps/access.py — the server-authoritative twin of the client
contracts. Mirrors ventii-ticketing.ts EXAMPLE_CONFIGS and
05_VENTII_deals_CODE.ts EXAMPLE_DEALS so the Python port stays in lock-step.

Pure logic — no DB, so SimpleTestCase.
"""
from datetime import datetime, timezone

from django.test import SimpleTestCase

from apps import access

# ── ticketing EXAMPLE_CONFIGS (verbatim from the contract) ────────────────────
CONFIGS = {
    "open_save_only": None,
    "open_rsvp": {
        "isTicketed": False, "currency": "USD", "commitment": "rsvp",
        "capacity": 100, "ticketOptions": [],
    },
    "ticketed": {
        "isTicketed": True, "currency": "USD", "capacity": 250,
        "ticketOptions": [
            {"id": "ga", "name": "General Admission", "price": 25, "available": True},
            {"id": "vip", "name": "VIP", "price": 75, "available": True},
            {"id": "gold", "name": "VENTII Gold Ticket", "price": 18, "available": True,
             "requiredTier": "gold", "isMemberExclusive": True},
        ],
    },
    "passcode": {
        "isTicketed": False, "currency": "USD", "visibility": "passcode",
        "commitment": "rsvp", "passcode": "OPENSESAME", "ticketOptions": [],
    },
    "member_exclusive": {
        "isTicketed": True, "currency": "USD", "commitRequiredTier": "gold",
        "capacity": 60,
        "ticketOptions": [{"id": "ga", "name": "Gold Member Entry", "price": 5, "available": True}],
    },
    "external": {
        "isTicketed": False, "currency": "USD", "commitment": "external",
        "externalUrl": "https://host.example.com/tickets", "ticketOptions": [],
    },
    "hidden_member": {
        "isTicketed": True, "currency": "USD", "visibility": "member",
        "commitRequiredTier": "gold",
        "ticketOptions": [{"id": "ga", "name": "Members Entry", "price": 0, "available": True}],
    },
}


class TierTests(SimpleTestCase):
    def test_ladder(self):
        self.assertTrue(access.user_meets_tier("gold", "pro"))
        self.assertTrue(access.user_meets_tier("pro", "pro"))
        self.assertFalse(access.user_meets_tier("free", "pro"))
        self.assertTrue(access.user_meets_tier("free", None))   # no gate == open


class AccessTypeTests(SimpleTestCase):
    def test_labels(self):
        self.assertEqual(access.resolve_access_type(CONFIGS["open_save_only"])["label"], "Open (save only)")
        self.assertEqual(access.resolve_access_type(CONFIGS["open_rsvp"])["label"], "Open RSVP")
        self.assertEqual(access.resolve_access_type(CONFIGS["ticketed"])["label"], "Ticketed")
        self.assertEqual(access.resolve_access_type(CONFIGS["passcode"])["label"], "Passcode")
        self.assertEqual(access.resolve_access_type(CONFIGS["external"])["label"], "External")
        self.assertEqual(access.resolve_access_type(CONFIGS["hidden_member"])["label"], "Member-only")


class CommitCtaTests(SimpleTestCase):
    def test_save_only_and_external(self):
        self.assertEqual(access.resolve_commit_cta(CONFIGS["open_save_only"], "free", 0), "save_only")
        self.assertEqual(access.resolve_commit_cta(CONFIGS["external"], "free", 0), "open_external")

    def test_rsvp_and_ticket(self):
        self.assertEqual(access.resolve_commit_cta(CONFIGS["open_rsvp"], "free", 0), "rsvp")
        self.assertEqual(access.resolve_commit_cta(CONFIGS["ticketed"], "free", 0), "checkout")

    def test_capacity_sold_out_counts_free_rsvps(self):
        self.assertEqual(access.resolve_commit_cta(CONFIGS["open_rsvp"], "free", 100), "sold_out")
        self.assertEqual(access.resolve_commit_cta(CONFIGS["open_rsvp"], "free", 99), "rsvp")

    def test_gold_gate_blocks_free_and_pro(self):
        cfg = CONFIGS["member_exclusive"]
        self.assertEqual(access.resolve_commit_cta(cfg, "free", 0), "locked_member")
        self.assertEqual(access.resolve_commit_cta(cfg, "pro", 0), "locked_member")
        self.assertEqual(access.resolve_commit_cta(cfg, "gold", 0), "checkout")


class OptionAndVisibilityTests(SimpleTestCase):
    def test_gold_only_option_locks(self):
        gold_opt = CONFIGS["ticketed"]["ticketOptions"][2]
        self.assertFalse(access.is_option_available_to(gold_opt, "free"))
        self.assertFalse(access.is_option_available_to(gold_opt, "pro"))
        self.assertTrue(access.is_option_available_to(gold_opt, "gold"))

    def test_passcode_visibility(self):
        cfg = CONFIGS["passcode"]
        self.assertFalse(access.can_view_details(cfg, "gold", passcode_ok=False))
        self.assertTrue(access.can_view_details(cfg, "free", passcode_ok=True))

    def test_hidden_member_visibility(self):
        cfg = CONFIGS["hidden_member"]
        self.assertFalse(access.can_view_details(cfg, "free"))
        self.assertFalse(access.can_view_details(cfg, "pro"))
        self.assertTrue(access.can_view_details(cfg, "gold"))

    def test_open_event_always_visible(self):
        self.assertTrue(access.can_view_details(CONFIGS["ticketed"], "free"))


# ── deals EXAMPLE_DEALS (verbatim from the contract) ──────────────────────────
FRIDAY = {
    "id": "deal-1", "eventId": 1, "title": "Friday", "venue": "New Realm Brewery",
    "validFrom": None, "validUntil": "2026-11-07T03:00:00-04:00", "totalLimit": None,
    "offers": [
        {"id": "drink1", "title": "$5 off cocktail", "limitPerUser": 1},
        {"id": "entry", "title": "Free entry", "limitPerUser": 1, "requiredTier": "pro"},
    ],
}
ROOFTOP_GOLD = {
    "id": "deal-5", "eventId": 5, "title": "Rooftop", "venue": "Ponce City Market",
    "requiredTier": "gold", "validFrom": "2026-11-01T00:00:00-04:00",
    "validUntil": "2026-11-02T03:00:00-04:00", "totalLimit": 60,
    "offers": [{"id": "wine", "title": "2-for-1 wine", "limitPerUser": 1}],
}
HOUSE = {
    "id": "deal-house", "eventId": "venue-standing", "title": "House Happy Hour",
    "venue": "New Realm Brewery", "validFrom": None, "validUntil": None, "totalLimit": None,
    "offers": [{"id": "draft", "title": "$2 off draft", "limitPerUser": None}],
}

NOV_1 = datetime(2026, 11, 1, 12, 0, tzinfo=timezone.utc)
JUN_6 = datetime(2026, 6, 6, 12, 0, tzinfo=timezone.utc)


class DealCtaTests(SimpleTestCase):
    def test_open_deal_tier_gated_offer(self):
        drink = FRIDAY["offers"][0]
        entry = FRIDAY["offers"][1]
        self.assertEqual(access.resolve_deal_cta(FRIDAY, drink, "free", now=JUN_6), "redeem")
        self.assertEqual(access.resolve_deal_cta(FRIDAY, entry, "free", now=JUN_6), "locked_member")
        self.assertEqual(access.resolve_deal_cta(FRIDAY, entry, "pro", now=JUN_6), "redeem")

    def test_already_redeemed_per_user_limit(self):
        drink = FRIDAY["offers"][0]
        self.assertEqual(
            access.resolve_deal_cta(FRIDAY, drink, "free", user_redeemed_count=1, now=JUN_6),
            "already_redeemed",
        )

    def test_expired_outside_window(self):
        wine = ROOFTOP_GOLD["offers"][0]
        # JUN_6 is before validFrom (Nov 1) → expired
        self.assertEqual(access.resolve_deal_cta(ROOFTOP_GOLD, wine, "gold", now=JUN_6), "expired")

    def test_gold_window_and_sold_out(self):
        wine = ROOFTOP_GOLD["offers"][0]
        self.assertEqual(access.resolve_deal_cta(ROOFTOP_GOLD, wine, "gold", now=NOV_1), "redeem")
        self.assertEqual(access.resolve_deal_cta(ROOFTOP_GOLD, wine, "free", now=NOV_1), "locked_member")
        self.assertEqual(
            access.resolve_deal_cta(ROOFTOP_GOLD, wine, "gold", total_redeemed_count=60, now=NOV_1),
            "sold_out",
        )

    def test_infinite_deal_never_expires_or_limits(self):
        draft = HOUSE["offers"][0]
        self.assertTrue(access.is_deal_active(HOUSE, now=NOV_1))
        self.assertEqual(
            access.resolve_deal_cta(HOUSE, draft, "free", user_redeemed_count=999, now=NOV_1),
            "redeem",
        )
