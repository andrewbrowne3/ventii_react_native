"""Idempotent demo data — a deck of Atlanta hotspots for the client demo.

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

# ── Atlanta venues (Place profiles) ──────────────────────────────────────
VENUES = [
    ('@park-tavern', 'Park Tavern', 'Rooftop & garden events in Midtown', 'Midtown', 4200),
    ('@the-mansion-atl', 'The Mansion ATL', 'Buckhead’s landmark event estate', 'Buckhead', 9100),
    ('@cherry-o4w', 'Cherry Lounge', 'Intimate cocktail den in Old Fourth Ward', 'Old Fourth Ward', 3300),
    ('@district-atlanta', 'District Atlanta', 'Downtown’s premier dance warehouse', 'Downtown', 15400),
    ('@opera-midtown', 'Opera Nightclub', 'Historic theatre turned nightclub', 'Midtown', 12800),
    ('@aisle-5-l5p', 'Aisle 5', 'Live music room in Little Five Points', 'Little Five Points', 2600),
]

# ── Talent / hosts ───────────────────────────────────────────────────────
HOSTS = [
    ('@dj-kemi', 'DJ Kemi', 'Afrobeats / Amapiano selector', 18900),
    ('@dj-stax', 'DJ Stax', 'ATL hip-hop & trap', 22100),
    ('@kbeats', 'Kelis Beats', 'House & techno', 7400),
]

# ── Events: (title, venue_handle, [host_handles], days_out, start, end,
#             vibe_tags, music_tags, cover, age, going, interested, tickets, deals)
EVENTS = [
    ('Dreams & Nightmares', '@park-tavern', ['@dj-kemi'], 3, '10:00 PM', '3:00 AM',
     ['Rooftop', 'Late Night', 'Dance'], ['Afrobeats', 'Amapiano'], 20, '21+', 312, 980,
     [('GA', 'General admission', 25, 3.5, 200, ['Entry before 1AM']),
      ('VIP', 'VIP table access', 120, 12, 10, ['Reserved table', 'Skip the line'])],
     [('$5 Tequila Shots', 'Until midnight at the main bar')]),

    ('Buckhead Rooftop Sundowner', '@the-mansion-atl', ['@kbeats'], 5, '6:00 PM', '11:00 PM',
     ['Rooftop', 'Sunset', 'Upscale'], ['House', 'Deep House'], 0, '21+', 540, 1620,
     [('GA', 'Sunset session entry', 30, 4, 300, ['Welcome glass of cava'])],
     [('2-for-1 Aperol Spritz', 'Golden hour 6–8PM')]),

    ('Afrobeats in the A', '@opera-midtown', ['@dj-kemi', '@dj-stax'], 6, '11:00 PM', '4:00 AM',
     ['Big Room', 'High Energy'], ['Afrobeats', 'Afro House'], 25, '21+', 880, 2400,
     [('GA', 'General admission', 30, 4, 500, []),
      ('VIP Booth', 'Bottle service booth', 400, 40, 8, ['Bottle', 'Mixers', 'Host'])],
     [('Free entry before 11:30PM', 'On the guest list')]),

    ('Techno Underground', '@district-atlanta', ['@kbeats'], 8, '10:00 PM', '5:00 AM',
     ['Warehouse', 'Dark', 'Marathon'], ['Techno', 'Tech House'], 35, '18+', 1200, 3100,
     [('Advance', 'Advance GA', 35, 4.5, 800, []),
      ('At Door', 'Door price', 45, 5, None, [])],
     []),

    ('O4W Jazz & Cocktails', '@cherry-o4w', [], 4, '8:00 PM', '12:00 AM',
     ['Intimate', 'Live Band', 'Date Night'], ['Jazz', 'Soul'], 15, '21+', 140, 410,
     [('GA', 'Seated entry', 20, 3, 80, ['Welcome cocktail'])],
     [('Half-price small plates', 'Before 9PM')]),

    ('Indie Live: Friday Showcase', '@aisle-5-l5p', ['@dj-stax'], 7, '9:00 PM', '1:00 AM',
     ['Live Music', 'Local', 'Standing'], ['Indie', 'Alternative'], 18, 'All Ages', 220, 600,
     [('GA', 'Standing room', 18, 2.5, 250, [])],
     [('$4 local drafts', 'All night')]),

    ('ATL Sunday Day Party', '@the-mansion-atl', ['@dj-kemi', '@dj-stax'], 9, '2:00 PM', '9:00 PM',
     ['Day Party', 'Brunch', 'Outdoor'], ['Afrobeats', 'Hip-Hop', 'Amapiano'], 25, '21+', 760, 1980,
     [('GA', 'Day party entry', 25, 3.5, 400, ['Patio access']),
      ('Brunch Table', 'Reserved table for 4', 200, 20, 12, ['Bottomless mimosas', 'Reserved seating'])],
     [('Bottomless mimosas til 4PM', 'With any brunch table')]),
]


class Command(BaseCommand):
    help = 'Seed the database with a deck of Atlanta demo events.'

    def handle(self, *args, **options):
        user, created = User.objects.get_or_create(
            email='demo@ventii.app',
            defaults={
                'username': 'demo', 'first_name': 'Demo', 'last_name': 'User',
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

        venues = {}
        for handle, name, tagline, hood, followers in VENUES:
            venues[handle], _ = Profile.objects.get_or_create(
                handle=handle,
                defaults={
                    'type': 'place', 'display_name': name, 'tagline': tagline,
                    'avatar_url': f'https://picsum.photos/seed/{handle.strip("@")}/200',
                    'cover_url': f'https://picsum.photos/seed/{handle.strip("@")}_cover/1200/600',
                    'verified': True, 'follower_count': followers,
                    'city': 'Atlanta', 'neighborhood': hood,
                    'capabilities': {
                        'has_events': True, 'has_tickets': True, 'has_menu': True,
                        'has_book_cta': True, 'has_follow_cta': True,
                    },
                },
            )

        hosts = {}
        for handle, name, tagline, followers in HOSTS:
            hosts[handle], _ = Profile.objects.get_or_create(
                handle=handle,
                defaults={
                    'type': 'talent', 'display_name': name, 'tagline': tagline,
                    'avatar_url': f'https://picsum.photos/seed/{handle.strip("@")}/200',
                    'verified': True, 'follower_count': followers, 'city': 'Atlanta',
                    'capabilities': {
                        'has_events': True, 'has_set_times': True, 'has_follow_cta': True,
                    },
                },
            )

        today = timezone.now().date()
        ga_options = []
        for (title, venue_h, host_hs, days, start, end, vibes, music,
             cover, age, going, interested, tickets, deals) in EVENTS:
            event, ev_created = Event.objects.get_or_create(
                title=title,
                defaults={
                    'flyer_url': f'https://picsum.photos/seed/{title.replace(" ", "_")}/800/1200',
                    'date': today + datetime.timedelta(days=days),
                    'start_time': start, 'end_time': end, 'status': 'upcoming',
                    'description': f'{title} at {venues[venue_h].display_name}.',
                    'vibe_tags': vibes, 'music_tags': music, 'venue': venues[venue_h],
                    'cover_charge': cover, 'age_restriction': age,
                    'going_count': going, 'interested_count': interested,
                },
            )
            if ev_created:
                event.hosts.set([hosts[h] for h in host_hs if h in hosts])
                first_opt = None
                for name, desc, price, fee, remaining, perks in tickets:
                    opt = TicketOption.objects.create(
                        event=event, name=name, description=desc, price=price,
                        fee=fee, remaining=remaining, perks=perks,
                    )
                    first_opt = first_opt or opt
                for d_title, d_desc in deals:
                    Deal.objects.create(event=event, title=d_title, description=d_desc)
                if first_opt:
                    ga_options.append((event, first_opt))

        # Give the demo user a couple of tickets so the Wallet isn't empty.
        for i, (event, opt) in enumerate(ga_options[:2]):
            OwnedTicket.objects.get_or_create(
                user=user, event=event, option=opt,
                defaults={
                    'quantity': 1, 'status': 'active',
                    'qr_payload': f'DEMO-PLACEHOLDER-{i+1}',
                    'order_id': f'ORD-DEMO-{i+1:04d}',
                },
            )

        if not ActivityItem.objects.filter(user=user).exists() and ga_options:
            ev = ga_options[0][0]
            ActivityItem.objects.create(
                user=user, kind='deal_unlocked', event=ev,
                message=f'New deal unlocked at {ev.venue.display_name}.',
            )
            if '@dj-kemi' in hosts:
                ActivityItem.objects.create(
                    user=user, kind='rsvp_friend', actor_profile=hosts['@dj-kemi'], event=ev,
                    message='DJ Kemi is performing at an event you saved.',
                )

        if not InboxThread.objects.filter(user=user).exists() and venues:
            ParkTavern = venues.get('@park-tavern')
            if ParkTavern:
                InboxThread.objects.create(
                    user=user, kind='partner', participant_profile=ParkTavern,
                    last_message='Your table is confirmed for Saturday!',
                    last_message_at=timezone.now(), unread_count=1,
                )

        self.stdout.write(self.style.SUCCESS(
            f'Seed complete: {Event.objects.count()} events, '
            f'{Profile.objects.count()} profiles.'
        ))
