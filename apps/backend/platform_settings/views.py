from django.contrib.auth import get_user_model
from rest_framework import permissions, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from platform_settings.models import AdminContactMessage, PlatformSetting
from platform_settings.serializers import (
    AdminContactMessageAdminSerializer,
    AdminContactMessageSerializer,
    AdminOverviewSerializer,
    AdminUserSerializer,
    PlatformSettingSerializer,
)

User = get_user_model()


class IsPlatformAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and (request.user.is_staff or request.user.is_platform_admin))


class PlatformSettingViewSet(viewsets.ModelViewSet):
    queryset = PlatformSetting.objects.all()
    serializer_class = PlatformSettingSerializer
    permission_classes = [IsPlatformAdmin]


class AdminUsersViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = User.objects.all().order_by("-id")
    serializer_class = AdminUserSerializer
    permission_classes = [IsPlatformAdmin]


class AdminOverviewView(APIView):
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        data = {
            "users": User.objects.all()[:100],
        }
        return Response(AdminOverviewSerializer(data).data)


class AdminContactMessageViewSet(viewsets.ModelViewSet):
    queryset = AdminContactMessage.objects.all().order_by("-created_at")

    def get_serializer_class(self):
        if self.request.user.is_staff or self.request.user.is_platform_admin:
            return AdminContactMessageAdminSerializer
        return AdminContactMessageSerializer

    def get_permissions(self):
        if self.action in ["update", "partial_update", "destroy"]:
            return [IsPlatformAdmin()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        if self.request.user.is_staff or self.request.user.is_platform_admin:
            return AdminContactMessage.objects.all().order_by("-created_at")
        return AdminContactMessage.objects.filter(user=self.request.user).order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
