from django.contrib.auth import get_user_model
from django.db.models import Q
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound
from rest_framework.exceptions import ValidationError
from rest_framework.views import APIView

from ai_services.models import AIGenerationLog
from billing.models import (
    CryptoNetwork,
    CryptoPaymentRequest,
    CryptoWallet,
    Payment,
    PlanCryptoAvailability,
    SubscriptionPlan,
    TrialStatus,
    UserSubscription,
)
from billing.serializers import CryptoPaymentReviewSerializer
from billing.services import approve_crypto_payment_request, get_user_access_status, reject_crypto_payment_request
from common.constants.messages import ADMIN_MESSAGES, SUPPORT_MESSAGES
from common.responses import success_response
from platform_settings.models import (
    AdminActionLog,
    AdminContactMessage,
    PlatformSetting,
    SupportConversation,
    SupportMessage,
)
from platform_settings.serializers import (
    AdminActionLogSerializer,
    AdminContactMessageAdminSerializer,
    AdminContactMessageSerializer,
    AdminCryptoNetworkSerializer,
    AdminCryptoPaymentRequestSerializer,
    AdminCryptoPaymentReviewLogSerializer,
    AdminCryptoWalletSerializer,
    AdminOverviewSerializer,
    AdminPlanSerializer,
    AdminPlanCryptoAvailabilitySerializer,
    AdminUserDetailSerializer,
    AdminUserListSerializer,
    AdminUserTrialSerializer,
    AdminUserUpdateSerializer,
    PlatformSettingSerializer,
    SupportConversationCreateSerializer,
    SupportConversationDetailSerializer,
    SupportConversationListSerializer,
    SupportConversationUpdateSerializer,
    SupportMessageCreateSerializer,
    SupportMessageSerializer,
    TrialSettingsSerializer,
)
from platform_settings.services import (
    get_trial_settings,
    has_platform_admin_access,
    log_admin_action,
    mark_conversation_read,
    set_platform_setting,
    update_conversation_after_message,
)

User = get_user_model()


class IsPlatformAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return has_platform_admin_access(request.user)


class PlatformSettingViewSet(viewsets.ModelViewSet):
    queryset = PlatformSetting.objects.all().order_by("key")
    serializer_class = PlatformSettingSerializer
    permission_classes = [IsPlatformAdmin]

    def list(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_queryset(), many=True)
        return success_response(
            message=ADMIN_MESSAGES["SETTINGS_LIST_SUCCESS"],
            data={"items": serializer.data},
            status=status.HTTP_200_OK,
        )


class SupportConversationUserViewSet(viewsets.GenericViewSet):
    permission_classes = [permissions.IsAuthenticated]
    queryset = SupportConversation.objects.all().select_related("user", "assigned_admin").order_by("-last_message_at", "-updated_at")
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)

    def _serialize_conversation(self, conversation):
        return SupportConversationDetailSerializer(conversation, context={"reader": self.request.user}).data

    def list(self, request, *args, **kwargs):
        serializer = SupportConversationListSerializer(
            self.get_queryset(),
            many=True,
            context={"reader": request.user},
        )
        return success_response(
            message=SUPPORT_MESSAGES["CONVERSATIONS_LIST_SUCCESS"],
            data={"items": serializer.data},
            status=status.HTTP_200_OK,
        )

    def retrieve(self, request, *args, **kwargs):
        conversation = self.get_object()
        return success_response(
            message=SUPPORT_MESSAGES["CONVERSATION_DETAIL_SUCCESS"],
            data={"conversation": self._serialize_conversation(conversation)},
            status=status.HTTP_200_OK,
        )

    def create(self, request, *args, **kwargs):
        serializer = SupportConversationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        conversation = SupportConversation.objects.create(
            user=request.user,
            subject=serializer.validated_data.get("subject", ""),
            status="open",
        )
        message = SupportMessage.objects.create(
            conversation=conversation,
            sender=request.user,
            sender_role="user",
            message=serializer.validated_data["message"],
            is_internal_note=False,
        )
        update_conversation_after_message(conversation=conversation, message=message)
        mark_conversation_read(conversation=conversation, reader=request.user, last_message=message)
        return success_response(
            message=SUPPORT_MESSAGES["CONVERSATION_CREATE_SUCCESS"],
            data={"conversation": self._serialize_conversation(conversation)},
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["get", "post"], url_path="messages")
    def messages(self, request, pk=None):
        conversation = self.get_object()
        if request.method.lower() == "get":
            serializer = SupportMessageSerializer(conversation.messages.order_by("created_at"), many=True)
            return success_response(
                message=SUPPORT_MESSAGES["MESSAGES_LIST_SUCCESS"],
                data={"items": serializer.data},
                status=status.HTTP_200_OK,
            )

        serializer = SupportMessageCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message = SupportMessage.objects.create(
            conversation=conversation,
            sender=request.user,
            sender_role="user",
            message=serializer.validated_data["message"],
            is_internal_note=False,
        )
        update_conversation_after_message(conversation=conversation, message=message)
        mark_conversation_read(conversation=conversation, reader=request.user, last_message=message)
        return success_response(
            message=SUPPORT_MESSAGES["MESSAGE_CREATE_SUCCESS"],
            data={"message": SupportMessageSerializer(message).data},
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], url_path="mark-read")
    def mark_read(self, request, pk=None):
        conversation = self.get_object()
        mark_conversation_read(conversation=conversation, reader=request.user)
        return success_response(
            message=SUPPORT_MESSAGES["MARK_READ_SUCCESS"],
            data={},
            status=status.HTTP_200_OK,
        )


class AdminUsersViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().select_related("profile").order_by("-id")
    permission_classes = [IsPlatformAdmin]
    http_method_names = ["get", "patch", "head", "options"]

    def get_queryset(self):
        queryset = super().get_queryset()

        search = self.request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(
                Q(email__icontains=search)
                | Q(profile__full_name__icontains=search)
            )

        role = self.request.query_params.get("role", "").strip()
        if role:
            queryset = queryset.filter(role=role)

        is_active = self.request.query_params.get("is_active", "").strip().lower()
        if is_active in {"true", "false"}:
            queryset = queryset.filter(is_active=(is_active == "true"))

        access_type = self.request.query_params.get("access_type", "").strip()
        if access_type:
            user_ids = []
            for user in queryset:
                if get_user_access_status(user)["access_type"] == access_type:
                    user_ids.append(user.id)
            queryset = queryset.filter(id__in=user_ids)

        return queryset

    def get_serializer_class(self):
        if self.action == "partial_update":
            return AdminUserUpdateSerializer
        if self.action == "retrieve":
            return AdminUserDetailSerializer
        if self.action == "trial":
            return AdminUserTrialSerializer
        return AdminUserListSerializer

    def list(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_queryset(), many=True)
        return success_response(
            message=ADMIN_MESSAGES["USERS_LIST_SUCCESS"],
            data={"items": serializer.data},
            status=status.HTTP_200_OK,
        )

    def retrieve(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_object())
        return success_response(
            message=ADMIN_MESSAGES["USER_DETAIL_SUCCESS"],
            data={"user": serializer.data},
            status=status.HTTP_200_OK,
        )

    def partial_update(self, request, *args, **kwargs):
        user = self.get_object()
        before_payload = {
            "role": user.role,
            "is_active": user.is_active,
        }

        serializer = self.get_serializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        log_admin_action(
            actor=request.user,
            action_type="user.updated",
            target_type="user",
            target_id=str(user.id),
            before_payload=before_payload,
            after_payload={
                "role": user.role,
                "is_active": user.is_active,
            },
        )

        return success_response(
            message=ADMIN_MESSAGES["USER_UPDATE_SUCCESS"],
            data={"user": AdminUserDetailSerializer(user).data},
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["get"], url_path="access-status")
    def access_status(self, request, pk=None):
        user = self.get_object()
        return success_response(
            message=ADMIN_MESSAGES["USER_ACCESS_STATUS_SUCCESS"],
            data=get_user_access_status(user),
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["get", "patch"], url_path="trial")
    def trial(self, request, pk=None):
        user = self.get_object()

        if request.method.lower() == "get":
            trial = TrialStatus.objects.filter(user=user).first()
            if not trial:
                return success_response(
                    message=ADMIN_MESSAGES["USER_TRIAL_SUCCESS"],
                    data={"trial": None},
                    status=status.HTTP_200_OK,
                )
            return success_response(
                message=ADMIN_MESSAGES["USER_TRIAL_SUCCESS"],
                data={"trial": AdminUserTrialSerializer(trial).data},
                status=status.HTTP_200_OK,
            )

        trial_settings = get_trial_settings()
        trial, _ = TrialStatus.objects.get_or_create(
            user=user,
            defaults={"trial_days": trial_settings["default_trial_days"]},
        )
        before_payload = {
            "started_at": trial.started_at.isoformat() if trial.started_at else None,
            "trial_days": trial.trial_days,
        }

        serializer = AdminUserTrialSerializer(trial, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        log_admin_action(
            actor=request.user,
            action_type="trial.user_override.updated",
            target_type="trial_status",
            target_id=str(trial.id),
            before_payload=before_payload,
            after_payload={
                "started_at": trial.started_at.isoformat() if trial.started_at else None,
                "trial_days": trial.trial_days,
            },
        )

        return success_response(
            message=ADMIN_MESSAGES["USER_TRIAL_UPDATE_SUCCESS"],
            data={"trial": AdminUserTrialSerializer(trial).data},
            status=status.HTTP_200_OK,
        )


class AdminPlansViewSet(viewsets.ModelViewSet):
    queryset = SubscriptionPlan.objects.all().order_by("display_order", "id")
    serializer_class = AdminPlanSerializer
    permission_classes = [IsPlatformAdmin]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        queryset = super().get_queryset()
        status_filter = self.request.query_params.get("status", "").strip()
        if status_filter == "active":
            queryset = queryset.filter(active=True, is_archived=False)
        elif status_filter == "inactive":
            queryset = queryset.filter(active=False, is_archived=False)
        elif status_filter == "archived":
            queryset = queryset.filter(is_archived=True)

        plan_type = self.request.query_params.get("plan_type", "").strip()
        if plan_type:
            queryset = queryset.filter(plan_type=plan_type)

        search = self.request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(name__icontains=search)

        return queryset

    def _validate_plan_payload(self, data):
        plan_type = data.get("plan_type")
        billing_interval = data.get("billing_interval", "")
        stripe_price_id = data.get("stripe_price_id", "")

        if plan_type in {"monthly", "yearly"} and not stripe_price_id:
            raise ValidationError(
                {
                    "code": "PLAN_STRIPE_PRICE_REQUIRED",
                    "message": "Stripe price id is required for subscription plans.",
                }
            )

        if plan_type == "monthly" and billing_interval and billing_interval != "month":
            raise ValidationError(
                {
                    "code": "INVALID_BILLING_INTERVAL",
                    "message": "Monthly plans must use billing_interval='month'.",
                }
            )

        if plan_type == "yearly" and billing_interval and billing_interval != "year":
            raise ValidationError(
                {
                    "code": "INVALID_BILLING_INTERVAL",
                    "message": "Yearly plans must use billing_interval='year'.",
                }
            )

    def list(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_queryset(), many=True)
        return success_response(
            message=ADMIN_MESSAGES["PLANS_LIST_SUCCESS"],
            data={"items": serializer.data},
            status=status.HTTP_200_OK,
        )

    def retrieve(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_object())
        return success_response(
            message=ADMIN_MESSAGES["PLAN_DETAIL_SUCCESS"],
            data={"plan": serializer.data},
            status=status.HTTP_200_OK,
        )

    def create(self, request, *args, **kwargs):
        self._validate_plan_payload(request.data)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        log_admin_action(
            actor=request.user,
            action_type="plan.created",
            target_type="subscription_plan",
            target_id=str(serializer.instance.id),
            before_payload={},
            after_payload=serializer.data,
        )

        return success_response(
            message=ADMIN_MESSAGES["PLAN_CREATE_SUCCESS"],
            data={"plan": serializer.data},
            status=status.HTTP_201_CREATED,
        )

    def partial_update(self, request, *args, **kwargs):
        plan = self.get_object()
        before_payload = AdminPlanSerializer(plan).data
        merged_data = {**before_payload, **request.data}
        self._validate_plan_payload(merged_data)

        serializer = self.get_serializer(plan, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        log_admin_action(
            actor=request.user,
            action_type="plan.updated",
            target_type="subscription_plan",
            target_id=str(plan.id),
            before_payload=before_payload,
            after_payload=AdminPlanSerializer(plan).data,
        )

        return success_response(
            message=ADMIN_MESSAGES["PLAN_UPDATE_SUCCESS"],
            data={"plan": AdminPlanSerializer(plan).data},
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"])
    def activate(self, request, pk=None):
        plan = self.get_object()
        before_payload = {"active": plan.active, "is_archived": plan.is_archived}
        plan.active = True
        plan.is_archived = False
        plan.save(update_fields=["active", "is_archived"])

        log_admin_action(
            actor=request.user,
            action_type="plan.activated",
            target_type="subscription_plan",
            target_id=str(plan.id),
            before_payload=before_payload,
            after_payload={"active": plan.active, "is_archived": plan.is_archived},
        )

        return success_response(
            message=ADMIN_MESSAGES["PLAN_ACTIVATE_SUCCESS"],
            data={"plan": AdminPlanSerializer(plan).data},
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"])
    def deactivate(self, request, pk=None):
        plan = self.get_object()
        before_payload = {"active": plan.active, "is_archived": plan.is_archived}
        plan.active = False
        plan.save(update_fields=["active"])

        log_admin_action(
            actor=request.user,
            action_type="plan.deactivated",
            target_type="subscription_plan",
            target_id=str(plan.id),
            before_payload=before_payload,
            after_payload={"active": plan.active, "is_archived": plan.is_archived},
        )

        return success_response(
            message=ADMIN_MESSAGES["PLAN_DEACTIVATE_SUCCESS"],
            data={"plan": AdminPlanSerializer(plan).data},
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"])
    def archive(self, request, pk=None):
        plan = self.get_object()
        before_payload = {"active": plan.active, "is_archived": plan.is_archived}
        plan.active = False
        plan.is_archived = True
        plan.save(update_fields=["active", "is_archived"])

        log_admin_action(
            actor=request.user,
            action_type="plan.archived",
            target_type="subscription_plan",
            target_id=str(plan.id),
            before_payload=before_payload,
            after_payload={"active": plan.active, "is_archived": plan.is_archived},
        )

        return success_response(
            message=ADMIN_MESSAGES["PLAN_ARCHIVE_SUCCESS"],
            data={"plan": AdminPlanSerializer(plan).data},
            status=status.HTTP_200_OK,
        )


class AdminCryptoNetworkViewSet(viewsets.ModelViewSet):
    queryset = CryptoNetwork.objects.all().order_by("sort_order", "id")
    serializer_class = AdminCryptoNetworkSerializer
    permission_classes = [IsPlatformAdmin]

    def list(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_queryset(), many=True)
        return success_response(
            message=ADMIN_MESSAGES["CRYPTO_NETWORKS_LIST_SUCCESS"],
            data={"items": serializer.data},
            status=status.HTTP_200_OK,
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        log_admin_action(
            actor=request.user,
            action_type="crypto.network.created",
            target_type="crypto_network",
            target_id=str(serializer.instance.id),
            before_payload={},
            after_payload=serializer.data,
        )
        return success_response(
            message=ADMIN_MESSAGES["CRYPTO_NETWORK_CREATE_SUCCESS"],
            data={"network": serializer.data},
            status=status.HTTP_201_CREATED,
        )

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        before_payload = AdminCryptoNetworkSerializer(instance).data
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        log_admin_action(
            actor=request.user,
            action_type="crypto.network.updated",
            target_type="crypto_network",
            target_id=str(instance.id),
            before_payload=before_payload,
            after_payload=AdminCryptoNetworkSerializer(instance).data,
        )
        return success_response(
            message=ADMIN_MESSAGES["CRYPTO_NETWORK_UPDATE_SUCCESS"],
            data={"network": serializer.data},
            status=status.HTTP_200_OK,
        )


class AdminCryptoWalletViewSet(viewsets.ModelViewSet):
    queryset = CryptoWallet.objects.all().select_related("network").order_by("network__sort_order", "id")
    serializer_class = AdminCryptoWalletSerializer
    permission_classes = [IsPlatformAdmin]

    def list(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_queryset(), many=True)
        return success_response(
            message=ADMIN_MESSAGES["CRYPTO_WALLETS_LIST_SUCCESS"],
            data={"items": serializer.data},
            status=status.HTTP_200_OK,
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        log_admin_action(
            actor=request.user,
            action_type="crypto.wallet.created",
            target_type="crypto_wallet",
            target_id=str(serializer.instance.id),
            before_payload={},
            after_payload=serializer.data,
        )
        return success_response(
            message=ADMIN_MESSAGES["CRYPTO_WALLET_CREATE_SUCCESS"],
            data={"wallet": serializer.data},
            status=status.HTTP_201_CREATED,
        )

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        before_payload = AdminCryptoWalletSerializer(instance).data
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        log_admin_action(
            actor=request.user,
            action_type="crypto.wallet.updated",
            target_type="crypto_wallet",
            target_id=str(instance.id),
            before_payload=before_payload,
            after_payload=AdminCryptoWalletSerializer(instance).data,
        )
        return success_response(
            message=ADMIN_MESSAGES["CRYPTO_WALLET_UPDATE_SUCCESS"],
            data={"wallet": serializer.data},
            status=status.HTTP_200_OK,
        )


class AdminPlanCryptoAvailabilityViewSet(viewsets.ModelViewSet):
    queryset = PlanCryptoAvailability.objects.all().select_related("plan", "network").order_by("plan__display_order", "id")
    serializer_class = AdminPlanCryptoAvailabilitySerializer
    permission_classes = [IsPlatformAdmin]

    def list(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_queryset(), many=True)
        return success_response(
            message=ADMIN_MESSAGES["CRYPTO_PLAN_AVAILABILITY_LIST_SUCCESS"],
            data={"items": serializer.data},
            status=status.HTTP_200_OK,
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        log_admin_action(
            actor=request.user,
            action_type="crypto.plan_availability.created",
            target_type="plan_crypto_availability",
            target_id=str(serializer.instance.id),
            before_payload={},
            after_payload=serializer.data,
        )
        return success_response(
            message=ADMIN_MESSAGES["CRYPTO_PLAN_AVAILABILITY_CREATE_SUCCESS"],
            data={"availability": serializer.data},
            status=status.HTTP_201_CREATED,
        )

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        before_payload = AdminPlanCryptoAvailabilitySerializer(instance).data
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        log_admin_action(
            actor=request.user,
            action_type="crypto.plan_availability.updated",
            target_type="plan_crypto_availability",
            target_id=str(instance.id),
            before_payload=before_payload,
            after_payload=AdminPlanCryptoAvailabilitySerializer(instance).data,
        )
        return success_response(
            message=ADMIN_MESSAGES["CRYPTO_PLAN_AVAILABILITY_UPDATE_SUCCESS"],
            data={"availability": serializer.data},
            status=status.HTTP_200_OK,
        )


class AdminCryptoPaymentRequestViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = (
        CryptoPaymentRequest.objects.all()
        .select_related("user", "plan", "network", "wallet", "reviewed_by", "payment")
        .order_by("-created_at")
    )
    serializer_class = AdminCryptoPaymentRequestSerializer
    permission_classes = [IsPlatformAdmin]

    def get_queryset(self):
        queryset = super().get_queryset()
        status_filter = self.request.query_params.get("status", "").strip()
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        plan_id = self.request.query_params.get("plan_id", "").strip()
        if plan_id:
            queryset = queryset.filter(plan_id=plan_id)

        network_id = self.request.query_params.get("network_id", "").strip()
        if network_id:
            queryset = queryset.filter(network_id=network_id)

        return queryset

    def list(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_queryset(), many=True)
        return success_response(
            message=ADMIN_MESSAGES["CRYPTO_PAYMENT_REQUESTS_LIST_SUCCESS"],
            data={"items": serializer.data},
            status=status.HTTP_200_OK,
        )

    def retrieve(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_object())
        return success_response(
            message=ADMIN_MESSAGES["CRYPTO_PAYMENT_REQUEST_DETAIL_SUCCESS"],
            data={"payment_request": serializer.data},
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        payment_request = self.get_object()
        serializer = CryptoPaymentReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            payment_request = approve_crypto_payment_request(
                payment_request=payment_request,
                admin_user=request.user,
                note=serializer.validated_data.get("note", ""),
            )
        except ValueError as exc:
            raise ValidationError({"code": "CRYPTO_PAYMENT_APPROVAL_INVALID", "message": str(exc)})

        return success_response(
            message=ADMIN_MESSAGES["CRYPTO_PAYMENT_REQUEST_APPROVE_SUCCESS"],
            data={"payment_request": AdminCryptoPaymentRequestSerializer(payment_request).data},
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        payment_request = self.get_object()
        serializer = CryptoPaymentReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            payment_request = reject_crypto_payment_request(
                payment_request=payment_request,
                admin_user=request.user,
                note=serializer.validated_data.get("note", ""),
            )
        except ValueError as exc:
            raise ValidationError({"code": "CRYPTO_PAYMENT_REJECTION_INVALID", "message": str(exc)})

        return success_response(
            message=ADMIN_MESSAGES["CRYPTO_PAYMENT_REQUEST_REJECT_SUCCESS"],
            data={"payment_request": AdminCryptoPaymentRequestSerializer(payment_request).data},
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["get"], url_path="review-logs")
    def review_logs(self, request, pk=None):
        payment_request = self.get_object()
        serializer = AdminCryptoPaymentReviewLogSerializer(payment_request.review_logs.all().order_by("-created_at"), many=True)
        return success_response(
            message=ADMIN_MESSAGES["CRYPTO_PAYMENT_REVIEW_LOGS_SUCCESS"],
            data={"items": serializer.data},
            status=status.HTTP_200_OK,
        )


class TrialSettingsView(APIView):
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        return success_response(
            message=ADMIN_MESSAGES["TRIAL_SETTINGS_SUCCESS"],
            data=TrialSettingsSerializer(get_trial_settings()).data,
            status=status.HTTP_200_OK,
        )

    def patch(self, request):
        current = get_trial_settings()
        serializer = TrialSettingsSerializer(data={**current, **request.data})
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data

        set_platform_setting("trial.enabled", str(validated["trial_enabled"]).lower())
        set_platform_setting("trial.default_days", validated["default_trial_days"])

        log_admin_action(
            actor=request.user,
            action_type="trial.default.updated",
            target_type="trial_setting",
            target_id="default",
            before_payload=current,
            after_payload=validated,
        )

        return success_response(
            message=ADMIN_MESSAGES["TRIAL_SETTINGS_UPDATE_SUCCESS"],
            data=validated,
            status=status.HTTP_200_OK,
        )


class AdminOverviewView(APIView):
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        users = User.objects.all()
        access_counts = {"trial": 0, "subscription": 0, "none": 0}
        for user in users:
            access_type = get_user_access_status(user)["access_type"]
            access_counts[access_type] = access_counts.get(access_type, 0) + 1

        payload = {
            "users": {
                "total": users.count(),
                "active": users.filter(is_active=True).count(),
                "inactive": users.filter(is_active=False).count(),
            },
            "access": access_counts,
            "billing": {
                "active_subscriptions": UserSubscription.objects.filter(is_active=True).count(),
                "payments_total": Payment.objects.count(),
                "payments_paid": Payment.objects.filter(status="paid").count(),
                "payments_failed": Payment.objects.filter(status="failed").count(),
            },
            "ai": {
                "generations_total": AIGenerationLog.objects.count(),
                "generations_success": AIGenerationLog.objects.filter(status="success").count(),
                "generations_failed": AIGenerationLog.objects.filter(status="failed").count(),
            },
        }
        return success_response(
            message=ADMIN_MESSAGES["OVERVIEW_SUCCESS"],
            data=AdminOverviewSerializer(payload).data,
            status=status.HTTP_200_OK,
        )


class AdminActionLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AdminActionLog.objects.all().select_related("actor").order_by("-created_at")
    serializer_class = AdminActionLogSerializer
    permission_classes = [IsPlatformAdmin]

    def list(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_queryset(), many=True)
        return success_response(
            message=ADMIN_MESSAGES["ACTION_LOGS_LIST_SUCCESS"],
            data={"items": serializer.data},
            status=status.HTTP_200_OK,
        )

    def retrieve(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_object())
        return success_response(
            message=ADMIN_MESSAGES["ACTION_LOG_DETAIL_SUCCESS"],
            data={"log": serializer.data},
            status=status.HTTP_200_OK,
        )


class AdminSupportConversationViewSet(viewsets.GenericViewSet):
    permission_classes = [IsPlatformAdmin]
    queryset = SupportConversation.objects.all().select_related("user", "assigned_admin").order_by("-last_message_at", "-updated_at")
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        queryset = self.queryset

        status_filter = self.request.query_params.get("status", "").strip()
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        assigned_admin = self.request.query_params.get("assigned_admin", "").strip()
        if assigned_admin:
            if assigned_admin == "unassigned":
                queryset = queryset.filter(assigned_admin__isnull=True)
            else:
                queryset = queryset.filter(assigned_admin_id=assigned_admin)

        search = self.request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(
                Q(subject__icontains=search)
                | Q(user__email__icontains=search)
                | Q(last_message_preview__icontains=search)
            )

        has_unread = self.request.query_params.get("has_unread", "").strip().lower()
        if has_unread in {"true", "false"}:
            filtered_ids = []
            for conversation in queryset:
                unread_count = SupportConversationListSerializer(
                    conversation,
                    context={"reader": self.request.user},
                ).data["unread_count"]
                if (has_unread == "true" and unread_count > 0) or (has_unread == "false" and unread_count == 0):
                    filtered_ids.append(conversation.id)
            queryset = queryset.filter(id__in=filtered_ids)

        return queryset

    def _serialize_conversation(self, conversation):
        return SupportConversationDetailSerializer(conversation, context={"reader": self.request.user}).data

    def list(self, request, *args, **kwargs):
        serializer = SupportConversationListSerializer(
            self.get_queryset(),
            many=True,
            context={"reader": request.user},
        )
        return success_response(
            message=ADMIN_MESSAGES["SUPPORT_CONVERSATIONS_LIST_SUCCESS"],
            data={"items": serializer.data},
            status=status.HTTP_200_OK,
        )

    def retrieve(self, request, *args, **kwargs):
        conversation = self.get_object()
        return success_response(
            message=ADMIN_MESSAGES["SUPPORT_CONVERSATION_DETAIL_SUCCESS"],
            data={"conversation": self._serialize_conversation(conversation)},
            status=status.HTTP_200_OK,
        )

    def partial_update(self, request, *args, **kwargs):
        conversation = self.get_object()
        before_payload = {
            "status": conversation.status,
            "assigned_admin_id": conversation.assigned_admin_id,
            "closed_at": conversation.closed_at.isoformat() if conversation.closed_at else None,
        }
        serializer = SupportConversationUpdateSerializer(conversation, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        if "status" in serializer.validated_data:
            conversation.closed_at = timezone.now() if conversation.status == "closed" else None
            conversation.save(update_fields=["closed_at", "updated_at"])

        log_admin_action(
            actor=request.user,
            action_type="support.conversation.updated",
            target_type="support_conversation",
            target_id=str(conversation.id),
            before_payload=before_payload,
            after_payload={
                "status": conversation.status,
                "assigned_admin_id": conversation.assigned_admin_id,
                "closed_at": conversation.closed_at.isoformat() if conversation.closed_at else None,
            },
        )
        return success_response(
            message=ADMIN_MESSAGES["SUPPORT_CONVERSATION_UPDATE_SUCCESS"],
            data={"conversation": self._serialize_conversation(conversation)},
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["get", "post"], url_path="messages")
    def messages(self, request, pk=None):
        conversation = self.get_object()
        if request.method.lower() == "get":
            serializer = SupportMessageSerializer(conversation.messages.order_by("created_at"), many=True)
            return success_response(
                message=ADMIN_MESSAGES["SUPPORT_MESSAGES_LIST_SUCCESS"],
                data={"items": serializer.data},
                status=status.HTTP_200_OK,
            )

        serializer = SupportMessageCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message = SupportMessage.objects.create(
            conversation=conversation,
            sender=request.user,
            sender_role="admin",
            message=serializer.validated_data["message"],
            is_internal_note=serializer.validated_data.get("is_internal_note", False),
        )
        if conversation.assigned_admin_id is None:
            conversation.assigned_admin = request.user
            conversation.save(update_fields=["assigned_admin", "updated_at"])
        update_conversation_after_message(conversation=conversation, message=message)
        mark_conversation_read(conversation=conversation, reader=request.user, last_message=message)
        log_admin_action(
            actor=request.user,
            action_type="support.message.created",
            target_type="support_conversation",
            target_id=str(conversation.id),
            before_payload={},
            after_payload={
                "message_id": message.id,
                "is_internal_note": message.is_internal_note,
            },
        )
        return success_response(
            message=ADMIN_MESSAGES["SUPPORT_MESSAGE_CREATE_SUCCESS"],
            data={"message": SupportMessageSerializer(message).data},
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], url_path="mark-read")
    def mark_read(self, request, pk=None):
        conversation = self.get_object()
        mark_conversation_read(conversation=conversation, reader=request.user)
        return success_response(
            message=ADMIN_MESSAGES["SUPPORT_MARK_READ_SUCCESS"],
            data={},
            status=status.HTTP_200_OK,
        )


class AdminContactMessageViewSet(viewsets.ModelViewSet):
    queryset = AdminContactMessage.objects.all().order_by("-created_at")

    def get_serializer_class(self):
        if has_platform_admin_access(self.request.user):
            return AdminContactMessageAdminSerializer
        return AdminContactMessageSerializer

    def get_permissions(self):
        if self.action in ["update", "partial_update", "destroy"]:
            return [IsPlatformAdmin()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        if has_platform_admin_access(self.request.user):
            return AdminContactMessage.objects.all().order_by("-created_at")
        return AdminContactMessage.objects.filter(user=self.request.user).order_by("-created_at")

    def list(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_queryset(), many=True)
        return success_response(
            message=ADMIN_MESSAGES["CONTACT_MESSAGES_LIST_SUCCESS"],
            data={"items": serializer.data},
            status=status.HTTP_200_OK,
        )

    def retrieve(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_object())
        return success_response(
            message=ADMIN_MESSAGES["CONTACT_MESSAGE_DETAIL_SUCCESS"],
            data={"message": serializer.data},
            status=status.HTTP_200_OK,
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return success_response(
            message=ADMIN_MESSAGES["CONTACT_MESSAGE_CREATE_SUCCESS"],
            data={"message": serializer.data},
            status=status.HTTP_201_CREATED,
        )

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return success_response(
            message=ADMIN_MESSAGES["CONTACT_MESSAGE_UPDATE_SUCCESS"],
            data={"message": serializer.data},
            status=status.HTTP_200_OK,
        )

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
