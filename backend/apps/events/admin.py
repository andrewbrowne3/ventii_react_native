from django.contrib import admin

from .models import Deal, DealOffer, Event, StaffCode, TicketOption


class TicketOptionInline(admin.TabularInline):
    model = TicketOption
    extra = 1


class DealInline(admin.TabularInline):
    model = Deal
    extra = 0


class DealOfferInline(admin.TabularInline):
    model = DealOffer
    extra = 1


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ('title', 'date', 'status', 'venue', 'visibility', 'capacity', 'issued_count')
    list_filter = ('status', 'date', 'visibility')
    search_fields = ('title',)
    inlines = [TicketOptionInline, DealInline]
    filter_horizontal = ('hosts',)


@admin.register(Deal)
class DealAdmin(admin.ModelAdmin):
    list_display = ('title', 'event', 'venue', 'required_tier', 'valid_until')
    inlines = [DealOfferInline]


@admin.register(StaffCode)
class StaffCodeAdmin(admin.ModelAdmin):
    list_display = ('venue', 'active', 'rotates_at', 'created_at')
    list_filter = ('active',)
