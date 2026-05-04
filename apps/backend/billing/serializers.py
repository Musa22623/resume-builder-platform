from rest_framework import serializers

from billing.models import Payment, SubscriptionPlan, TrialStatus, UserSubscription


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
