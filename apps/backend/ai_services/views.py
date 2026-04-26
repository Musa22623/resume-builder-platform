from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.views import APIView

from ai_services.models import AIGenerationLog
from ai_services.serializers import AIGenerationApplySerializer, AIOptimizeSerializer
from ai_services.services import optimize_resume_content
from billing.permissions import HasActiveAccess
from jobs.models import JobDescription
from resumes.models import Resume
from resumes.serializers import ResumeSerializer, ResumeVersionSerializer
from resumes.models import ResumeVersion
from common.constants.messages import AI_MESSAGES
from common.responses import error_response, success_response


class OptimizeResumeView(APIView):
    permission_classes = [HasActiveAccess]

    def post(self, request):
        serializer = AIOptimizeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        resume = get_object_or_404(Resume, id=serializer.validated_data["resume_id"], user=request.user)
        job = get_object_or_404(JobDescription, id=serializer.validated_data["job_description_id"], user=request.user)

        try:
            optimized = optimize_resume_content(resume.content_json, job.raw_text)
            generation = AIGenerationLog.objects.create(
                user=request.user,
                resume=resume,
                job_description=job,
                request_payload={"resume_id": resume.id, "job_description_id": job.id},
                response_payload=optimized,
                status="success",
            )
            return success_response(
                message=AI_MESSAGES["OPTIMIZE_SUCCESS"],
                data={
                    "generation": {
                        "id": generation.id,
                        "status": generation.status,
                        "created_at": generation.created_at,
                    },
                    "optimized_content": optimized["optimized_content"],
                    "change_summary": optimized["change_summary"],
                    "usage": optimized["usage"],
                },
                status=status.HTTP_200_OK,
            )
        except Exception as exc:
            generation = AIGenerationLog.objects.create(
                user=request.user,
                resume=resume,
                job_description=job,
                request_payload={"resume_id": resume.id, "job_description_id": job.id},
                response_payload={"error": str(exc)},
                status="failed",
            )
            return error_response(
                error={
                    "code": "AI_OPTIMIZATION_FAILED",
                    "message": str(exc),
                    "generation_id": generation.id,
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )


class AIGenerationDetailView(APIView):
    permission_classes = [HasActiveAccess]

    def get(self, request, generation_id):
        generation = get_object_or_404(AIGenerationLog, id=generation_id, user=request.user)
        return success_response(
            message=AI_MESSAGES["GENERATION_DETAIL_SUCCESS"],
            data={
                "generation": {
                    "id": generation.id,
                    "status": generation.status,
                    "created_at": generation.created_at,
                    "resume_id": generation.resume_id,
                    "job_description_id": generation.job_description_id,
                    "response_payload": generation.response_payload,
                }
            },
            status=status.HTTP_200_OK,
        )


class ApplyAIGenerationView(APIView):
    permission_classes = [HasActiveAccess]

    def post(self, request, generation_id):
        generation = get_object_or_404(AIGenerationLog, id=generation_id, user=request.user)
        serializer = AIGenerationApplySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        optimized_content = generation.response_payload.get("optimized_content")
        if not optimized_content:
            raise ValidationError("No optimized content is available for this generation.")

        created_version = None
        resume = generation.resume
        if serializer.validated_data["create_version"]:
            created_version = ResumeVersion.objects.create(resume=resume, content_json=resume.content_json)

        resume.content_json = optimized_content
        resume.is_draft = True
        resume.save(update_fields=["content_json", "is_draft", "updated_at"])

        generation.status = "applied"
        generation.save(update_fields=["status"])

        data = {
            "generation": {
                "id": generation.id,
                "status": generation.status,
            },
            "resume": ResumeSerializer(resume).data,
        }
        if created_version:
            data["version"] = ResumeVersionSerializer(created_version).data

        return success_response(
            message=AI_MESSAGES["APPLY_SUCCESS"],
            data=data,
            status=status.HTTP_200_OK,
        )
