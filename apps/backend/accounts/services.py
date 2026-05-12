from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.db import transaction
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from google.auth.transport.requests import Request
from google.oauth2 import id_token as google_id_token
from rest_framework.exceptions import ValidationError

import smtplib
from django.core.mail.backends.smtp import EmailBackend

from accounts.models import SocialAccount
from billing.models import TrialStatus
from common.constants.errors import AUTH_ERRORS
from platform_settings.services import get_trial_settings
from email.message import EmailMessage

User = get_user_model()

def send_password_reset_email(user):
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)

    reset_url = f"{settings.FRONTEND_URL}/reset-password?uid={uid}&token={token}"

    subject = "Reset your password"
    message = (
        "Hello,\n\n"
        "You requested a password reset.\n\n"
        f"Reset link:\n{reset_url}\n\n"
        "If you did not request this, you can ignore this email."
    )

    send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )

    return {
        "uid": uid,
        "token": token,
        "reset_url": reset_url,
    }

class UnverifiedSMTPEmailBackend(EmailBackend):
    def send_messages(self, email_messages):
        # smtp_host = 'smtp.gmail.com'
        # smtp_port = 587
        # username = 'kwokhoiyan862@gmail.com'
        # password = 'aitsacpjzydevtug'
        print(email_messages)
        try:
            with smtplib.SMTP(self.host , self.port, timeout=30) as server:
                server.starttls()  # TLS 연결 시작
                server.login(self.username, self.password)  # 로그인
                for email_message in email_messages:
                        #     # 이메일 메시지에 대한 실제 발송 처리
                    if hasattr(email_message, 'recipients'):
                        recipients = email_message.recipients()
                        # print(f"Sending email to: {recipients}")
                        # print(email_message.from_email + ":" + recipients[0])
                        msg = EmailMessage()
                        msg.set_content(email_message.message())
                        msg['Subject'] = 'Test Email from Python'
                        msg['From'] = settings.DEFAULT_FROM_EMAIL
                        msg['To'] = recipients[0]  # 수신자 이메일로 변경
                        server.send_message(msg, settings.DEFAULT_FROM_EMAIL)
                        # connection.sendmail(email_message.from_email, recipients, email_message.message())
                    else:
                        print("Email message object does not have recipients method.")
                print("Email sent successfully!")
        except Exception as e:
            print(f"Error: {e}")
        return len(email_messages)


def verify_google_id_token(google_token: str) -> dict:
    client_id = getattr(settings, "GOOGLE_OAUTH_WEB_CLIENT_ID", "")
    if not client_id:
        raise ValidationError(AUTH_ERRORS["GOOGLE_AUTH_NOT_CONFIGURED"])

    try:
        token_info = google_id_token.verify_oauth2_token(
            google_token,
            Request(),
            client_id,
        )
    except Exception as exc:
        raise ValidationError(AUTH_ERRORS["INVALID_GOOGLE_TOKEN"]) from exc

    issuer = token_info.get("iss")
    if issuer not in {"accounts.google.com", "https://accounts.google.com"}:
        raise ValidationError(AUTH_ERRORS["INVALID_GOOGLE_TOKEN"])

    if not token_info.get("sub"):
        raise ValidationError(AUTH_ERRORS["INVALID_GOOGLE_TOKEN"])

    if not token_info.get("email"):
        raise ValidationError(AUTH_ERRORS["GOOGLE_EMAIL_REQUIRED"])

    return token_info


@transaction.atomic
def get_or_create_user_from_google_token(google_token: str):
    token_info = verify_google_id_token(google_token)

    provider = "google"
    provider_user_id = token_info["sub"]
    email = User.objects.normalize_email(token_info["email"]).lower()
    full_name = token_info.get("name", "")

    social_account = (
        SocialAccount.objects.select_related("user")
        .filter(provider=provider, provider_user_id=provider_user_id)
        .first()
    )
    if social_account:
        user = social_account.user
        if not user.is_active:
            raise ValidationError(AUTH_ERRORS["INACTIVE_USER"])
        if not user.email_verified:
            user.email_verified = True
            user.save(update_fields=["email_verified", "updated_at"])
        return user

    user = User.objects.filter(email__iexact=email).first()
    if user is None:
        user = User.objects.create_user(email=email, password=None)
        user.set_unusable_password()
        user.email_verified = True
        user.save(update_fields=["password", "email_verified", "updated_at"])

        profile = user.profile
        if full_name and not profile.full_name:
            profile.full_name = full_name
            profile.save(update_fields=["full_name", "updated_at"])

        trial_settings = get_trial_settings()
        if trial_settings["trial_enabled"]:
            TrialStatus.objects.get_or_create(
                user=user,
                defaults={"trial_days": trial_settings["default_trial_days"]},
            )
    else:
        if not user.is_active:
            raise ValidationError(AUTH_ERRORS["INACTIVE_USER"])
        if not user.email_verified:
            user.email_verified = True
            user.save(update_fields=["email_verified", "updated_at"])
        profile = user.profile
        if full_name and not profile.full_name:
            profile.full_name = full_name
            profile.save(update_fields=["full_name", "updated_at"])

    SocialAccount.objects.get_or_create(
        provider=provider,
        provider_user_id=provider_user_id,
        defaults={
            "user": user,
            "email": email,
        },
    )

    return user
