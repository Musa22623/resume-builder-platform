from rest_framework import serializers

from billing.models import (
    CryptoNetwork,
    CryptoPaymentRequest,
    CryptoPaymentReviewLog,
    CryptoWallet,
    Payment,
    PlanCryptoAvailability,
    SubscriptionPlan,
    TrialStatus,
    UserSubscription,
)


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionPlan
        fields = "__all__"


class UserSubscriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserSubscription
        fields = "__all__"


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = "__all__"


class TrialStatusSerializer(serializers.ModelSerializer):
    remaining_days = serializers.IntegerField(read_only=True)

    class Meta:
        model = TrialStatus
        fields = ("user", "started_at", "trial_days", "remaining_days")


class AccessStatusSerializer(serializers.Serializer):
    has_access = serializers.BooleanField()
    access_type = serializers.ChoiceField(choices=("trial", "subscription", "none"))
    trial = serializers.DictField()
    subscription = serializers.DictField()
    features = serializers.DictField()


class StripeCheckoutSessionSerializer(serializers.Serializer):
    plan_id = serializers.IntegerField(required=False)
    plan_type = serializers.ChoiceField(choices=("monthly", "yearly"), required=False)


class CryptoNetworkSerializer(serializers.ModelSerializer):
    class Meta:
        model = CryptoNetwork
        fields = "__all__"


class CryptoWalletSerializer(serializers.ModelSerializer):
    network_code = serializers.CharField(source="network.code", read_only=True)

    class Meta:
        model = CryptoWallet
        fields = "__all__"


class PlanCryptoAvailabilitySerializer(serializers.ModelSerializer):
    plan_name = serializers.CharField(source="plan.name", read_only=True)
    network_code = serializers.CharField(source="network.code", read_only=True)

    class Meta:
        model = PlanCryptoAvailability
        fields = "__all__"


class CryptoWalletPublicSerializer(serializers.ModelSerializer):
    qr_payload = serializers.SerializerMethodField()

    class Meta:
        model = CryptoWallet
        fields = ("id", "label", "address", "qr_payload")

    def get_qr_payload(self, obj):
        return self.context["qr_payload_builder"](obj)


class CryptoNetworkPublicSerializer(serializers.ModelSerializer):
    wallets = serializers.SerializerMethodField()

    class Meta:
        model = CryptoNetwork
        fields = ("id", "code", "display_name", "token_symbol", "network_name", "wallets")

    def get_wallets(self, obj):
        wallets = self.context["wallet_map"].get(obj.id, [])
        return CryptoWalletPublicSerializer(
            wallets,
            many=True,
            context=self.context,
        ).data


class CryptoPaymentRequestSerializer(serializers.ModelSerializer):
    plan_name = serializers.CharField(source="plan.name", read_only=True)
    network_code = serializers.CharField(source="network.code", read_only=True)
    wallet_address = serializers.CharField(source="wallet.address", read_only=True)

    class Meta:
        model = CryptoPaymentRequest
        fields = (
            "id",
            "user",
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
            "review_note",
            "payment",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "user",
            "status",
            "submitted_at",
            "reviewed_at",
            "reviewed_by",
            "review_note",
            "payment",
            "created_at",
            "updated_at",
        )


class CryptoPaymentRequestCreateSerializer(serializers.Serializer):
    plan_id = serializers.IntegerField()
    network_id = serializers.IntegerField()
    wallet_id = serializers.IntegerField(required=False)


class CryptoPaymentSubmissionSerializer(serializers.Serializer):
    transaction_hash = serializers.CharField()
    sender_address = serializers.CharField(required=False, allow_blank=True)


class CryptoPaymentReviewSerializer(serializers.Serializer):
    note = serializers.CharField(required=False, allow_blank=True)


class CryptoPaymentReviewLogSerializer(serializers.ModelSerializer):
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
