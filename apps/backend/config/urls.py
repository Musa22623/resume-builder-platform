from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/auth/", include("accounts.urls")),
    path("api/v1/resumes/", include("resumes.urls")),
    path("api/v1/jobs/", include("jobs.urls")),
    path("api/v1/ai/", include("ai_services.urls")),
    path("api/v1/billing/", include("billing.urls")),
    path("api/v1/admin/", include("platform_settings.urls")),
    path("api/v1/support/", include("platform_settings.support_urls")),
]
