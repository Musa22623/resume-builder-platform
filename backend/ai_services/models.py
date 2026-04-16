from django.conf import settings
from django.db import models

from jobs.models import JobDescription
from resumes.models import Resume


class AIGenerationLog(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    resume = models.ForeignKey(Resume, on_delete=models.CASCADE)
    job_description = models.ForeignKey(JobDescription, on_delete=models.CASCADE)
    request_payload = models.JSONField(default=dict)
    response_payload = models.JSONField(default=dict)
    status = models.CharField(max_length=20, default="success")
    created_at = models.DateTimeField(auto_now_add=True)
