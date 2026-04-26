from django.urls import include, path
from rest_framework.routers import DefaultRouter

from billing.views import (
    AccessStatusView,
    CryptoPaymentInfoView,
    PaymentViewSet,
    StripeCheckoutSessionView,
    SubscriptionPlanViewSet,
    TrialStatusViewSet,
    UserSubscriptionViewSet,
)

router = DefaultRouter()
router.register("plans", SubscriptionPlanViewSet, basename="plans")
router.register("payments", PaymentViewSet, basename="payments")
router.register("subscriptions", UserSubscriptionViewSet, basename="subscriptions")
router.register("trial", TrialStatusViewSet, basename="trial")

urlpatterns = [
    path("", include(router.urls)),
    path("access-status/", AccessStatusView.as_view(), name="access_status"),
    path("stripe/checkout-session/", StripeCheckoutSessionView.as_view(), name="stripe_checkout_session"),
    path("crypto/payment-info/", CryptoPaymentInfoView.as_view(), name="crypto_payment_info"),
]
