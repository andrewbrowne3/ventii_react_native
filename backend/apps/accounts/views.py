from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from apps.profiles.serializers import ProfileSerializer

from .serializers import EmailTokenObtainPairSerializer, RegisterSerializer, UserSerializer


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    """POST {email, password} -> {access, refresh, user}."""
    serializer = EmailTokenObtainPairSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    return Response(serializer.validated_data)


@api_view(['POST'])
@permission_classes([AllowAny])
def token_refresh(request):
    """POST {refresh} -> {access}. (FBV replacement for SimpleJWT's view.)"""
    serializer = TokenRefreshSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    return Response(serializer.validated_data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    """POST {refresh} -> blacklist the refresh token."""
    token = request.data.get('refresh')
    if token:
        try:
            RefreshToken(token).blacklist()
        except Exception:
            pass
    return Response(status=status.HTTP_205_RESET_CONTENT)


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def me(request):
    """GET / PATCH the currently authenticated user."""
    if request.method == 'PATCH':
        serializer = UserSerializer(
            request.user, data=request.data, partial=True, context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
    return Response(UserSerializer(request.user, context={'request': request}).data)


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    """DORMANT — not routed. Self-registration is intentionally disabled;
    accounts are created via Django admin. Kept for when it's re-enabled.
    POST {email, password, display_name, profile_type} -> tokens + profile."""
    serializer = RegisterSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.save()
    refresh = RefreshToken.for_user(user)
    return Response(
        {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
            'profile': ProfileSerializer(serializer.profile).data,
        },
        status=status.HTTP_201_CREATED,
    )
