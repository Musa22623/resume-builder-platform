from django.contrib.auth import get_user_model
from django.conf import settings
from rest_framework import permissions, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.serializers import SignUpSerializer, UserSerializer, LoginSerializer, CustomTokenRefreshSerializer, ForgotPasswordSerializer, ResetPasswordSerializer

from common.constants.messages import AUTH_MESSAGES
from common.constants.errors import AUTH_ERRORS
from common.responses import success_response, error_response
from accounts.services import send_password_reset_email

import smtplib
from email.message import EmailMessage

import logging

logger = logging.getLogger(__name__)


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
    
class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]

        user = User.objects.filter(email=email, is_active=True).first()

        if user:
            send_password_reset_email(user)
        return success_response(
            message=AUTH_MESSAGES["PASSWORD_RESET_LINK_SENT"],
            status=status.HTTP_200_OK,
        )


class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data["user"]
        new_password = serializer.validated_data["new_password"]

        user.set_password(new_password)
        user.save(update_fields=["password"])

        return success_response(
            message=AUTH_MESSAGES["PASSWORD_RESET_SUCCESS"],
            status=status.HTTP_200_OK,
        )
    
class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            # Get JWT Token (Through Authorization from Header)
            refresh_token = request.data.get('refresh_token')

            if not refresh_token:
                return error_response(
                    error={
                        "code": "Required Refresh Token.",
                        "message": "Refresh token is required.",
                    }, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            logger.info("Logout:" + str(refresh_token))
            # Validate Refresh Token and Add to BlackList
            token = RefreshToken(refresh_token)
            token.blacklist()

            logger.info("Logout_token:")


            return success_response(
                message=AUTH_MESSAGES["LOGOUT_SUCCESS"],
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            return error_response(
                error={
                    "code": "INTERNAL_SERVER_ERROR",
                    "message": f"Error logging out: {str(e)}",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )