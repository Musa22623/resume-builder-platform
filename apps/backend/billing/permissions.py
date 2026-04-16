from rest_framework.permissions import BasePermission

from billing.models import TrialStatus, UserSubscription


class HasActiveAccess(BasePermission):
    message = "Trial expired and no active subscription."

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if UserSubscription.objects.filter(user=request.user, is_active=True).exists():
            return True
        trial = TrialStatus.objects.filter(user=request.user).first()
        return bool(trial and trial.remaining_days > 0)
