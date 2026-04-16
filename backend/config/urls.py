from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/resumes/", include("resumes.urls")),
    path("api/jobs/", include("jobs.urls")),
    path("api/ai/", include("ai_services.urls")),
    path("api/billing/", include("billing.urls")),
    path("api/admin/", include("platform_settings.urls")),
]
