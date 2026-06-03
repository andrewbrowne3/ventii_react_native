"""Idempotent demo data so the mobile app shows content out of the box.

Login with:  demo@ventii.app  /  demo12345
Run with:    python manage.py seed
"""
import datetime

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.events.models import Deal, Event, TicketOption
from apps.inbox.models import ActivityItem, InboxThread
from apps.profiles.models import Profile
from apps.tickets.models import OwnedTicket

User = get_user_model()


class Command(BaseCommand):
    help = 'Seed the database with demo profiles, events, tickets and inbox data.'

    def handle(self, *args, **options):
        user, created = User.objects.get_or_create(
            email='demo@ventii.app',
            defaults={
                'username': 'demo',
                'first_name': 'Demo',
                'last_name': 'User',
                'city': 'Atlanta',
                'profile_picture': 'https://picsum.photos/seed/demo_user/200',
            },
        )
        if created:
            user.set_password('demo12345')
            user.save()
            self.stdout.write('Created demo user demo@ventii.app / demo12345')

        if not User.objects.filter(is_superuser=True).exists():
            User.objects.create_superuser(
                email='admin@ventii.app', username='admin', password='admin12345',
            )
            self.stdout.write('Created superuser admin@ventii.app / admin12345')

        venue, _ = Profile.objects.get_or_create(
            handle='@park-tavern',
            defaults={
                'type': 'place',
                'display_name': 'Park Tavern',
                'tagline': 'Rooftop & garden events in Midtown',
                'avatar_url': 'https://picsum.photos/seed/park_tavern/200',
                'cover_url': 'https://picsum.photos/seed/park_tavern_cover/1200/600',
                'verified': True,
                'follower_count': 4200,
                'city': 'Atlanta',
                'neighborhood': 'Midtown',
                'capabilities': {
                    'has_events': True, 'has_tickets': True, 'has_menu': True,
                    'has_book_cta': True, 'has_follow_cta': True,
                },
            },
        )
        host, _ = Profile.objects.get_or_create(
            handle='@dj-kemi',
            defaults={
                'type': 'talent',
                'display_name': 'DJ Kemi',
                'tagline': 'Afrobeats / Amapiano selector',
                'avatar_url': 'https://picsum.photos/seed/dj_kemi/200',
                'verified': True,
                'follower_count': 18900,
                'city': 'Atlanta',
                'capabilities': {
                    'has_events': True, 'has_set_times': True, 'has_follow_cta': True,
                },
            },
        )

        today = timezone.now().date()
        event, ev_created = Event.objects.get_or_create(
            title='Dreams & Nightmares',
            defaults={
                'flyer_url': 'https://picsum.photos/seed/dreams_nightmares/800/1200',
                'date': today + datetime.timedelta(days=7),
                'start_time': '10:00 PM',
                'end_time': '3:00 AM',
                'status': 'upcoming',
                'description': 'A late-night rooftop session with Afrobeats & Amapiano.',
                'vibe_tags': ['Rooftop', 'Late Night', 'Dance'],
                'music_tags': ['Afrobeats', 'Amapiano'],
                'venue': venue,
                'cover_charge': 20,
                'age_restriction': '21+',
                'going_count': 312,
                'interested_count': 980,
            },
        )
        if ev_created:
            event.hosts.add(host)
            ga = TicketOption.objects.create(
                event=event, name='GA', description='General admission',
                price=25, fee=3.5, remaining=200, perks=['Entry before 1AM'],
            )
            TicketOption.objects.create(
                event=event, name='VIP', description='VIP table access',
                price=120, fee=12, remaining=10,
                perks=['Reserved table', 'Skip the line', 'Welcome shot'],
            )
            Deal.objects.create(
                event=event, title='$5 Tequila Shots',
                description='Until midnight at the main bar',
            )
            OwnedTicket.objects.get_or_create(
                user=user, event=event, option=ga,
                defaults={
                    'quantity': 1, 'status': 'active',
                    'qr_payload': 'DEMO-PLACEHOLDER-NOT-SCANNABLE',
                    'order_id': 'ORD-DEMO-0001',
                },
            )

        if not ActivityItem.objects.filter(user=user).exists():
            ActivityItem.objects.create(
                user=user, kind='rsvp_friend', actor_profile=host, event=event,
                message='DJ Kemi is performing at an event you saved.',
            )
            ActivityItem.objects.create(
                user=user, kind='deal_unlocked', event=event,
                message='New deal unlocked: $5 Tequila Shots.',
            )

        if not InboxThread.objects.filter(user=user).exists():
            InboxThread.objects.create(
                user=user, kind='partner', participant_profile=venue,
                last_message='Your table is confirmed for Saturday!',
                last_message_at=timezone.now(), unread_count=1,
            )

        self.stdout.write(self.style.SUCCESS('Seed complete.'))
