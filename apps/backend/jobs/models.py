from django.conf import settings
from django.db import models


class JobDescription(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    source_type = models.CharField(max_length=20, choices=[("link", "Link"), ("manual", "Manual")])
    job_link = models.URLField(blank=True)
    raw_text = models.TextField()
    parse_status = models.CharField(max_length=20, default="ok")
    created_at = models.DateTimeField(auto_now_add=True)
