"""Stripe payment integration — the payment `// BACKEND` functions from
ventii-ticketing.ts.

Secrets are read from the environment by NAME (never hardcoded):
  STRIPE_SECRET_KEY      — server API key (sk_test_… in test mode)
  STRIPE_WEBHOOK_SECRET  — signing secret for the webhook endpoint
The publishable key (pk_…) is for the client and lives in the app config.

When STRIPE_SECRET_KEY is unset the checkout endpoint returns a "coming soon"
503 — honest per the brief (no fake payments). `stripe` is imported lazily so
the project runs without the package until paid ticketing is turned on.
"""
import os


def is_configured() -> bool:
    return bool(os.environ.get('STRIPE_SECRET_KEY'))


def _stripe():
    import stripe  # lazy — only needed when payments are configured
    stripe.api_key = os.environ['STRIPE_SECRET_KEY']
    return stripe


def create_intent(amount_cents: int, currency: str, metadata: dict,
                  destination: str | None = None):
    """Create a PaymentIntent. The SERVER sets the amount; the client never
    supplies it. If the venue has a connected account, route funds there
    (Stripe Connect) — otherwise a plain charge."""
    stripe = _stripe()
    kwargs = dict(
        amount=amount_cents,
        currency=currency.lower(),
        metadata=metadata,
        automatic_payment_methods={'enabled': True},
    )
    if destination:
        kwargs['transfer_data'] = {'destination': destination}
    return stripe.PaymentIntent.create(**kwargs)


def refund_intent(payment_intent_id: str):
    return _stripe().Refund.create(payment_intent=payment_intent_id)


def verify_webhook(payload: bytes, sig_header: str):
    """Verify the Stripe-Signature header; raises on tamper/replay."""
    stripe = _stripe()
    secret = os.environ['STRIPE_WEBHOOK_SECRET']
    return stripe.Webhook.construct_event(payload, sig_header, secret)
