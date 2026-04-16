from django.urls import path

from ai_services.views import OptimizeResumeView

urlpatterns = [path("optimize/", OptimizeResumeView.as_view(), name="optimize_resume")]
