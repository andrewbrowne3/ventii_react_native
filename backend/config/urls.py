"""Root URL config. API contracts mirror src/constants/config.ts in the app."""
from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.accounts.views import LoginView, LogoutView, ProfileView, RegisterView
from apps.events.views import EventViewSet
from apps.inbox.views import InboxThreadViewSet
from apps.profiles.views import ProfileViewSet
from apps.tickets.views import OwnedTicketViewSet
from rest_framework_simplejwt.views import TokenRefreshView

router = DefaultRouter()
router.register(r'events', EventViewSet, basename='event')
router.register(r'profiles', ProfileViewSet, basename='profile')
router.register(r'tickets', OwnedTicketViewSet, basename='ticket')
router.register(r'inbox', InboxThreadViewSet, basename='inbox')

auth_patterns = [
    # Public self-registration is intentionally NOT routed — accounts are
    # created via Django admin only. (RegisterView stays in code, dormant.)
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('profile/', ProfileView.as_view(), name='profile'),
]

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include(auth_patterns)),
    path('api/', include(router.urls)),
]
