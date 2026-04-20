from django.contrib.auth import get_user_model, authenticate
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenRefreshSerializer

from accounts.models import UserProfile
from billing.models import TrialStatus
from django.db import transaction

from common.constants.errors import AUTH_ERRORS
from common.responses import success_response, error_response

User = get_user_model()


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = (
            "full_name",
            "phone",
            "country",
            "timezone",
            "avatar_file_path",
        )


class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "role",
            "email_verified",
            "is_active",
            "created_at",
            "profile",
        )


class SignUpSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    full_name = serializers.CharField(required=False, allow_blank=True, max_length=255)
    phone = serializers.CharField(required=False, allow_blank=True, max_length=50)
    country = serializers.CharField(required=False, allow_blank=True, max_length=100)
    timezone = serializers.CharField(required=False, allow_blank=True, max_length=100)

    def validate_email(self, value):
        normalized_email = User.objects.normalize_email(value).lower()
        if User.objects.filter(email__iexact=normalized_email).exists():
            raise serializers.ValidationError(AUTH_ERRORS["EMAIL_ALREADY_EXISTS"])
        return normalized_email

    def validate_password(self, value):
        if len(value) < 8:
            raise serializers.ValidationError(AUTH_ERRORS["WEEK_PASSWORD"])
        return value

    @transaction.atomic
    def create(self, validated_data):
        full_name = validated_data.pop("full_name", "")
        phone = validated_data.pop("phone", "")
        country = validated_data.pop("country", "")
        timezone_value = validated_data.pop("timezone", "")

        user = User.objects.create_user(
            email=validated_data["email"],
            password=validated_data["password"],
        )

        profile = user.profile
        profile.full_name = full_name
        profile.phone = phone
        profile.country = country
        profile.timezone = timezone_value
        profile.save()

        return user

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email = attrs.get("email")
        password = attrs.get("password")

        if not email or not password:
            raise serializers.ValidationError(AUTH_ERRORS["INVALID_INPUT"])

        user = authenticate(username=email, password=password)

        if not user:
            raise serializers.ValidationError(AUTH_ERRORS["INVALID_CREDENTIALS"])

        if not user.is_active:
            raise serializers.ValidationError(AUTH_ERRORS["INACTIVE_USER"])

        attrs["user"] = user
        return attrs

class CustomTokenRefreshSerializer(serializers.Serializer):
    refresh_token = serializers.CharField(required=True)

    def validate(self, attrs):
        refresh_value = attrs["refresh_token"]

        internal_serializer = TokenRefreshSerializer(
            data={"refresh": refresh_value}
        )
        internal_serializer.is_valid(raise_exception=True)

        return {
            "access_token": internal_serializer.validated_data["access"],
        }
    
class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()


class ResetPasswordSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True, min_length=8)

    def validate(self, attrs):
        uid = attrs.get("uid")
        token = attrs.get("token")
        new_password = attrs.get("new_password")
        confirm_password = attrs.get("confirm_password")

        if new_password != confirm_password:
            raise serializers.ValidationError(AUTH_ERRORS["CONFIRM_PASSWORD"])

        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id, is_active=True)
        except Exception:
            raise serializers.ValidationError(AUTH_ERRORS["INVALID_UID"])

        if not default_token_generator.check_token(user, token):
            raise serializers.ValidationError(AUTH_ERRORS["TOKEN"])

        validate_password(new_password, user=user)

        attrs["user"] = user
        return attrs