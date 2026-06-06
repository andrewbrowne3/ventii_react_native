from rest_framework import serializers

from apps.events.serializers import EventSerializer, TicketOptionSerializer

from .models import OwnedTicket


class OwnedTicketSerializer(serializers.ModelSerializer):
    """A wallet Pass (ventii-ticketing.ts:Pass)."""

    id = serializers.CharField(read_only=True)
    event = EventSerializer(read_only=True)
    option = TicketOptionSerializer(read_only=True)
    price = serializers.FloatField()

    class Meta:
        model = OwnedTicket
        fields = (
            'id', 'event', 'option', 'quantity', 'status',
            'purchased_at', 'qr_payload', 'order_id',
            'kind', 'price', 'currency', 'confirmation_code',
            'holder_name', 'qr_value', 'entry_instructions',
        )
