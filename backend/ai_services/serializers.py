from rest_framework import serializers


class AIOptimizeSerializer(serializers.Serializer):
    resume_id = serializers.IntegerField()
    job_description_id = serializers.IntegerField()
