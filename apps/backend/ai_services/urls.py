from django.urls import path

from ai_services.views import AIGenerationDetailView, ApplyAIGenerationView, OptimizeResumeView

urlpatterns = [
    path("optimize/", OptimizeResumeView.as_view(), name="optimize_resume"),
    path("generations/<int:generation_id>/", AIGenerationDetailView.as_view(), name="ai_generation_detail"),
    path("generations/<int:generation_id>/apply/", ApplyAIGenerationView.as_view(), name="apply_ai_generation"),
]
