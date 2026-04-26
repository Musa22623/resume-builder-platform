from rest_framework.permissions import BasePermission

from billing.services import get_user_access_status


class HasActiveAccess(BasePermission):
    message = "Trial expired and no active subscription."

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return get_user_access_status(request.user)["has_access"]
