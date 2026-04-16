from rest_framework import status, viewsets
from rest_framework.response import Response

from billing.permissions import HasActiveAccess
from jobs.models import JobDescription
from jobs.serializers import JobDescriptionSerializer


class JobDescriptionViewSet(viewsets.ModelViewSet):
    serializer_class = JobDescriptionSerializer
    permission_classes = [HasActiveAccess]

    def get_queryset(self):
        return JobDescription.objects.filter(user=self.request.user).order_by("-created_at")

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        if data.get("source_type") == "link" and not data.get("raw_text"):
            return Response(
                {"detail": "Could not parse job link. Paste job description manually."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save(user=request.user, parse_status="ok")
        return Response(serializer.data, status=status.HTTP_201_CREATED)
