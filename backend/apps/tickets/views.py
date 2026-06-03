from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import OwnedTicket
from .serializers import OwnedTicketSerializer


class OwnedTicketViewSet(viewsets.ReadOnlyModelViewSet):
    """The authenticated user's own tickets."""

    serializer_class = OwnedTicketSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            OwnedTicket.objects.filter(user=self.request.user)
            .select_related('event__venue', 'option')
            .prefetch_related('event__hosts', 'event__ticket_options', 'event__deals')
        )
