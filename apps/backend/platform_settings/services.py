from __future__ import annotations

from typing import Any

from django.utils import timezone

from platform_settings.models import (
    AdminActionLog,
    PlatformSetting,
    SupportConversation,
    SupportConversationReadState,
    SupportMessage,
)

DEFAULT_TRIAL_ENABLED = True
DEFAULT_TRIAL_DAYS = 14


def has_platform_admin_access(user) -> bool:
    if not user or not getattr(user, "is_authenticated", False):
        return False
    return bool(user.is_staff or getattr(user, "role", "USER") == "ADMIN")


def get_platform_setting(key: str, default: Any = None) -> Any:
    setting = PlatformSetting.objects.filter(key=key).first()
    if not setting:
        return default
    return setting.value


def set_platform_setting(key: str, value: Any) -> PlatformSetting:
    setting, _ = PlatformSetting.objects.update_or_create(
        key=key,
        defaults={"value": str(value)},
    )
    return setting


def get_trial_settings() -> dict:
    enabled_value = get_platform_setting("trial.enabled", str(DEFAULT_TRIAL_ENABLED).lower())
    days_value = get_platform_setting("trial.default_days", str(DEFAULT_TRIAL_DAYS))

    trial_enabled = str(enabled_value).lower() in {"1", "true", "yes", "on"}
    try:
        default_trial_days = int(days_value)
    except (TypeError, ValueError):
        default_trial_days = DEFAULT_TRIAL_DAYS

    return {
        "trial_enabled": trial_enabled,
        "default_trial_days": max(0, default_trial_days),
    }


def log_admin_action(
    *,
    actor,
    action_type: str,
    target_type: str,
    target_id: str = "",
    before_payload: dict | None = None,
    after_payload: dict | None = None,
) -> AdminActionLog:
    return AdminActionLog.objects.create(
        actor=actor,
        action_type=action_type,
        target_type=target_type,
        target_id=target_id,
        before_payload=before_payload or {},
        after_payload=after_payload or {},
    )


def update_conversation_after_message(*, conversation: SupportConversation, message: SupportMessage) -> SupportConversation:
    preview = (message.message or "")[:255]
    if message.sender_role == "user":
        conversation.status = "pending_admin"
    elif message.sender_role == "admin" and not message.is_internal_note:
        conversation.status = "pending_user"
    conversation.last_message_at = message.created_at
    conversation.last_message_preview = preview
    conversation.save(update_fields=["status", "last_message_at", "last_message_preview", "updated_at"])
    return conversation


def mark_conversation_read(*, conversation: SupportConversation, reader, last_message: SupportMessage | None = None):
    read_state, _ = SupportConversationReadState.objects.get_or_create(
        conversation=conversation,
        reader=reader,
    )
    if last_message is None:
        last_message = conversation.messages.order_by("-id").first()
    read_state.last_read_message = last_message
    read_state.last_read_at = timezone.now()
    read_state.save(update_fields=["last_read_message", "last_read_at"])
    return read_state


def get_unread_count(*, conversation: SupportConversation, reader) -> int:
    read_state = (
        SupportConversationReadState.objects.filter(conversation=conversation, reader=reader)
        .select_related("last_read_message")
        .first()
    )
    queryset = conversation.messages.exclude(sender=reader)
    if read_state and read_state.last_read_message_id:
        queryset = queryset.filter(id__gt=read_state.last_read_message_id)
    return queryset.count()
