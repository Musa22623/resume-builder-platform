import os
from datetime import timedelta
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "unsafe")
# DEBUG = os.getenv("DJANGO_DEBUG", "1") == "1"
# ALLOWED_HOSTS = os.getenv("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")

# print("DEBUG:", DEBUG)

APP_ENV = os.getenv("APP_ENV", "local")

print("APP_ENV:", APP_ENV)

env_file_map = {
    "local": BASE_DIR / ".env.local",
    "docker": BASE_DIR / ".env.docker",
    "prod": BASE_DIR / ".env.prod",
}

env_path = env_file_map.get(APP_ENV, BASE_DIR / ".env.local")

print("BASE_DIR:", BASE_DIR)
print("env_path:", env_path)
if env_path.exists():
    load_dotenv(env_path)


def get_env(name: str, default=None, required: bool = False):
    value = os.getenv(name, default)
    if required and (value is None or value == ""):
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def get_bool_env(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.lower() in ("1", "true", "yes", "on")


def get_list_env(name: str, default: str = "") -> list[str]:
    value = os.getenv(name, default)
    return [item.strip() for item in value.split(",") if item.strip()]


if APP_ENV == "prod":
    SECRET_KEY = get_env("DJANGO_SECRET_KEY", required=True)
else:
    SECRET_KEY = get_env("DJANGO_SECRET_KEY", "django-insecure-dev-key")

DEBUG = get_bool_env("DJANGO_DEBUG", default=False)
# ALLOWED_HOSTS = get_list_env("ALLOWED_HOSTS", "127.0.0.1,localhost")
ALLOWED_HOSTS = ['*']

print("DJANGO_SECRET_KEY:", SECRET_KEY)


print("ALLOWED_HOSTS:", ALLOWED_HOSTS)
print("DEBUG:", DEBUG)


INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",
    # "accounts",
    'accounts.apps.AccountsConfig',
    "resumes",
    "jobs",
    "ai_services",
    "billing",
    "platform_settings",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": get_env("POSTGRES_DB", required=True),
        "USER": get_env("POSTGRES_USER", required=True),
        "PASSWORD": get_env("POSTGRES_PASSWORD", required=True),
        "HOST": get_env("POSTGRES_HOST", "127.0.0.1"),
        "PORT": get_env("POSTGRES_PORT", "5433"),
        "OPTIONS": {"sslmode": "require"},
    }
}

AUTH_USER_MODEL = "accounts.User"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "EXCEPTION_HANDLER": "common.exceptions.custom_exception_handler",
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": False,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
}

# CORS_ALLOWED_ORIGINS = [o for o in os.getenv("BACKEND_CORS_ORIGINS", "").split(",") if o]
CORS_ALLOW_ALL_ORIGINS = True

FRONTEND_URL = "http://localhost:5173"
GOOGLE_OAUTH_WEB_CLIENT_ID = get_env("GOOGLE_OAUTH_WEB_CLIENT_ID", "")

# EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
# EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_BACKEND = 'accounts.services.UnverifiedSMTPEmailBackend'

EMAIL_HOST = 'smtp.gmail.com'  # Gmail SMTP Server
EMAIL_PORT = 587  # normally using port
EMAIL_USE_TLS = True  # Setting Security using TLS
EMAIL_HOST_USER = 'kwokhoiyan862@gmail.com'  # Sending email address
EMAIL_HOST_PASSWORD = 'aitsacpjzydevtug'  # Sending email password
DEFAULT_FROM_EMAIL = "no-reply@example.com"

import ssl
ssl._create_default_https_context = ssl._create_unverified_context

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': True,
        },
    },
}

STATIC_URL = "/static/"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
