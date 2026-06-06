from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class VentiiUserAdmin(UserAdmin):
    """Standard user admin + the VENTII membership tier (set tiers here)."""

    list_display = ('email', 'username', 'membership_tier', 'is_staff')
    list_filter = UserAdmin.list_filter + ('membership_tier',)
    fieldsets = UserAdmin.fieldsets + (
        ('VENTII', {'fields': ('membership_tier', 'city', 'profile_picture')}),
    )
