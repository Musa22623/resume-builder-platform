from django.urls import include, path
from rest_framework.routers import DefaultRouter

from billing.views import (
    AccessStatusView,
    CryptoPaymentInfoView,
    CryptoPaymentRequestViewSet,
    CryptoPlanWalletsView,
    PaymentViewSet,
    StripeCheckoutSessionView,
    StripeWebhookView,
    SubscriptionPlanViewSet,
    TrialStatusViewSet,
    UserSubscriptionViewSet,
)

router = DefaultRouter()
router.register("plans", SubscriptionPlanViewSet, basename="plans")
router.register("payments", PaymentViewSet, basename="payments")
router.register("subscriptions", UserSubscriptionViewSet, basename="subscriptions")
router.register("trial", TrialStatusViewSet, basename="trial")
router.register("crypto/payment-requests", CryptoPaymentRequestViewSet, basename="crypto-payment-requests")

urlpatterns = [
    path("", include(router.urls)),
    path("access-status/", AccessStatusView.as_view(), name="access_status"),
    path("stripe/checkout-session/", StripeCheckoutSessionView.as_view(), name="stripe_checkout_session"),
    path("stripe/webhook/", StripeWebhookView.as_view(), name="stripe_webhook"),
    path("crypto/payment-info/", CryptoPaymentInfoView.as_view(), name="crypto_payment_info"),
    path("crypto/plans/<int:plan_id>/wallets/", CryptoPlanWalletsView.as_view(), name="crypto_plan_wallets"),
]
