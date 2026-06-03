from django.contrib import admin

from .models import OwnedTicket


@admin.register(OwnedTicket)
class OwnedTicketAdmin(admin.ModelAdmin):
    list_display = ('user', 'event', 'option', 'status', 'quantity', 'purchased_at')
    list_filter = ('status',)
    search_fields = ('order_id', 'user__email')
