from django.urls import include, path
from rest_framework.routers import DefaultRouter

from platform_settings.views import (
    AdminActionLogViewSet,
    AdminContactMessageViewSet,
    AdminCryptoNetworkViewSet,
    AdminCryptoPaymentRequestViewSet,
    AdminCryptoWalletViewSet,
    AdminOverviewView,
    AdminPlansViewSet,
    AdminPlanCryptoAvailabilityViewSet,
    AdminSupportConversationViewSet,
    AdminUsersViewSet,
    PlatformSettingViewSet,
    TrialSettingsView,
)

router = DefaultRouter()
router.register("settings", PlatformSettingViewSet, basename="platform-settings")
router.register("users", AdminUsersViewSet, basename="admin-users")
router.register("plans", AdminPlansViewSet, basename="admin-plans")
router.register("action-logs", AdminActionLogViewSet, basename="admin-action-logs")
router.register("contact-messages", AdminContactMessageViewSet, basename="contact-messages")
router.register("support/conversations", AdminSupportConversationViewSet, basename="admin-support-conversations")
router.register("crypto/networks", AdminCryptoNetworkViewSet, basename="admin-crypto-networks")
router.register("crypto/wallets", AdminCryptoWalletViewSet, basename="admin-crypto-wallets")
router.register("crypto/plan-availability", AdminPlanCryptoAvailabilityViewSet, basename="admin-crypto-plan-availability")
router.register("crypto/payment-requests", AdminCryptoPaymentRequestViewSet, basename="admin-crypto-payment-requests")

urlpatterns = [
    path("", include(router.urls)),
    path("overview/", AdminOverviewView.as_view(), name="admin-overview"),
    path("trial-settings/", TrialSettingsView.as_view(), name="admin-trial-settings"),
]
