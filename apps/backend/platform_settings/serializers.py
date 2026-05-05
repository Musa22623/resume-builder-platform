from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework import serializers

from billing.models import (
    CryptoNetwork,
    CryptoPaymentRequest,
    CryptoPaymentReviewLog,
    CryptoWallet,
    PlanCryptoAvailability,
    SubscriptionPlan,
    TrialStatus,
)
from billing.services import get_user_access_status
from platform_settings.models import AdminActionLog, AdminContactMessage, PlatformSetting
from platform_settings.models import SupportConversation, SupportConversationReadState, SupportMessage
from platform_settings.services import get_unread_count

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


class AdminCryptoNetworkSerializer(serializers.ModelSerializer):
    class Meta:
        model = CryptoNetwork
        fields = "__all__"


class AdminCryptoWalletSerializer(serializers.ModelSerializer):
    network_code = serializers.CharField(source="network.code", read_only=True)

    class Meta:
        model = CryptoWallet
        fields = "__all__"


class AdminPlanCryptoAvailabilitySerializer(serializers.ModelSerializer):
    plan_name = serializers.CharField(source="plan.name", read_only=True)
    network_code = serializers.CharField(source="network.code", read_only=True)

    class Meta:
        model = PlanCryptoAvailability
        fields = "__all__"


class AdminCryptoPaymentRequestSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)
    plan_name = serializers.CharField(source="plan.name", read_only=True)
    network_code = serializers.CharField(source="network.code", read_only=True)
    wallet_address = serializers.CharField(source="wallet.address", read_only=True)
    reviewed_by_email = serializers.EmailField(source="reviewed_by.email", read_only=True)

    class Meta:
        model = CryptoPaymentRequest
        fields = (
            "id",
            "user",
            "user_email",
            "plan",
            "plan_name",
            "network",
            "network_code",
            "wallet",
            "wallet_address",
            "reference_code",
            "expected_amount",
            "expected_currency",
            "token_symbol",
            "network_name",
            "receiver_address",
            "instruction_snapshot",
            "transaction_hash",
            "sender_address",
            "status",
            "expires_at",
            "submitted_at",
            "reviewed_at",
            "reviewed_by",
            "reviewed_by_email",
            "review_note",
            "payment",
            "created_at",
            "updated_at",
        )


class AdminCryptoPaymentReviewLogSerializer(serializers.ModelSerializer):
    actor_email = serializers.EmailField(source="actor.email", read_only=True)

    class Meta:
        model = CryptoPaymentReviewLog
        fields = (
            "id",
            "payment_request",
            "actor",
            "actor_email",
            "action",
            "note",
            "before_payload",
            "after_payload",
            "created_at",
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


class SupportMessageSerializer(serializers.ModelSerializer):
    sender_email = serializers.EmailField(source="sender.email", read_only=True)

    class Meta:
        model = SupportMessage
        fields = (
            "id",
            "conversation",
            "sender",
            "sender_email",
            "sender_role",
            "message",
            "is_internal_note",
            "created_at",
        )


class SupportConversationListSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)
    assigned_admin_email = serializers.EmailField(source="assigned_admin.email", read_only=True)
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = SupportConversation
        fields = (
            "id",
            "user",
            "user_email",
            "subject",
            "status",
            "assigned_admin",
            "assigned_admin_email",
            "last_message_at",
            "last_message_preview",
            "created_at",
            "updated_at",
            "unread_count",
        )

    def get_unread_count(self, obj):
        reader = self.context.get("reader")
        if not reader:
            return 0
        return get_unread_count(conversation=obj, reader=reader)


class SupportConversationDetailSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)
    assigned_admin_email = serializers.EmailField(source="assigned_admin.email", read_only=True)
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = SupportConversation
        fields = (
            "id",
            "user",
            "user_email",
            "subject",
            "status",
            "assigned_admin",
            "assigned_admin_email",
            "last_message_at",
            "last_message_preview",
            "closed_at",
            "created_at",
            "updated_at",
            "unread_count",
        )

    def get_unread_count(self, obj):
        reader = self.context.get("reader")
        if not reader:
            return 0
        return get_unread_count(conversation=obj, reader=reader)


class SupportConversationCreateSerializer(serializers.Serializer):
    subject = serializers.CharField(required=False, allow_blank=True, max_length=255)
    message = serializers.CharField()


class SupportConversationUpdateSerializer(serializers.ModelSerializer):
    status = serializers.ChoiceField(choices=("open", "pending_admin", "pending_user", "closed"), required=False)
    assigned_admin = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(Q(role="ADMIN") | Q(is_staff=True)),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = SupportConversation
        fields = ("status", "assigned_admin")


class SupportMessageCreateSerializer(serializers.Serializer):
    message = serializers.CharField()
    is_internal_note = serializers.BooleanField(required=False, default=False)
