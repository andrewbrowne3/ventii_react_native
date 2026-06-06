"""Phase 3 tests — deal redemption with venue staff codes."""
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from apps.events.models import Deal, DealOffer, Event
from apps.profiles.models import Profile
from apps.security import hash_code
from apps.tickets.models import Redemption

User = get_user_model()


class DealRedeemTests(APITestCase):
    def setUp(self):
        self.host = User.objects.create_user(email='h@b.c', username='h', password='x')
        self.venue = Profile.objects.create(
            type='place', handle='@v', display_name='New Realm', owner=self.host)
        self.venue.staff_codes.create(code_hash=hash_code('GO123'), active=True)
        self.event = Event.objects.create(
            title='Night', date='2026-07-01', start_time='9 PM', venue=self.venue)
        self.deal = Deal.objects.create(event=self.event, title='Deal', venue='New Realm')
        self.offer = DealOffer.objects.create(deal=self.deal, title='$5 off', limit_per_user=1)
        self.pro_offer = DealOffer.objects.create(
            deal=self.deal, title='Free entry', limit_per_user=1, required_tier='pro')
        self.user = User.objects.create_user(email='u@b.c', username='u', password='x')
        self.client.force_authenticate(self.user)

    def _redeem(self, offer, code='GO123'):
        return self.client.post(
            f'/api/deals/{self.deal.id}/redeem/',
            {'offer_id': offer.id, 'staff_code': code}, format='json')

    def test_valid_redeem_mints_voucher(self):
        r = self._redeem(self.offer)
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()['status'], 'redeemed')
        self.assertEqual(Redemption.objects.filter(user=self.user).count(), 1)
        # shows in Wallet > Deals
        w = self.client.get('/api/redemptions/')
        self.assertEqual(w.json()['count'], 1)

    def test_wrong_staff_code_rejected(self):
        r = self._redeem(self.offer, code='NOPE')
        self.assertEqual(r.status_code, 400)
        self.assertEqual(Redemption.objects.count(), 0)

    def test_per_user_limit(self):
        self.assertEqual(self._redeem(self.offer).status_code, 201)
        again = self._redeem(self.offer)
        self.assertEqual(again.status_code, 409)
        self.assertEqual(again.json()['cta'], 'already_redeemed')

    def test_tier_gated_offer_blocks_free_user(self):
        r = self._redeem(self.pro_offer)            # valid code, but free user
        self.assertEqual(r.status_code, 409)
        self.assertEqual(r.json()['cta'], 'locked_member')

    def test_void_allows_redeem_again(self):
        first = self._redeem(self.offer)
        rid = first.json()['id']
        self.client.post(f'/api/redemptions/{rid}/void/')
        self.assertEqual(Redemption.objects.get(pk=rid).status, 'voided')
        # voided no longer counts against the per-user limit
        self.assertEqual(self._redeem(self.offer).status_code, 201)
