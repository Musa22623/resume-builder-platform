from django.db import models


class PlatformSetting(models.Model):
    key = models.CharField(max_length=100, unique=True)
    value = models.CharField(max_length=255)
    updated_at = models.DateTimeField(auto_now=True)


class AdminContactMessage(models.Model):
    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="admin_contact_messages")
    message = models.TextField()
    admin_reply = models.TextField(blank=True)
    is_resolved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class AdminActionLog(models.Model):
    actor = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="admin_action_logs")
    action_type = models.CharField(max_length=100)
    target_type = models.CharField(max_length=100)
    target_id = models.CharField(max_length=100, blank=True)
    before_payload = models.JSONField(default=dict, blank=True)
    after_payload = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
