from rest_framework import serializers


class AIOptimizeSerializer(serializers.Serializer):
    resume_id = serializers.IntegerField()
    job_description_id = serializers.IntegerField()


class AIGenerationApplySerializer(serializers.Serializer):
    create_version = serializers.BooleanField(required=False, default=False)
