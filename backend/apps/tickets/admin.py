from django.contrib import admin

from .models import OwnedTicket, Redemption


@admin.register(OwnedTicket)
class OwnedTicketAdmin(admin.ModelAdmin):
    list_display = ('user', 'event', 'option', 'kind', 'status', 'price', 'purchased_at')
    list_filter = ('status', 'kind')
    search_fields = ('order_id', 'confirmation_code', 'user__email')


@admin.register(Redemption)
class RedemptionAdmin(admin.ModelAdmin):
    list_display = ('user', 'title', 'venue', 'status', 'redeemed_at')
    list_filter = ('status',)
    search_fields = ('code', 'user__email', 'title')
