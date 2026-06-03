from django.contrib import admin

from .models import Deal, Event, TicketOption


class TicketOptionInline(admin.TabularInline):
    model = TicketOption
    extra = 1


class DealInline(admin.TabularInline):
    model = Deal
    extra = 0


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ('title', 'date', 'status', 'venue', 'going_count')
    list_filter = ('status', 'date')
    search_fields = ('title',)
    inlines = [TicketOptionInline, DealInline]
    filter_horizontal = ('hosts',)
