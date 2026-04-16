from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from ai_services.models import AIGenerationLog
from ai_services.serializers import AIOptimizeSerializer
from ai_services.services import optimize_resume_content
from billing.permissions import HasActiveAccess
from jobs.models import JobDescription
from resumes.models import Resume


class OptimizeResumeView(APIView):
    permission_classes = [HasActiveAccess]

    def post(self, request):
        serializer = AIOptimizeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        resume = Resume.objects.get(id=serializer.validated_data["resume_id"], user=request.user)
        job = JobDescription.objects.get(id=serializer.validated_data["job_description_id"], user=request.user)

        try:
            optimized = optimize_resume_content(resume.content_json, job.raw_text)
            AIGenerationLog.objects.create(
                user=request.user,
                resume=resume,
                job_description=job,
                request_payload={"resume_id": resume.id, "job_description_id": job.id},
                response_payload=optimized,
                status="success",
            )
            return Response(optimized)
        except Exception as exc:
            AIGenerationLog.objects.create(
                user=request.user,
                resume=resume,
                job_description=job,
                request_payload={"resume_id": resume.id, "job_description_id": job.id},
                response_payload={"error": str(exc)},
                status="failed",
            )
            return Response({"detail": "AI optimization failed."}, status=status.HTTP_502_BAD_GATEWAY)
