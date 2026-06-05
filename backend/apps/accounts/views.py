from rest_framework import status
from rest_framework.generics import RetrieveUpdateAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from apps.profiles.serializers import ProfileSerializer

from .serializers import EmailTokenObtainPairSerializer, RegisterSerializer, UserSerializer


class LoginView(TokenObtainPairView):
    """POST {email, password} -> {access, refresh, user}."""

    serializer_class = EmailTokenObtainPairSerializer


class RegisterView(APIView):
    """POST {email, password, display_name, profile_type} -> creates a user +
    a profile of that type, returns tokens (auto-login) + the new profile."""

    permission_classes = [AllowAny]

    def post(self, request):
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


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        token = request.data.get('refresh')
        if token:
            try:
                RefreshToken(token).blacklist()
            except Exception:
                pass
        return Response(status=status.HTTP_205_RESET_CONTENT)


class ProfileView(RetrieveUpdateAPIView):
    """GET / PATCH the currently authenticated user."""

    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user
