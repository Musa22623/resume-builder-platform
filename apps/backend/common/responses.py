from rest_framework.response import Response


def success_response(*, message="", data=None, status=200):
    return Response(
        {
            "success": True,
            "message": message,
            "data": data or {},
        },
        status=status,
    )


def error_response(*, error, status=400):
    return Response(
        {
            "success": False,
            "error": error,
        },
        status=status,
    )