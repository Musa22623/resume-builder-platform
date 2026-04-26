from rest_framework import serializers

from jobs.models import JobDescription


class JobDescriptionSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        source_type = attrs.get("source_type", getattr(self.instance, "source_type", None))
        job_link = attrs.get("job_link", getattr(self.instance, "job_link", ""))
        raw_text = attrs.get("raw_text", getattr(self.instance, "raw_text", ""))
        job_title = attrs.get("job_title", getattr(self.instance, "job_title", ""))

        if not (job_title or "").strip():
            raise serializers.ValidationError({"job_title": "Job title is required."})

        if source_type == "manual" and not (raw_text or "").strip():
            raise serializers.ValidationError({"raw_text": "Job description text is required for manual entry."})

        if source_type == "link" and not (job_link or "").strip():
            raise serializers.ValidationError({"job_link": "Job link is required for link entry."})

        return attrs

    class Meta:
        model = JobDescription
        fields = "__all__"
        read_only_fields = ("user", "parse_status")
        extra_kwargs = {
            "job_link": {"required": False, "allow_blank": True},
            "raw_text": {"required": False, "allow_blank": True},
        }
