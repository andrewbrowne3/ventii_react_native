"""Phase 2 tests — door scan + atomic single-use check-in."""
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from apps import access
from apps.events.models import Event
from apps.profiles.models import Profile
from apps.security import sign_qr
from apps.tickets.models import OwnedTicket

User = get_user_model()


class EvaluateScanUnitTests(APITestCase):
    def test_reasons(self):
        self.assertEqual(access.evaluate_scan('valid', True), {'ok': True, 'reason': 'valid'})
        self.assertEqual(access.evaluate_scan('valid', False)['reason'], 'no_qr')
        self.assertEqual(access.evaluate_scan('issued', True)['reason'], 'not_yet_issued')
        self.assertEqual(access.evaluate_scan('checked_in', True)['reason'], 'already_checked_in')
        self.assertEqual(access.evaluate_scan('refunded', True)['reason'], 'refunded')
        self.assertEqual(access.evaluate_scan('voided', True)['reason'], 'voided')


class ScanEndpointTests(APITestCase):
    def setUp(self):
        # Host owns the venue profile; the event is at that venue.
        self.host = User.objects.create_user(email='host@b.c', username='host', password='x')
        self.venue = Profile.objects.create(
            type='place', handle='@venue', display_name='Venue', owner=self.host,
        )
        self.event = Event.objects.create(
            title='Show', date='2026-07-01', start_time='9:00 PM', venue=self.venue,
        )
        self.attendee = User.objects.create_user(email='att@b.c', username='att', password='x')

    def _mint(self, status='valid'):
        p = OwnedTicket.objects.create(
            user=self.attendee, event=self.event, kind='rsvp', price=0,
            status=status, holder_name='Attendee', confirmation_code='VEN-TEST01',
        )
        p.qr_value = sign_qr(p)
        p.save(update_fields=['qr_value'])
        return p

    def test_valid_scan_checks_in(self):
        p = self._mint()
        self.client.force_authenticate(self.host)
        r = self.client.post('/api/scan/', {'qr_value': p.qr_value}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.json()['ok'])
        self.assertEqual(r.json()['reason'], 'valid')
        p.refresh_from_db()
        self.assertEqual(p.status, 'checked_in')

    def test_double_scan_reports_already_checked_in(self):
        p = self._mint()
        self.client.force_authenticate(self.host)
        first = self.client.post('/api/scan/', {'qr_value': p.qr_value}, format='json')
        second = self.client.post('/api/scan/', {'qr_value': p.qr_value}, format='json')
        self.assertTrue(first.json()['ok'])
        self.assertFalse(second.json()['ok'])
        self.assertEqual(second.json()['reason'], 'already_checked_in')

    def test_tampered_token_rejected(self):
        p = self._mint()
        self.client.force_authenticate(self.host)
        r = self.client.post('/api/scan/', {'qr_value': p.qr_value + 'x'}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.json()['reason'], 'invalid_signature')

    def test_non_host_forbidden(self):
        p = self._mint()
        stranger = User.objects.create_user(email='s@b.c', username='s', password='x')
        self.client.force_authenticate(stranger)
        r = self.client.post('/api/scan/', {'qr_value': p.qr_value}, format='json')
        self.assertEqual(r.status_code, 403)
        p.refresh_from_db()
        self.assertEqual(p.status, 'valid')          # not checked in

    def test_refunded_pass_not_admitted(self):
        p = self._mint(status='refunded')
        self.client.force_authenticate(self.host)
        r = self.client.post('/api/scan/', {'qr_value': p.qr_value}, format='json')
        self.assertFalse(r.json()['ok'])
        self.assertEqual(r.json()['reason'], 'refunded')

    def test_missing_token(self):
        self.client.force_authenticate(self.host)
        r = self.client.post('/api/scan/', {}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.json()['reason'], 'no_qr')
