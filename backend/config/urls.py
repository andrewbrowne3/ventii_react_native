"""Root URL config. API contracts mirror src/constants/config.ts in the app.

All views are function-based (no DRF router / viewsets)."""
from django.contrib import admin
from django.urls import include, path

from apps.accounts import views as accounts
from apps.events import views as events
from apps.inbox import views as inbox
from apps.profiles import views as profiles
from apps.tickets import views as tickets

auth_patterns = [
    # Self-registration enabled for the mobile onboarding flow (was admin-only).
    path('register/', accounts.register, name='register'),
    path('login/', accounts.login, name='login'),
    path('logout/', accounts.logout, name='logout'),
    path('token/refresh/', accounts.token_refresh, name='token_refresh'),
    path('profile/', accounts.me, name='profile'),
]

api_patterns = [
    path('events/', events.events_list_create, name='events'),
    path('events/<int:pk>/', events.event_detail, name='event-detail'),
    path('events/<int:pk>/rsvp/', events.event_rsvp, name='event-rsvp'),
    path('events/<int:pk>/checkout/', events.event_checkout, name='event-checkout'),

    path('profiles/', profiles.profiles_list, name='profiles'),
    path('profiles/<int:pk>/', profiles.profile_detail, name='profile-detail'),
    path('profiles/<int:pk>/events/', profiles.profile_events, name='profile-events'),

    path('tickets/', tickets.tickets_list, name='tickets'),
    path('tickets/<int:pk>/', tickets.ticket_detail, name='ticket-detail'),
    path('passes/<int:pk>/refund/', tickets.pass_refund, name='pass-refund'),

    path('scan/', tickets.scan, name='scan'),

    path('deals/<int:pk>/redeem/', tickets.deal_redeem, name='deal-redeem'),
    path('redemptions/', tickets.redemptions_list, name='redemptions'),
    path('redemptions/<int:pk>/void/', tickets.redemption_void, name='redemption-void'),

    path('webhooks/stripe/', tickets.stripe_webhook, name='stripe-webhook'),

    path('inbox/', inbox.inbox_list, name='inbox'),
    path('inbox/activity/', inbox.inbox_activity, name='inbox-activity'),
    path('inbox/<int:pk>/', inbox.inbox_detail, name='inbox-detail'),
]

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include(auth_patterns)),
    path('api/', include(api_patterns)),
]
