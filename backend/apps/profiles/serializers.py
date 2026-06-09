from rest_framework import serializers

from .models import Profile

DEFAULT_CAPABILITIES = {
    'has_events': False,
    'has_tickets': False,
    'has_menu': False,
    'has_set_times': False,
    'has_members': False,
    'has_products': False,
    'has_book_cta': False,
    'has_follow_cta': True,
}


class ProfileSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    capabilities = serializers.SerializerMethodField()
    location = serializers.SerializerMethodField()
    social = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = (
            'id', 'type', 'handle', 'display_name', 'tagline', 'bio',
            'avatar_url', 'cover_url', 'verified', 'follower_count',
            'capabilities', 'location', 'social',
        )

    def get_capabilities(self, obj):
        return {**DEFAULT_CAPABILITIES, **(obj.capabilities or {})}

    def get_location(self, obj):
        if not (obj.city or obj.neighborhood):
            return None
        return {'city': obj.city, 'neighborhood': obj.neighborhood or None}

    def get_social(self, obj):
        if not (obj.instagram or obj.website):
            return None
        return {'instagram': obj.instagram or None, 'website': obj.website or None}
