from rest_framework import serializers

from apps.profiles.serializers import ProfileSerializer

from .models import Deal, Event, TicketOption


class TicketOptionSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    price = serializers.FloatField()
    fee = serializers.FloatField()

    class Meta:
        model = TicketOption
        fields = ('id', 'name', 'description', 'price', 'fee', 'remaining', 'perks')


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

    class Meta:
        model = Event
        fields = (
            'id', 'title', 'flyer_url', 'date', 'start_time', 'end_time',
            'status', 'description', 'vibe_tags', 'music_tags', 'hosts',
            'venue', 'ticket_options', 'deals', 'cover_charge',
            'age_restriction', 'going_count', 'interested_count',
        )
