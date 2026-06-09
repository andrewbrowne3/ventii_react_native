from rest_framework import serializers

from apps.accounts.serializers import UserSerializer
from apps.events.serializers import EventSerializer
from apps.profiles.serializers import ProfileSerializer

from .models import ActivityItem, InboxThread


class ActivityItemSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    actor = serializers.SerializerMethodField()
    event = EventSerializer(read_only=True)

    class Meta:
        model = ActivityItem
        fields = ('id', 'kind', 'actor', 'event', 'message', 'created_at', 'read')

    def get_actor(self, obj):
        if obj.actor_profile_id:
            return ProfileSerializer(obj.actor_profile).data
        if obj.actor_user_id:
            return UserSerializer(obj.actor_user).data
        return None


class InboxThreadSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    participant = serializers.SerializerMethodField()

    class Meta:
        model = InboxThread
        fields = (
            'id', 'kind', 'participant', 'last_message',
            'last_message_at', 'unread_count',
        )

    def get_participant(self, obj):
        if obj.participant_profile_id:
            return ProfileSerializer(obj.participant_profile).data
        if obj.participant_user_id:
            return UserSerializer(obj.participant_user).data
        return None
