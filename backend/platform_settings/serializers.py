from django.contrib.auth import get_user_model
from rest_framework import serializers

from billing.models import SubscriptionPlan, TrialStatus, UserSubscription
from platform_settings.models import AdminContactMessage, PlatformSetting

User = get_user_model()


class PlatformSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlatformSetting
        fields = "__all__"


class AdminUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username", "email", "is_active", "is_staff", "is_platform_admin")


class AdminOverviewSerializer(serializers.Serializer):
    users = AdminUserSerializer(many=True)
    plans = serializers.SerializerMethodField()
    subscriptions = serializers.SerializerMethodField()
    trials = serializers.SerializerMethodField()

    def get_plans(self, _):
        return list(SubscriptionPlan.objects.values())

    def get_subscriptions(self, _):
        return list(UserSubscription.objects.values())

    def get_trials(self, _):
        return list(TrialStatus.objects.values())


class AdminContactMessageSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = AdminContactMessage
        fields = ("id", "user", "username", "message", "admin_reply", "is_resolved", "created_at", "updated_at")
        read_only_fields = ("user", "username", "admin_reply", "is_resolved")


class AdminContactMessageAdminSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = AdminContactMessage
        fields = ("id", "user", "username", "message", "admin_reply", "is_resolved", "created_at", "updated_at")
