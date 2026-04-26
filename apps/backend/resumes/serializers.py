from rest_framework import serializers

from resumes.models import Resume, ResumeVersion, UploadedFile


class UploadedFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UploadedFile
        fields = "__all__"
        read_only_fields = ("mime_type", "extracted_text", "parsed_content_json", "parsed_at")

    def validate_resume(self, value):
        request = self.context.get("request")
        if request and value.user_id != request.user.id:
            raise serializers.ValidationError("You can upload files only to your own resume.")
        return value

    def validate_file(self, value):
        allowed_types = {
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "text/plain",
        }
        if value.content_type not in allowed_types:
            raise serializers.ValidationError("Unsupported file format.")
        return value


class ResumeSerializer(serializers.ModelSerializer):
    versions_count = serializers.IntegerField(source="versions.count", read_only=True)
    uploads_count = serializers.IntegerField(source="uploads.count", read_only=True)

    class Meta:
        model = Resume
        fields = "__all__"
        read_only_fields = ("user",)


class ResumeVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResumeVersion
        fields = "__all__"
        read_only_fields = ("resume",)


class ResumeAutosaveSerializer(serializers.Serializer):
    content_json = serializers.JSONField()


class ResumeVersionCreateSerializer(serializers.Serializer):
    content_json = serializers.JSONField(required=False)


class ResumeVersionRestoreSerializer(serializers.Serializer):
    version_id = serializers.IntegerField()


class UploadedFileParseSerializer(serializers.Serializer):
    pass


class UploadedFileApplyParsedSerializer(serializers.Serializer):
    create_version = serializers.BooleanField(required=False, default=False)
