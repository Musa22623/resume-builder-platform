import logging

from django.conf import settings
from rest_framework import status
from rest_framework.exceptions import (
    AuthenticationFailed,
    MethodNotAllowed,
    NotAuthenticated,
    NotFound,
    ParseError,
    PermissionDenied,
    Throttled,
    UnsupportedMediaType,
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


def build_error_payload(*, error_type: str, code: str, message, **extra) -> dict:
    payload = {
        "type": error_type,
        "code": code,
        "message": message,
    }
    payload.update(extra)
    return payload


def is_code_message_dict(value) -> bool:
    return isinstance(value, dict) and "code" in value and "message" in value


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
            error=build_error_payload(
                error_type="auth",
                code=code,
                message=message,
            ),
            status=status.HTTP_401_UNAUTHORIZED,
        )

    if response is None:
        logger.exception("Unhandled exception in API view")
        if settings.DEBUG:
            raise exc
        return error_response(
            error=build_error_payload(
                error_type="system",
                code="INTERNAL_SERVER_ERROR",
                message="Internal server error",
            ),
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    if isinstance(exc, ValidationError):
        data = response.data

        if isinstance(data, dict):
            if "code" in data and "message" in data:
                normalized = normalize_error_dict(data)
                return error_response(
                    error=build_error_payload(
                        error_type="business",
                        code=normalized["code"],
                        message=normalized["message"],
                    ),
                    status=response.status_code,
                )

            if "non_field_errors" in data:
                msg = data["non_field_errors"]
                if isinstance(msg, list):
                    msg = msg[0]

                if is_code_message_dict(msg):
                    return error_response(
                        error=build_error_payload(
                            error_type="business",
                            code=msg["code"],
                            message=msg["message"],
                        ),
                        status=response.status_code,
                    )

                return error_response(
                    error=build_error_payload(
                        error_type="validation",
                        code="INVALID_REQUEST",
                        message=msg,
                    ),
                    status=response.status_code,
                )

            normalized_fields = normalize_error_dict(data)
            if len(normalized_fields) == 1:
                field_name, field_value = next(iter(normalized_fields.items()))
                if is_code_message_dict(field_value):
                    return error_response(
                        error=build_error_payload(
                            error_type="business",
                            code=field_value["code"],
                            message=field_value["message"],
                            field=field_name,
                        ),
                        status=response.status_code,
                    )

            return error_response(
                error=build_error_payload(
                    error_type="validation",
                    code="INVALID_REQUEST",
                    message="Request parameters are invalid.",
                    fields=normalized_fields,
                ),
                status=response.status_code,
            )

        if isinstance(data, list):
            msg = data[0] if data else "Request parameters are invalid."

            if is_code_message_dict(msg):
                return error_response(
                    error=build_error_payload(
                        error_type="business",
                        code=msg["code"],
                        message=msg["message"],
                    ),
                    status=response.status_code,
                )

            return error_response(
                error=build_error_payload(
                    error_type="validation",
                    code="INVALID_REQUEST",
                    message=msg,
                ),
                status=response.status_code,
            )

        return error_response(
            error=build_error_payload(
                error_type="validation",
                code="INVALID_REQUEST",
                message=str(data),
            ),
            status=response.status_code,
        )

    if isinstance(exc, NotAuthenticated):
        return error_response(
            error=build_error_payload(
                error_type="auth",
                code=AUTH_ERRORS["UNAUTHORIZED"]["code"],
                message=AUTH_ERRORS["UNAUTHORIZED"]["message"],
            ),
            status=status.HTTP_401_UNAUTHORIZED,
        )

    if isinstance(exc, AuthenticationFailed):
        return error_response(
            error=build_error_payload(
                error_type="auth",
                code=AUTH_ERRORS["UNAUTHORIZED"]["code"],
                message=AUTH_ERRORS["UNAUTHORIZED"]["message"],
            ),
            status=status.HTTP_401_UNAUTHORIZED,
        )

    if isinstance(exc, NotFound):
        return error_response(
            error=build_error_payload(
                error_type="business",
                code="NOT_FOUND",
                message="Requested resource was not found.",
            ),
            status=status.HTTP_404_NOT_FOUND,
        )

    if isinstance(exc, MethodNotAllowed):
        return error_response(
            error=build_error_payload(
                error_type="validation",
                code="METHOD_NOT_ALLOWED",
                message="Method not allowed.",
            ),
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    if isinstance(exc, ParseError):
        return error_response(
            error=build_error_payload(
                error_type="validation",
                code="INVALID_REQUEST_BODY",
                message="Request body could not be parsed.",
            ),
            status=status.HTTP_400_BAD_REQUEST,
        )

    if isinstance(exc, UnsupportedMediaType):
        return error_response(
            error=build_error_payload(
                error_type="validation",
                code="UNSUPPORTED_MEDIA_TYPE",
                message="Unsupported media type.",
            ),
            status=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
        )

    if isinstance(exc, Throttled):
        return error_response(
            error=build_error_payload(
                error_type="business",
                code="RATE_LIMITED",
                message="Too many requests. Please try again later.",
                retry_after=getattr(exc, "wait", None),
            ),
            status=status.HTTP_429_TOO_MANY_REQUESTS,
        )

    if isinstance(exc, PermissionDenied):
        return error_response(
            error=build_error_payload(
                error_type="permission",
                code="FORBIDDEN",
                message="Forbidden.",
            ),
            status=status.HTTP_403_FORBIDDEN,
        )

    return error_response(
        error=build_error_payload(
            error_type="system",
            code="API_ERROR",
            message=response.data,
        ),
        status=response.status_code,
    )
