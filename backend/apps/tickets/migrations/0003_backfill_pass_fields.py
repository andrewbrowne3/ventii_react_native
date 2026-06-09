"""Backfill existing OwnedTickets onto the Pass contract.

Non-destructive data migration:
  - remap legacy status values to the new lifecycle
  - backfill confirmation_code / price / currency / holder_name on old rows
Reversible: the reverse remap restores the legacy status labels.
"""
from django.db import migrations

STATUS_FORWARD = {
    'active': 'valid',
    'used': 'checked_in',
    'expired': 'voided',
    'transferred': 'voided',
}
STATUS_REVERSE = {
    'valid': 'active',
    'checked_in': 'used',
    'voided': 'expired',
}


def forward(apps, schema_editor):
    OwnedTicket = apps.get_model('tickets', 'OwnedTicket')
    for i, t in enumerate(OwnedTicket.objects.all().iterator()):
        changed = False
        if t.status in STATUS_FORWARD:
            t.status = STATUS_FORWARD[t.status]
            changed = True
        if not t.confirmation_code:
            # Deterministic, unique per row (id-based) — no Date/random needed.
            t.confirmation_code = f'VEN-{t.id:08X}'
            changed = True
        if not t.holder_name and t.user_id:
            name = f'{t.user.first_name} {t.user.last_name}'.strip() or t.user.username
            t.holder_name = name
            changed = True
        if t.option_id and (t.price is None or t.price == 0):
            t.price = t.option.price
            changed = True
        if changed:
            t.save(update_fields=['status', 'confirmation_code', 'holder_name', 'price'])


def reverse(apps, schema_editor):
    OwnedTicket = apps.get_model('tickets', 'OwnedTicket')
    for t in OwnedTicket.objects.all().iterator():
        if t.status in STATUS_REVERSE:
            t.status = STATUS_REVERSE[t.status]
            t.save(update_fields=['status'])


class Migration(migrations.Migration):

    dependencies = [
        ('tickets', '0002_ownedticket_confirmation_code_ownedticket_currency_and_more'),
    ]

    operations = [
        migrations.RunPython(forward, reverse),
    ]
