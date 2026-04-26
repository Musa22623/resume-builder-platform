from django.urls import path

from jobs.views import JobDescriptionViewSet

job_description_list = JobDescriptionViewSet.as_view(
    {
        "get": "list",
        "post": "create",
    }
)

job_description_detail = JobDescriptionViewSet.as_view(
    {
        "get": "retrieve",
        "put": "update",
        "patch": "partial_update",
        "delete": "destroy",
    }
)

urlpatterns = [
    path("descriptions/", job_description_list, name="job-description-list"),
    path("descriptions/<int:pk>/", job_description_detail, name="job-description-detail"),
]
