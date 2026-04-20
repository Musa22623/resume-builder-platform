from django.contrib.auth import get_user_model
from django.conf import settings
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.serializers import SignUpSerializer, UserSerializer, LoginSerializer, CustomTokenRefreshSerializer

from common.constants.messages import AUTH_MESSAGES
from common.responses import success_response

# from .serializers import SignUpSerializer, UserSerializer


User = get_user_model()


class SignUpView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = SignUpSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.save()

        return success_response(
            message=AUTH_MESSAGES["SIGNUP_SUCCESS"],
            data={
                "user" : UserSerializer(user).data,
            },
            status=status.HTTP_201_CREATED,
        )


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user

        isPlatformAdmin = False

        if user.role == "ADMIN":
            isPlatformAdmin = True
        
        return success_response(
            message=AUTH_MESSAGES["ME_SUCCESS"],
            data={
                "id": user.id,
                "email": user.email,
                "name": getattr(user, "name", ""),
                "email_verified": getattr(user, "email_verified", False),
                "role": getattr(user, "role", "USER"),
                "is_active": user.is_active,
                "is_staff": user.is_staff,
                "is_platform_admin": isPlatformAdmin,
            },
            status=status.HTTP_200_OK,
        )


class PasswordResetPlaceholderView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        return Response({"detail": "Password reset flow placeholder for MVP."})


class LoginView(APIView):
    permission_classes = []

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data["user"]
        refresh = RefreshToken.for_user(user)

        isPlatformAdmin = False

        if user.role == "ADMIN":
            isPlatformAdmin = True

        return success_response(
            message=AUTH_MESSAGES["LOGIN_SUCCESS"],
            data={
                "access_token": str(refresh.access_token),
                "refresh_token": str(refresh),
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "role": user.role,
                    "email_verified": user.email_verified,
                    "created_at": user.created_at,
                    "is_staff": user.is_staff,
                    "is_platform_admin": isPlatformAdmin,
                    "name": getattr(user, "name", ""),
                },
            },
            status=status.HTTP_200_OK,
        )


class RefreshView(APIView):
    permission_classes = []

    def post(self, request):
        serializer = CustomTokenRefreshSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        access_token = serializer.validated_data["access_token"]

        expires_in = int(settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds())

        return success_response(
            message=AUTH_MESSAGES["REFRESH_SUCCESS"],
            data={
                "access_token": access_token,
                "expires_in": expires_in,
            },
            status=status.HTTP_200_OK,
        )
    
# class RefreshView(APIView):
#     permission_classes = []

#     def post(self, request):
#         serializer = CustomTokenRefreshSerializer(data=request.data)
#         serializer.is_valid(raise_exception=True)

#         return Response({
#             "ok": True,
#             "data": serializer.validated_data,
#         })