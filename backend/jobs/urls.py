from django.urls import include, path
from rest_framework.routers import DefaultRouter

from jobs.views import JobDescriptionViewSet

router = DefaultRouter()
router.register("descriptions", JobDescriptionViewSet, basename="jobs")

urlpatterns = [path("", include(router.urls))]
