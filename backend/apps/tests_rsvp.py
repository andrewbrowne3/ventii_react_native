"""Phase 1 API tests — tier exposure, the RSVP endpoint, capacity, and QR.

Exercises the function-based endpoints end-to-end with the DRF test client.
"""
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from apps.events.models import Event, TicketOption
from apps.profiles.models import Profile
from apps.security import verify_qr
from apps.tickets.models import OwnedTicket

User = get_user_model()


def make_event(**kwargs):
    venue = Profile.objects.create(type='place', handle=f"@v{Event.objects.count()}",
                                   display_name='Venue')
    defaults = dict(title='T', date='2026-07-01', start_time='9:00 PM', venue=venue)
    defaults.update(kwargs)
    return Event.objects.create(**defaults)


class RsvpTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email='a@b.c', username='a', password='x')

    def test_rsvp_event_mints_valid_pass_with_signed_qr(self):
        ev = make_event(commitment='rsvp', capacity=100)
        self.client.force_authenticate(self.user)
        r = self.client.post(f'/api/events/{ev.id}/rsvp/')
        self.assertEqual(r.status_code, 201)
        body = r.json()
        self.assertEqual(body['kind'], 'rsvp')
        self.assertEqual(body['status'], 'valid')
        self.assertEqual(body['price'], 0)
        self.assertTrue(body['qr_value'])
        # signed token verifies back to this pass
        self.assertEqual(verify_qr(body['qr_value'])['cc'], body['confirmation_code'])
        ev.refresh_from_db()
        self.assertEqual(ev.issued_count, 1)

    def test_rsvp_is_idempotent(self):
        ev = make_event(commitment='rsvp', capacity=100)
        self.client.force_authenticate(self.user)
        first = self.client.post(f'/api/events/{ev.id}/rsvp/')
        second = self.client.post(f'/api/events/{ev.id}/rsvp/')
        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(first.json()['id'], second.json()['id'])
        ev.refresh_from_db()
        self.assertEqual(ev.issued_count, 1)            # not double-counted
        self.assertEqual(OwnedTicket.objects.filter(event=ev).count(), 1)

    def test_capacity_sold_out_blocks_rsvp(self):
        ev = make_event(commitment='rsvp', capacity=1)
        other = User.objects.create_user(email='o@b.c', username='o', password='x')
        self.client.force_authenticate(other)
        self.assertEqual(self.client.post(f'/api/events/{ev.id}/rsvp/').status_code, 201)
        self.client.force_authenticate(self.user)
        r = self.client.post(f'/api/events/{ev.id}/rsvp/')
        self.assertEqual(r.status_code, 409)
        self.assertEqual(r.json()['cta'], 'sold_out')

    def test_ticketed_event_rejects_rsvp(self):
        ev = make_event()
        TicketOption.objects.create(event=ev, name='GA', price=25)
        self.client.force_authenticate(self.user)
        r = self.client.post(f'/api/events/{ev.id}/rsvp/')
        self.assertEqual(r.status_code, 409)
        self.assertEqual(r.json()['cta'], 'checkout')

    def test_gold_gate_blocks_free_allows_gold(self):
        ev = make_event(commitment='rsvp', commit_required_tier='gold')
        self.client.force_authenticate(self.user)        # free
        self.assertEqual(self.client.post(f'/api/events/{ev.id}/rsvp/').json()['cta'], 'locked_member')
        self.user.membership_tier = 'gold'
        self.user.save()
        self.assertEqual(self.client.post(f'/api/events/{ev.id}/rsvp/').status_code, 201)


class SerializerExposureTests(APITestCase):
    def test_event_list_exposes_cta_and_keeps_old_keys(self):
        ev = make_event(commitment='rsvp', capacity=50)
        r = self.client.get('/api/events/')        # public
        item = r.json()['results'][0]
        # new fields present
        for k in ('visibility', 'commitment', 'cta', 'capacity', 'issued_count',
                  'currency', 'access_label', 'commit_required_tier'):
            self.assertIn(k, item)
        self.assertEqual(item['cta'], 'rsvp')       # guest sees an open RSVP
        # original keys still present (zero-break)
        for k in ('id', 'title', 'hosts', 'venue', 'ticket_options', 'deals',
                  'going_count', 'vibe_tags'):
            self.assertIn(k, item)

    def test_profile_exposes_membership_tier(self):
        u = User.objects.create_user(email='m@b.c', username='m', password='x')
        self.client.force_authenticate(u)
        r = self.client.get('/api/auth/profile/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['membership_tier'], 'free')
