from rest_framework import serializers

from apps.events.serializers import EventSerializer, TicketOptionSerializer

from .models import OwnedTicket


class OwnedTicketSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    event = EventSerializer(read_only=True)
    option = TicketOptionSerializer(read_only=True)

    class Meta:
        model = OwnedTicket
        fields = (
            'id', 'event', 'option', 'quantity', 'status',
            'purchased_at', 'qr_payload', 'order_id',
        )
