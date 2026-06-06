from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import OwnedTicket
from .serializers import OwnedTicketSerializer


def _ticket_qs(user):
    """The authenticated user's own tickets/passes."""
    return (
        OwnedTicket.objects.filter(user=user)
        .select_related('event__venue', 'option')
        .prefetch_related('event__hosts', 'event__ticket_options', 'event__deals')
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def tickets_list(request):
    """GET /api/tickets/ — the user's wallet."""
    paginator = PageNumberPagination()
    page = paginator.paginate_queryset(_ticket_qs(request.user), request)
    data = OwnedTicketSerializer(page, many=True, context={'request': request}).data
    return paginator.get_paginated_response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ticket_detail(request, pk):
    """GET /api/tickets/{id}/ — one of the user's own passes."""
    ticket = get_object_or_404(_ticket_qs(request.user), pk=pk)
    return Response(OwnedTicketSerializer(ticket, context={'request': request}).data)
