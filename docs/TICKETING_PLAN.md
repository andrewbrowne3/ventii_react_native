# VENTII Ticketing + Deals — Backend Mapping Plan

**Goal:** implement the two client contracts (`ventii-ticketing.ts`,
`05_VENTII_deals_CODE.ts` — in `~/Downloads`) on the existing Django backend.
**All schema changes are additive** (new columns + new tables; no renames,
drops, or type changes). The frontend pure functions get a Python twin so the
**server enforces** what the app predicts — never trusting the client.

## Guiding principles

- **One source of truth for access logic:** port the `.ts` pure functions to a
  Python module `apps/access.py`. The frontend may mirror them for UX, but the
  server re-decides every commit/redeem.
- **Secrets stay in the server `.env`** (Stripe, QR signing key) — code reads
  them by name via `os.environ`. Names go in `.env.example`, values only on the
  server.
- **Phased**, each phase shippable on its own; nothing working breaks.
- **Honest prototype:** real Stripe **test mode** before any live key; "Coming
  soon" gates where a piece isn't ready (per `VENTII_PROJECT_BRIEF.md`).

---

## 1. Model changes (all additive)

### `apps/accounts/models.py — User`
```
TIER_CHOICES = guest | free | pro | gold
membership_tier = CharField(max_length=10, choices=TIER_CHOICES, default='free')
```
Stored users are >= free; "guest" = unauthenticated (no row). Set via admin.

### `apps/events/models.py — Event` (new optional fields)
```
visibility            = CharField(choices=open|passcode|member, default='open')
commitment            = CharField(choices=none|rsvp|ticket|external, blank=True)  # blank => derive
commit_required_tier  = CharField(choices=tiers, null=True, blank=True)
capacity              = PositiveIntegerField(null=True, blank=True)   # null = uncapped
issued_count          = PositiveIntegerField(default=0)               # denormalized, atomic
passcode_hash         = CharField(max_length=128, blank=True)         # hashed, never plaintext
external_url          = URLField(blank=True)
currency              = CharField(max_length=3, default='USD')
```
`is_ticketed` and resolved `commitment` are `@property` (external > ticket > rsvp).

### `apps/events/models.py — TicketOption`
```
available           = BooleanField(default=True)
required_tier       = CharField(choices=tiers, null=True, blank=True)
is_member_exclusive = BooleanField(default=False)
```

### `apps/tickets/models.py — OwnedTicket` = the **Pass**
```
kind               = CharField(choices=rsvp|ticket|member, default='ticket')
price              = DecimalField(max_digits=8, decimal_places=2, default=0)
currency           = CharField(max_length=3, default='USD')
confirmation_code  = CharField(max_length=32, unique=True)
holder_name        = CharField(max_length=160, blank=True)
qr_value           = TextField(blank=True)        # signed token; '' until backend signs
entry_instructions = CharField(max_length=240, default='Show this pass at the door.')
```
**Status** lifecycle expands to `issued | valid | checked_in | refunded | voided`
(choices are app-level; non-destructive). Data migration remaps legacy
`active->valid`, `used->checked_in` (reversible). Legacy `qr_payload`/`order_id`
left untouched.

### `apps/events/models.py — Deal` (extend) + new `DealOffer`
```
Deal (add):  subtitle, venue (Char), success_message, success_image (URL),
             valid_from (DateTime null), required_tier (null), total_limit (PositiveInt null)
             # keep valid_until; legacy `redeemed` bool becomes unused
DealOffer (new):  deal FK, title, image, limit_per_user (null=unlimited), required_tier (null)
```

### New model — `Redemption` (Wallet > Deals)
```
Redemption:  user FK, deal FK, offer FK, event FK, title, venue, image,
             status (redeemed|voided), code (unique), holder_name, redeemed_at
```
Redemption rows double as the per-user claim ledger.

### New model — `StaffCode` (venue deal redemption)
```
StaffCode:  profile FK (venue), code_hash, active, rotates_at  # constant-time verify
```

---

## 2. Python access module — `apps/access.py`
Direct port of the contract pure logic (server-authoritative):
`user_meets_tier`, `resolve_access_type`, `can_view_details`, `capacity_info`,
`is_option_available_to`, **`resolve_commit_cta`**, and deals:
`is_deal_active`, `is_offer_available_to`, `resolve_deal_cta`. Unit-tested
against the contract's `EXAMPLE_CONFIGS` / `EXAMPLE_DEALS`.

---

## 3. API endpoints (handoff section 6 -> DRF)

| Method · Path | View | Does |
|---|---|---|
| `GET /api/events/:id` | extend EventViewSet.retrieve | event + issued_count + viewer cta |
| `POST /api/events/:id/passcode` | @action | verify_passcode -> {ok} |
| `POST /api/events/:id/rsvp` | @action | reserve capacity -> mint RSVP -> persist -> sign QR |
| `POST /api/events/:id/checkout` | @action | create_payment_intent -> {client_secret} |
| `POST /api/webhooks/stripe` | new (sig-verified) | on capture: issued->valid, sign QR |
| `GET /api/me/passes` | extend OwnedTicketViewSet | the Wallet |
| `POST /api/passes/:id/refund` | @action | refund_pass |
| `POST /api/scan` | new (host perm) | verify_qr -> evaluate_scan -> check_in_atomic |
| `GET /api/events/:id/deals` | serializer | deals + offers + viewer deal_cta |
| `POST /api/deals/:id/redeem` | @action | validate code -> reserve claim -> mint Redemption |
| `POST /api/redemptions/:id/void` | @action | void_redemption |

All writes require JWT (SimpleJWT). `/scan` needs a host/staff permission class.

---

## 4. The 12 `// BACKEND` functions -> Django

| Contract stub | Django implementation |
|---|---|
| signQr | itsdangerous/PyJWT keyed by QR_SIGNING_KEY env; payload = pass id + nonce |
| verifyQr | verify signature/expiry, load pass; reject tampered |
| checkInAtomic | transaction.atomic + select_for_update; valid->checked_in; idempotent |
| reserveCapacityAtomic | atomic + Event select_for_update; issued_count<capacity; F+qty |
| createPaymentIntent | stripe.PaymentIntent.create; server price; Connect destination=host |
| persistPass | save OwnedTicket; paid -> issued, flipped valid by webhook |
| refundPass | stripe.Refund.create; status=refunded; release capacity |
| verifyPasscode | hmac.compare_digest vs passcode_hash; rate-limited |
| validateRedemptionCode | constant-time vs StaffCode.code_hash; rate-limited |
| reserveDealClaimAtomic | atomic count vs limit_per_user + total_limit |
| persistRedemption | save Redemption |
| voidRedemption | status=voided; release claim |

**New deps:** stripe, itsdangerous (or PyJWT), optionally django-ratelimit.
**New env names** (values only on server): STRIPE_SECRET_KEY,
STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_CONNECT_*, QR_SIGNING_KEY.

---

## 5. Serializer changes
- EventSerializer: + visibility, commitment(resolved), commit_required_tier,
  capacity, issued_count, currency, access_label, cta (per-request).
- TicketOptionSerializer: + available, required_tier, is_member_exclusive, locked.
- DealSerializer: + subtitle, venue, offers[], valid_from, required_tier,
  total_limit, deal_cta.
- New PassSerializer (Wallet) and RedemptionSerializer.
- Back-compat: all additions are new keys; current app ignores unknown fields.

---

## 6. Phased rollout (each phase: commit -> push -> server rebuild -> migrate -> QA)

- **Phase 0 — Schema.** Migrations + serializer fields + access.py + tests. Zero
  behavior change.
- **Phase 1 — Tiers & free RSVP.** membership_tier, gating (cta/locked),
  GET /me/passes, POST /rsvp minting free passes w/ signed QR. No money.
- **Phase 2 — Scan & check-in.** signQr/verifyQr, /scan, atomic check-in.
- **Phase 3 — Deals.** DealOffer/Redemption/StaffCode + redeem + staff codes.
- **Phase 4 — Paid tickets (Stripe).** /checkout + webhook + refund in test
  mode; Connect onboarding last. Live key only after end-to-end test-card pass.

---

## 7. Deployment notes
- Backend image is **baked** (no source volume) -> every backend change needs a
  rebuild on the server:
  `git pull && docker compose -f docker-compose.prod.yml build backend && up -d backend`
- `entrypoint.prod.sh` **auto-runs migrate** on boot. Keep `SEED=0` normally.
- Each new env var: name in `.env.example` (committed), value in server `.env`.

---

## 8. Frontend "seam" (handoff section 9)
- Replace prototype `reserveTickets()` -> POST /rsvp or /checkout.
- Point Wallet at GET /me/passes; Wallet > Deals from /me/redemptions.
- Add membership_tier to user state; render CTAs from server cta/locked.
- New screens: passcode entry, host scan, deal redeem (staff code).

---

## 9. Open product questions (flag to client — handoff section 10)
- Pass transfer between users — allowed? re-signed on transfer?
- Passcode scope — one shared event code, or one per attendee?
- External saves — store host URL on the calendar entry?
