from rest_framework import serializers

from apps import access
from apps.profiles.models import Profile
from apps.profiles.serializers import ProfileSerializer

from .models import Deal, Event, TicketOption


def _viewer_tier(context):
    """The requesting user's membership tier, or 'guest' if unauthenticated."""
    request = context.get('request') if context else None
    user = getattr(request, 'user', None)
    if user is not None and user.is_authenticated:
        return getattr(user, 'membership_tier', access.FREE)
    return access.GUEST


class TicketOptionSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    price = serializers.FloatField()
    fee = serializers.FloatField()
    required_tier = serializers.SerializerMethodField()
    locked = serializers.SerializerMethodField()

    class Meta:
        model = TicketOption
        fields = (
            'id', 'name', 'description', 'price', 'fee', 'remaining', 'perks',
            'available', 'required_tier', 'is_member_exclusive', 'locked',
        )

    def get_required_tier(self, obj):
        return obj.required_tier or None

    def get_locked(self, obj):
        opt = {'available': obj.available, 'requiredTier': obj.required_tier or None}
        return not access.is_option_available_to(opt, _viewer_tier(self.context))


class DealSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)

    class Meta:
        model = Deal
        fields = ('id', 'title', 'description', 'valid_until', 'redeemed')


class EventSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    hosts = ProfileSerializer(many=True, read_only=True)
    venue = ProfileSerializer(read_only=True)
    ticket_options = TicketOptionSerializer(many=True, read_only=True)
    deals = DealSerializer(many=True, read_only=True)
    cover_charge = serializers.FloatField(allow_null=True)

    # ── Two-axis access (resolved per viewer). Additive — existing keys above
    #    are unchanged, so the app is unaffected. ──
    commitment = serializers.SerializerMethodField()
    commit_required_tier = serializers.SerializerMethodField()
    access_label = serializers.SerializerMethodField()
    cta = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = (
            'id', 'title', 'flyer_url', 'date', 'start_time', 'end_time',
            'status', 'description', 'vibe_tags', 'music_tags', 'hosts',
            'venue', 'ticket_options', 'deals', 'cover_charge',
            'age_restriction', 'going_count', 'interested_count',
            'visibility', 'commitment', 'commit_required_tier', 'capacity',
            'issued_count', 'currency', 'access_label', 'cta',
        )

    def _ticketing(self, obj):
        return access.ticketing_from_event(obj)

    def get_commitment(self, obj):
        return access.get_commitment(self._ticketing(obj))

    def get_commit_required_tier(self, obj):
        return obj.commit_required_tier or None

    def get_access_label(self, obj):
        t = self._ticketing(obj)
        return access.access_label(access.get_visibility(t), access.get_commitment(t))

    def get_cta(self, obj):
        return access.resolve_commit_cta(
            self._ticketing(obj), _viewer_tier(self.context), obj.issued_count,
        )


class EventCreateSerializer(serializers.ModelSerializer):
    """Write serializer for posting an event from the app. The creator's
    profile is added as a host in the view; venue is an existing profile."""

    venue = serializers.PrimaryKeyRelatedField(queryset=Profile.objects.all())
    cover_charge = serializers.FloatField(required=False, allow_null=True)

    class Meta:
        model = Event
        fields = (
            'id', 'title', 'flyer_url', 'date', 'start_time', 'end_time',
            'description', 'vibe_tags', 'music_tags', 'venue',
            'cover_charge', 'age_restriction',
        )
        read_only_fields = ('id',)
