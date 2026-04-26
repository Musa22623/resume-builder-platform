from rest_framework import status, viewsets

from billing.permissions import HasActiveAccess
from jobs.models import JobDescription
from jobs.serializers import JobDescriptionSerializer
from common.constants.messages import JOB_MESSAGES
from common.responses import success_response


class JobDescriptionViewSet(viewsets.ModelViewSet):
    serializer_class = JobDescriptionSerializer
    permission_classes = [HasActiveAccess]

    def get_queryset(self):
        return JobDescription.objects.filter(user=self.request.user).order_by("-created_at")

    def list(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_queryset(), many=True)
        return success_response(
            message=JOB_MESSAGES["LIST_SUCCESS"],
            data={"items": serializer.data},
            status=status.HTTP_200_OK,
        )

    def retrieve(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_object())
        return success_response(
            message=JOB_MESSAGES["DETAIL_SUCCESS"],
            data={"job_description": serializer.data},
            status=status.HTTP_200_OK,
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(user=request.user, parse_status="ok")
        return success_response(
            message=JOB_MESSAGES["CREATE_SUCCESS"],
            data={"job_description": serializer.data},
            status=status.HTTP_201_CREATED,
        )

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return success_response(
            message=JOB_MESSAGES["UPDATE_SUCCESS"],
            data={"job_description": serializer.data},
            status=status.HTTP_200_OK,
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return success_response(
            message=JOB_MESSAGES["DELETE_SUCCESS"],
            data={},
            status=status.HTTP_200_OK,
        )
