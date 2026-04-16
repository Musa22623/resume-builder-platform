from django.urls import include, path
from rest_framework.routers import DefaultRouter

from resumes.views import ResumeViewSet, UploadedFileViewSet

router = DefaultRouter()
router.register("items", ResumeViewSet, basename="resumes")
router.register("uploads", UploadedFileViewSet, basename="uploads")

urlpatterns = [path("", include(router.urls))]
