from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from billing.models import Payment, SubscriptionPlan, TrialStatus, UserSubscription
from billing.serializers import (
    PaymentSerializer,
    SubscriptionPlanSerializer,
    TrialStatusSerializer,
    UserSubscriptionSerializer,
)
from billing.services import build_crypto_payment_info, create_stripe_checkout_session


class SubscriptionPlanViewSet(viewsets.ModelViewSet):
    queryset = SubscriptionPlan.objects.all()
    serializer_class = SubscriptionPlanSerializer

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAdminUser()]


class PaymentViewSet(viewsets.ModelViewSet):
    serializer_class = PaymentSerializer

    def get_queryset(self):
        if self.request.user.is_staff:
            return Payment.objects.all()
        return Payment.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user, status="paid")


class UserSubscriptionViewSet(viewsets.ModelViewSet):
    serializer_class = UserSubscriptionSerializer

    def get_queryset(self):
        if self.request.user.is_staff:
            return UserSubscription.objects.all()
        return UserSubscription.objects.filter(user=self.request.user)


class TrialStatusViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = TrialStatusSerializer

    def get_queryset(self):
        return TrialStatus.objects.filter(user=self.request.user)

    @action(detail=False, methods=["get"])
    def me(self, request):
        trial, _ = TrialStatus.objects.get_or_create(user=request.user)
        return Response(self.get_serializer(trial).data)


class StripeCheckoutSessionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        plan_type = request.data.get("plan_type", "monthly")
        if plan_type not in ("monthly", "yearly"):
            return Response({"detail": "Invalid plan type."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            checkout_url = create_stripe_checkout_session(request.user.email, plan_type)
            return Response({"checkout_url": checkout_url})
        except Exception as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


class CryptoPaymentInfoView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        info = build_crypto_payment_info()
        return Response({"wallets": info})
