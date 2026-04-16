from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from billing.permissions import HasActiveAccess
from resumes.models import Resume, ResumeVersion, UploadedFile
from resumes.serializers import ResumeSerializer, ResumeVersionSerializer, UploadedFileSerializer


class ResumeViewSet(viewsets.ModelViewSet):
    serializer_class = ResumeSerializer
    permission_classes = [HasActiveAccess]

    def get_queryset(self):
        return Resume.objects.filter(user=self.request.user).order_by("-updated_at")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=["post"])
    def create_version(self, request, pk=None):
        resume = self.get_object()
        version = ResumeVersion.objects.create(resume=resume, content_json=resume.content_json)
        return Response(ResumeVersionSerializer(version).data)


class UploadedFileViewSet(viewsets.ModelViewSet):
    serializer_class = UploadedFileSerializer
    permission_classes = [HasActiveAccess]

    def get_queryset(self):
        return UploadedFile.objects.filter(resume__user=self.request.user)

    def perform_create(self, serializer):
        file_obj = self.request.FILES["file"]
        serializer.save(mime_type=file_obj.content_type)
