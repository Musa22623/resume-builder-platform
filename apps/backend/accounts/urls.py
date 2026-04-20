from django.urls import path

from accounts.views import LoginView, MeView, PasswordResetPlaceholderView, RefreshView, SignUpView

urlpatterns = [
    path("signup/", SignUpView.as_view(), name="signup"),
    path("login/", LoginView.as_view(), name="login"),
    path("refresh/", RefreshView.as_view(), name="refresh"),
    path("me/", MeView.as_view(), name="me"),
    path("password-reset/", PasswordResetPlaceholderView.as_view(), name="password_reset"),
]
