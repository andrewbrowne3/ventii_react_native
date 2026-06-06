"""Phase 4 tests — Stripe checkout, capture, refund (Stripe mocked)."""
from unittest import mock

from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from apps.events.models import Event, TicketOption
from apps.profiles.models import Profile
from apps.tickets.models import OwnedTicket
from apps.tickets.views import _capture_pass

User = get_user_model()


def make_ticketed_event():
    venue = Profile.objects.create(type='place', handle=f'@v{Event.objects.count()}',
                                   display_name='V')
    ev = Event.objects.create(title='Show', date='2026-07-01', start_time='9 PM',
                              venue=venue, capacity=100)
    TicketOption.objects.create(event=ev, name='GA', price=25)
    return ev


class CheckoutTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email='u@b.c', username='u', password='x')
        self.event = make_ticketed_event()
        self.option = self.event.ticket_options.first()
        self.client.force_authenticate(self.user)

    def test_checkout_503_when_stripe_unconfigured(self):
        r = self.client.post(f'/api/events/{self.event.id}/checkout/',
                             {'option_id': self.option.id}, format='json')
        self.assertEqual(r.status_code, 503)

    @mock.patch('apps.payments.create_intent',
                return_value={'id': 'pi_123', 'client_secret': 'cs_123'})
    @mock.patch('apps.payments.is_configured', return_value=True)
    def test_checkout_reserves_and_returns_client_secret(self, _cfg, _intent):
        r = self.client.post(f'/api/events/{self.event.id}/checkout/',
                             {'option_id': self.option.id, 'quantity': 2}, format='json')
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()['client_secret'], 'cs_123')
        p = OwnedTicket.objects.get(id=r.json()['pass']['id'])
        self.assertEqual(p.status, 'issued')          # not valid until webhook
        self.assertEqual(p.stripe_payment_intent, 'pi_123')
        self.assertEqual(p.qr_value, '')              # unsigned until captured
        self.event.refresh_from_db()
        self.assertEqual(self.event.issued_count, 2)  # capacity reserved


class CaptureAndRefundTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email='u@b.c', username='u', password='x')
        self.event = make_ticketed_event()
        self.option = self.event.ticket_options.first()

    def _issued_pass(self):
        self.event.issued_count = 1
        self.event.save(update_fields=['issued_count'])
        return OwnedTicket.objects.create(
            user=self.user, event=self.event, option=self.option, quantity=1,
            kind='ticket', price=25, status='issued', holder_name='U',
            confirmation_code='VEN-PAID01', stripe_payment_intent='pi_123')

    def test_capture_flips_issued_to_valid_and_signs(self):
        p = self._issued_pass()
        _capture_pass(p)
        p.refresh_from_db()
        self.assertEqual(p.status, 'valid')
        self.assertTrue(p.qr_value)

    @mock.patch('apps.payments.verify_webhook')
    @mock.patch('apps.payments.is_configured', return_value=True)
    def test_webhook_captures_pass(self, _cfg, verify):
        p = self._issued_pass()
        verify.return_value = {
            'type': 'payment_intent.succeeded',
            'data': {'object': {'metadata': {'pass_id': str(p.id)}}},
        }
        r = self.client.post('/api/webhooks/stripe/', data=b'{}',
                             content_type='application/json', HTTP_STRIPE_SIGNATURE='sig')
        self.assertEqual(r.status_code, 200)
        p.refresh_from_db()
        self.assertEqual(p.status, 'valid')

    @mock.patch('apps.payments.is_configured', return_value=True)
    def test_webhook_bad_signature_400(self, _cfg):
        with mock.patch('apps.payments.verify_webhook', side_effect=ValueError('bad')):
            r = self.client.post('/api/webhooks/stripe/', data=b'{}',
                                 content_type='application/json',
                                 HTTP_STRIPE_SIGNATURE='sig')
        self.assertEqual(r.status_code, 400)

    @mock.patch('apps.payments.refund_intent', return_value={'id': 're_1'})
    @mock.patch('apps.payments.is_configured', return_value=True)
    def test_refund_releases_capacity(self, _cfg, _refund):
        p = self._issued_pass()
        _capture_pass(p)                              # now valid, capacity=1
        self.client.force_authenticate(self.user)
        r = self.client.post(f'/api/passes/{p.id}/refund/')
        self.assertEqual(r.status_code, 200)
        p.refresh_from_db()
        self.event.refresh_from_db()
        self.assertEqual(p.status, 'refunded')
        self.assertEqual(self.event.issued_count, 0)  # released
