from django.urls import include, path
from rest_framework.routers import DefaultRouter

from platform_settings.views import SupportConversationUserViewSet

router = DefaultRouter()
router.register("conversations", SupportConversationUserViewSet, basename="support-conversations")

urlpatterns = [
    path("", include(router.urls)),
]
