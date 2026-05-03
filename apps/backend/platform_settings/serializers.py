from django.contrib.auth import get_user_model
from rest_framework import serializers

from billing.models import SubscriptionPlan, TrialStatus
from billing.services import get_user_access_status
from platform_settings.models import AdminActionLog, AdminContactMessage, PlatformSetting

User = get_user_model()


class PlatformSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlatformSetting
        fields = "__all__"


class TrialSettingsSerializer(serializers.Serializer):
    trial_enabled = serializers.BooleanField()
    default_trial_days = serializers.IntegerField(min_value=0)


class AdminUserListSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source="profile.full_name", read_only=True)
    access_state = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "role",
            "is_active",
            "is_staff",
            "email_verified",
            "created_at",
            "full_name",
            "access_state",
        )

    def get_access_state(self, obj):
        return get_user_access_status(obj)


class AdminUserDetailSerializer(serializers.ModelSerializer):
    profile = serializers.SerializerMethodField()
    access_state = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "role",
            "is_active",
            "is_staff",
            "email_verified",
            "created_at",
            "updated_at",
            "profile",
            "access_state",
        )

    def get_profile(self, obj):
        profile = getattr(obj, "profile", None)
        if not profile:
            return {}
        return {
            "full_name": profile.full_name,
            "phone": profile.phone,
            "country": profile.country,
            "timezone": profile.timezone,
            "avatar_file_path": profile.avatar_file_path,
        }

    def get_access_state(self, obj):
        return get_user_access_status(obj)


class AdminUserUpdateSerializer(serializers.ModelSerializer):
    role = serializers.ChoiceField(choices=("ADMIN", "USER"), required=False)
    is_active = serializers.BooleanField(required=False)

    class Meta:
        model = User
        fields = ("role", "is_active")


class AdminUserTrialSerializer(serializers.ModelSerializer):
    remaining_days = serializers.IntegerField(read_only=True)

    class Meta:
        model = TrialStatus
        fields = ("user", "started_at", "trial_days", "remaining_days")
        read_only_fields = ("user", "remaining_days")


class AdminOverviewSerializer(serializers.Serializer):
    users = serializers.DictField()
    access = serializers.DictField()
    billing = serializers.DictField()
    ai = serializers.DictField()


class AdminPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionPlan
        fields = (
            "id",
            "name",
            "plan_type",
            "price_usd",
            "currency",
            "billing_interval",
            "stripe_price_id",
            "stripe_product_id",
            "display_order",
            "active",
            "is_archived",
        )


class AdminActionLogSerializer(serializers.ModelSerializer):
    actor_email = serializers.EmailField(source="actor.email", read_only=True)

    class Meta:
        model = AdminActionLog
        fields = (
            "id",
            "actor",
            "actor_email",
            "action_type",
            "target_type",
            "target_id",
            "before_payload",
            "after_payload",
            "created_at",
        )


class AdminContactMessageSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = AdminContactMessage
        fields = ("id", "user", "user_email", "message", "admin_reply", "is_resolved", "created_at", "updated_at")
        read_only_fields = ("user", "user_email", "admin_reply", "is_resolved")


class AdminContactMessageAdminSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = AdminContactMessage
        fields = ("id", "user", "user_email", "message", "admin_reply", "is_resolved", "created_at", "updated_at")
