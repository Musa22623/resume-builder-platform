from rest_framework import serializers

from jobs.models import JobDescription


class JobDescriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobDescription
        fields = "__all__"
        read_only_fields = ("user", "parse_status")
