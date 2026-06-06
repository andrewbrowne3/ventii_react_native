"""Server-side pass QR signing — the `signQr` / `verifyQr` backend functions
from ventii-ticketing.ts.

A signed QR is a tamper-proof token (NOT a raw pass id) that the door scanner
verifies before anything else. Built on django.core.signing (HMAC-SHA256 over
SECRET_KEY) — no third-party dependency. Set QR_SIGNING_KEY in the server .env
to rotate the QR key independently of Django's SECRET_KEY.

The scan/check-in flow that consumes verify_qr lands in Phase 2.
"""
import os

from django.core import signing

_SALT = "ventii.pass.qr"


def _key():
    # Dedicated key if provided, else fall back to Django's SECRET_KEY.
    return os.environ.get("QR_SIGNING_KEY") or None


def sign_qr(pass_obj) -> str:
    """Return a signed token binding the pass id + confirmation code.

    Never call this client-side; the signing key lives only on the server."""
    payload = {"pid": pass_obj.id, "cc": pass_obj.confirmation_code}
    return signing.dumps(payload, key=_key(), salt=_SALT, compress=True)


def verify_qr(token: str, max_age=None) -> dict:
    """Verify a scanned token's signature and return {pid, cc}.

    Raises signing.BadSignature (or SignatureExpired if max_age is set and
    exceeded) on a tampered/expired token. The caller then loads the pass and
    runs evaluate_scan + the atomic check-in (Phase 2)."""
    return signing.loads(token, key=_key(), salt=_SALT, max_age=max_age)
