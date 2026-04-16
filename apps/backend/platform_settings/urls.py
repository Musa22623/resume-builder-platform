from django.urls import include, path
from rest_framework.routers import DefaultRouter

from platform_settings.views import AdminContactMessageViewSet, AdminOverviewView, AdminUsersViewSet, PlatformSettingViewSet

router = DefaultRouter()
router.register("settings", PlatformSettingViewSet, basename="platform-settings")
router.register("users", AdminUsersViewSet, basename="admin-users")
router.register("contact-messages", AdminContactMessageViewSet, basename="contact-messages")

urlpatterns = [
    path("", include(router.urls)),
    path("overview/", AdminOverviewView.as_view(), name="admin-overview"),
]
