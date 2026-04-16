from rest_framework import serializers

from resumes.models import Resume, ResumeVersion, UploadedFile


class UploadedFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UploadedFile
        fields = "__all__"
        read_only_fields = ("mime_type",)

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
    class Meta:
        model = Resume
        fields = "__all__"
        read_only_fields = ("user",)


class ResumeVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResumeVersion
        fields = "__all__"
