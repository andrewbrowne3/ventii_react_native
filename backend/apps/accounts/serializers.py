import re

from django.db import transaction
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from apps.profiles.models import Profile

from .models import User


class UserSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = (
            'id', 'email', 'username', 'first_name', 'last_name',
            'full_name', 'profile_picture', 'city', 'membership_tier', 'created_at',
        )
        read_only_fields = ('membership_tier',)  # set via admin, never self-assigned


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Adds the serialized user to the login response alongside the tokens."""

    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = UserSerializer(self.user).data
        return data


# Default capabilities per profile type — drives which tabs/CTAs a profile gets
# (a DJ gets events + set times + booking; a place gets tickets + menu; etc.).
def capabilities_for(ptype: str) -> dict:
    caps = {'has_follow_cta': True}
    if ptype in ('place', 'talent', 'community', 'brand'):
        caps['has_events'] = True
    if ptype == 'place':
        caps.update(has_tickets=True, has_menu=True, has_book_cta=True)
    elif ptype == 'talent':       # DJ / performer
        caps.update(has_set_times=True, has_book_cta=True, has_tickets=True)
    elif ptype == 'community':
        caps.update(has_members=True, has_tickets=True)
    elif ptype == 'brand':
        caps.update(has_products=True)
    return caps


class RegisterSerializer(serializers.Serializer):
    """Sign up as a creator: makes a User + a Profile of the chosen type."""

    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    display_name = serializers.CharField(max_length=160)
    profile_type = serializers.ChoiceField(choices=Profile.TYPE_CHOICES, default='talent')
    city = serializers.CharField(required=False, allow_blank=True, default='Atlanta')
    avatar_url = serializers.URLField(required=False, allow_blank=True, default='')

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('An account with this email already exists.')
        return value

    def _unique_handle(self, name: str) -> str:
        slug = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-') or 'profile'
        base = f'@{slug}'
        handle, i = base, 2
        while Profile.objects.filter(handle=handle).exists():
            handle, i = f'{base}-{i}', i + 1
        return handle

    def _unique_username(self, email: str) -> str:
        base = re.sub(r'[^a-z0-9_]+', '', email.split('@')[0].lower()) or 'user'
        username, i = base, 2
        while User.objects.filter(username=username).exists():
            username, i = f'{base}{i}', i + 1
        return username

    @transaction.atomic
    def create(self, validated):
        city = validated.get('city') or 'Atlanta'
        user = User.objects.create_user(
            email=validated['email'],
            username=self._unique_username(validated['email']),
            password=validated['password'],
            city=city,
            profile_picture=validated.get('avatar_url') or '',
        )
        ptype = validated['profile_type']
        self.profile = Profile.objects.create(
            owner=user,
            type=ptype,
            display_name=validated['display_name'],
            handle=self._unique_handle(validated['display_name']),
            avatar_url=validated.get('avatar_url') or '',
            city=city,
            capabilities=capabilities_for(ptype),
        )
        return user
