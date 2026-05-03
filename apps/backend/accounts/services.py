from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

import smtplib
import socket
from django.core.mail.backends.smtp import EmailBackend

from email.message import EmailMessage

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