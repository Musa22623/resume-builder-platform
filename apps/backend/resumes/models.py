from django.conf import settings
from django.db import models


class Resume(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    title = models.CharField(max_length=120)
    source_type = models.CharField(max_length=20, choices=[("upload", "Upload"), ("manual", "Manual")])
    content_json = models.JSONField(default=dict)
    is_draft = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class ResumeVersion(models.Model):
    resume = models.ForeignKey(Resume, on_delete=models.CASCADE, related_name="versions")
    content_json = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)


class UploadedFile(models.Model):
    resume = models.ForeignKey(Resume, on_delete=models.CASCADE, related_name="uploads")
    file = models.FileField(upload_to="resumes/")
    mime_type = models.CharField(max_length=120)
    extracted_text = models.TextField(blank=True)
    parsed_content_json = models.JSONField(default=dict, blank=True)
    parsed_at = models.DateTimeField(null=True, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
