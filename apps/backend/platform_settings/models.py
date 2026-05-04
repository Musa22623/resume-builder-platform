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


class SupportConversation(models.Model):
    STATUS_CHOICES = [
        ("open", "Open"),
        ("pending_admin", "Pending Admin"),
        ("pending_user", "Pending User"),
        ("closed", "Closed"),
    ]

    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="support_conversations")
    subject = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default="open")
    assigned_admin = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_support_conversations",
    )
    last_message_at = models.DateTimeField(null=True, blank=True)
    last_message_preview = models.CharField(max_length=255, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class SupportMessage(models.Model):
    SENDER_ROLE_CHOICES = [
        ("user", "User"),
        ("admin", "Admin"),
        ("system", "System"),
    ]

    conversation = models.ForeignKey(SupportConversation, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="support_messages",
    )
    sender_role = models.CharField(max_length=20, choices=SENDER_ROLE_CHOICES)
    message = models.TextField()
    is_internal_note = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)


class SupportConversationReadState(models.Model):
    conversation = models.ForeignKey(SupportConversation, on_delete=models.CASCADE, related_name="read_states")
    reader = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="support_read_states")
    last_read_message = models.ForeignKey(
        SupportMessage,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )
    last_read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ("conversation", "reader")
