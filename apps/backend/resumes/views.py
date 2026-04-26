from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, ValidationError

from billing.permissions import HasActiveAccess
from resumes.models import Resume, ResumeVersion, UploadedFile
from resumes.serializers import (
    ResumeAutosaveSerializer,
    ResumeSerializer,
    UploadedFileApplyParsedSerializer,
    UploadedFileParseSerializer,
    ResumeVersionCreateSerializer,
    ResumeVersionRestoreSerializer,
    ResumeVersionSerializer,
    UploadedFileSerializer,
)
from common.constants.messages import RESUME_MESSAGES
from common.responses import success_response
from resumes.services import extract_text_from_uploaded_file, parse_resume_text_to_content


class ResumeViewSet(viewsets.ModelViewSet):
    serializer_class = ResumeSerializer
    permission_classes = [HasActiveAccess]

    def get_queryset(self):
        return Resume.objects.filter(user=self.request.user).order_by("-updated_at")

    def list(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_queryset(), many=True)
        return success_response(
            message=RESUME_MESSAGES["LIST_SUCCESS"],
            data={"items": serializer.data},
            status=status.HTTP_200_OK,
        )

    def retrieve(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_object())
        return success_response(
            message=RESUME_MESSAGES["DETAIL_SUCCESS"],
            data={"resume": serializer.data},
            status=status.HTTP_200_OK,
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return success_response(
            message=RESUME_MESSAGES["CREATE_SUCCESS"],
            data={"resume": serializer.data},
            status=status.HTTP_201_CREATED,
        )

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return success_response(
            message=RESUME_MESSAGES["UPDATE_SUCCESS"],
            data={"resume": serializer.data},
            status=status.HTTP_200_OK,
        )

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=["post"])
    def create_version(self, request, pk=None):
        resume = self.get_object()
        serializer = ResumeVersionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        version_content = serializer.validated_data.get("content_json", resume.content_json)
        version = ResumeVersion.objects.create(resume=resume, content_json=version_content)
        return success_response(
            message=RESUME_MESSAGES["VERSION_CREATED"],
            data={"version": ResumeVersionSerializer(version).data},
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"])
    def autosave(self, request, pk=None):
        resume = self.get_object()
        serializer = ResumeAutosaveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        resume.content_json = serializer.validated_data["content_json"]
        resume.is_draft = True
        resume.save(update_fields=["content_json", "is_draft", "updated_at"])
        return success_response(
            message=RESUME_MESSAGES["AUTOSAVE_SUCCESS"],
            data={"resume": ResumeSerializer(resume).data},
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["get"])
    def versions(self, request, pk=None):
        resume = self.get_object()
        versions = resume.versions.all().order_by("-created_at")
        return success_response(
            message=RESUME_MESSAGES["VERSIONS_LIST_SUCCESS"],
            data={"items": ResumeVersionSerializer(versions, many=True).data},
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["get"], url_path=r"versions/(?P<version_id>\d+)")
    def version_detail(self, request, pk=None, version_id=None):
        resume = self.get_object()
        version = resume.versions.filter(id=version_id).first()
        if not version:
            raise NotFound("Resume version not found.")
        return success_response(
            message=RESUME_MESSAGES["VERSION_DETAIL_SUCCESS"],
            data={"version": ResumeVersionSerializer(version).data},
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"])
    def restore_version(self, request, pk=None):
        resume = self.get_object()
        serializer = ResumeVersionRestoreSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        version = resume.versions.filter(id=serializer.validated_data["version_id"]).first()
        if not version:
            raise NotFound("Resume version not found.")
        resume.content_json = version.content_json
        resume.is_draft = True
        resume.save(update_fields=["content_json", "is_draft", "updated_at"])
        return success_response(
            message=RESUME_MESSAGES["VERSION_RESTORED"],
            data={
                "resume": ResumeSerializer(resume).data,
                "restored_version": ResumeVersionSerializer(version).data,
            },
            status=status.HTTP_200_OK,
        )


class UploadedFileViewSet(viewsets.ModelViewSet):
    serializer_class = UploadedFileSerializer
    permission_classes = [HasActiveAccess]

    def get_queryset(self):
        return UploadedFile.objects.filter(resume__user=self.request.user)

    def list(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_queryset(), many=True)
        return success_response(
            message=RESUME_MESSAGES["UPLOAD_LIST_SUCCESS"],
            data={"items": serializer.data},
            status=status.HTTP_200_OK,
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return success_response(
            message=RESUME_MESSAGES["UPLOAD_CREATE_SUCCESS"],
            data={"upload": serializer.data},
            status=status.HTTP_201_CREATED,
        )

    def perform_create(self, serializer):
        file_obj = self.request.FILES["file"]
        serializer.save(mime_type=file_obj.content_type)

    @action(detail=True, methods=["post"])
    def parse(self, request, pk=None):
        upload = self.get_object()
        serializer = UploadedFileParseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            extracted_text = extract_text_from_uploaded_file(upload)
        except ValueError as exc:
            raise ValidationError(str(exc))

        parsed_content = parse_resume_text_to_content(extracted_text)
        upload.extracted_text = extracted_text
        upload.parsed_content_json = parsed_content
        upload.parsed_at = timezone.now()
        upload.save(update_fields=["extracted_text", "parsed_content_json", "parsed_at"])

        return success_response(
            message=RESUME_MESSAGES["UPLOAD_PARSE_SUCCESS"],
            data={
                "upload": UploadedFileSerializer(upload).data,
                "parsed_content": parsed_content,
                "extracted_text": extracted_text,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="apply-parsed")
    def apply_parsed(self, request, pk=None):
        upload = self.get_object()
        serializer = UploadedFileApplyParsedSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if not upload.parsed_content_json:
            raise ValidationError("No parsed content is available for this upload. Run parse first.")

        resume = upload.resume
        if serializer.validated_data["create_version"]:
            ResumeVersion.objects.create(resume=resume, content_json=resume.content_json)

        resume.content_json = upload.parsed_content_json
        resume.is_draft = True
        resume.save(update_fields=["content_json", "is_draft", "updated_at"])

        return success_response(
            message=RESUME_MESSAGES["UPLOAD_PARSED_APPLY_SUCCESS"],
            data={
                "upload": UploadedFileSerializer(upload).data,
                "resume": ResumeSerializer(resume).data,
            },
            status=status.HTTP_200_OK,
        )
