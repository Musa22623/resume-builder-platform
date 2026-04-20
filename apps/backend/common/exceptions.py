import logging
from django.conf import settings
from rest_framework import status
from rest_framework.exceptions import (
    AuthenticationFailed,
    NotAuthenticated,
    PermissionDenied,
    ValidationError,
)
from rest_framework.views import exception_handler
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

from common.constants.errors import AUTH_ERRORS
from common.responses import error_response

def normalize_error_dict(data: dict) -> dict:
    result = {}
    for key, value in data.items():
        if isinstance(value, list) and len(value) == 1:
            result[key] = value[0]
        else:
            result[key] = value
    return result


logger = logging.getLogger(__name__)

def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if isinstance(exc, (InvalidToken, TokenError)):
        detail = getattr(exc, "detail", None)

        message = AUTH_ERRORS["TOKEN_INVALID"]["message"]
        code = AUTH_ERRORS["TOKEN_INVALID"]["code"]

        if detail:
            detail_str = str(detail).lower()
            if "expired" in detail_str:
                code = AUTH_ERRORS["TOKEN_EXPIRED"]["code"]
                message = AUTH_ERRORS["TOKEN_EXPIRED"]["message"]

        return error_response(
            error={
                "code": code,
                "message": message,
            },
            status=status.HTTP_401_UNAUTHORIZED,
        )

    if response is None:
        logger.exception("Unhandled exception in API view")
        if settings.DEBUG:
            raise exc
        return error_response(
            error={
                "code": "INTERNAL_SERVER_ERROR",
                "message": "Internal server error",
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    if isinstance(exc, ValidationError):
        data = response.data

        if isinstance(data, dict):
            if "code" in data and "message" in data:
                normalized = normalize_error_dict(data)
                return error_response(error=normalized, status=response.status_code)

            if "non_field_errors" in data:
                msg = data["non_field_errors"]
                if isinstance(msg, list):
                    msg = msg[0]
                return error_response(
                    error={
                        "code": "VALIDATION_ERROR",
                        "message": msg,
                    },
                    status=response.status_code,
                )

            return error_response(
                error={
                    "code": "VALIDATION_ERROR",
                    "message": "VALIDATION ERROR.",
                    "fields": data,
                },
                status=response.status_code,
            )

        if isinstance(data, list):
            msg = data[0] if data else "VALIDATION_ERROR."
            return error_response(
                error={
                    "code": "VALIDATION_ERROR",
                    "message": msg,
                },
                status=response.status_code,
            )

        return error_response(
            error={
                "code": "VALIDATION_ERROR",
                "message": str(data),
            },
            status=response.status_code,
        )

    if isinstance(exc, NotAuthenticated):
        return error_response(
            error=AUTH_ERRORS["UNAUTHORIZED"],
            status=status.HTTP_401_UNAUTHORIZED,
        )

    if isinstance(exc, AuthenticationFailed):
        return error_response(
            error=AUTH_ERRORS["UNAUTHORIZED"],
            status=status.HTTP_401_UNAUTHORIZED,
        )

    if isinstance(exc, PermissionDenied):
        return error_response(
            error={
                "code": "FORBIDDEN",
                "message": "Forbidden.",
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    return error_response(
        error={
            "code": "API_ERROR",
            "message": response.data,
        },
        status=response.status_code,
    )