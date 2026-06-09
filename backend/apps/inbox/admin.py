from django.contrib import admin

from .models import ActivityItem, InboxThread


@admin.register(ActivityItem)
class ActivityItemAdmin(admin.ModelAdmin):
    list_display = ('user', 'kind', 'message', 'read', 'created_at')
    list_filter = ('kind', 'read')


@admin.register(InboxThread)
class InboxThreadAdmin(admin.ModelAdmin):
    list_display = ('user', 'kind', 'last_message', 'unread_count', 'last_message_at')
    list_filter = ('kind',)
