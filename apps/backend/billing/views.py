import stripe
from django.http import HttpResponse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound
from rest_framework.exceptions import ValidationError
from rest_framework.views import APIView

from billing.models import (
    CryptoNetwork,
    CryptoPaymentRequest,
    CryptoWallet,
    Payment,
    SubscriptionPlan,
    TrialStatus,
    UserSubscription,
)
from billing.serializers import (
    AccessStatusSerializer,
    CryptoNetworkPublicSerializer,
    CryptoPaymentRequestCreateSerializer,
    CryptoPaymentRequestSerializer,
    CryptoPaymentSubmissionSerializer,
    PaymentSerializer,
    StripeCheckoutSessionSerializer,
    SubscriptionPlanSerializer,
    TrialStatusSerializer,
    UserSubscriptionSerializer,
)
from billing.services import (
    build_wallet_qr_payload,
    build_crypto_payment_info,
    create_crypto_payment_request,
    construct_stripe_event,
    create_stripe_checkout_session,
    get_user_access_status,
    get_crypto_networks_for_plan,
    handle_stripe_webhook_event,
    submit_crypto_payment_request,
)
from common.constants.messages import BILLING_MESSAGES
from common.responses import success_response
from platform_settings.services import get_trial_settings


class SubscriptionPlanViewSet(viewsets.ModelViewSet):
    serializer_class = SubscriptionPlanSerializer

    def get_queryset(self):
        queryset = SubscriptionPlan.objects.all().order_by("display_order", "id")
        if self.request.user.is_staff:
            return queryset
        return queryset.filter(active=True, is_archived=False)

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAdminUser()]

    def list(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_queryset(), many=True)
        return success_response(
            message=BILLING_MESSAGES["PLANS_LIST_SUCCESS"],
            data={"items": serializer.data},
            status=status.HTTP_200_OK,
        )


class PaymentViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PaymentSerializer

    def get_queryset(self):
        if self.request.user.is_staff:
            return Payment.objects.all()
        return Payment.objects.filter(user=self.request.user)


class UserSubscriptionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = UserSubscriptionSerializer

    def get_queryset(self):
        if self.request.user.is_staff:
            return UserSubscription.objects.all()
        return UserSubscription.objects.filter(user=self.request.user)


class TrialStatusViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = TrialStatusSerializer

    def get_queryset(self):
        return TrialStatus.objects.filter(user=self.request.user)

    @action(detail=False, methods=["get"])
    def me(self, request):
        trial = TrialStatus.objects.filter(user=request.user).first()
        if not trial:
            trial_settings = get_trial_settings()
            if trial_settings["trial_enabled"]:
                trial = TrialStatus.objects.create(
                    user=request.user,
                    trial_days=trial_settings["default_trial_days"],
                )
        return success_response(
            message=BILLING_MESSAGES["ACCESS_STATUS_SUCCESS"],
            data=self.get_serializer(trial).data if trial else None,
            status=status.HTTP_200_OK,
        )


class StripeCheckoutSessionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = StripeCheckoutSessionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        plan = None
        plan_id = serializer.validated_data.get("plan_id")
        plan_type = serializer.validated_data.get("plan_type")

        if plan_id is not None:
            try:
                plan = SubscriptionPlan.objects.get(id=plan_id, active=True, is_archived=False)
            except SubscriptionPlan.DoesNotExist:
                raise ValidationError(
                    {
                        "code": "INVALID_PLAN",
                        "message": "Selected plan does not exist or is not active.",
                    }
                )
        elif plan_type:
            plan = (
                SubscriptionPlan.objects.filter(active=True, is_archived=False, plan_type=plan_type)
                .order_by("display_order", "id")
                .first()
            )
            if not plan:
                raise ValidationError(
                    {
                        "code": "INVALID_PLAN",
                        "message": "No active subscription plan is configured for this plan type.",
                    }
                )
        else:
            raise ValidationError(
                {
                    "code": "INVALID_PLAN_SELECTION",
                    "message": "Either plan_id or plan_type is required.",
                }
            )

        try:
            checkout_url = create_stripe_checkout_session(
                user_email=request.user.email,
                user_id=request.user.id,
                plan=plan,
            )
        except ValueError as exc:
            raise ValidationError(
                {
                    "code": "CHECKOUT_CONFIGURATION_ERROR",
                    "message": str(exc),
                }
            )

        return success_response(
            message=BILLING_MESSAGES["CHECKOUT_SESSION_SUCCESS"],
            data={
                "checkout_url": checkout_url,
                "plan": SubscriptionPlanSerializer(plan).data,
            },
            status=status.HTTP_200_OK,
        )


class CryptoPaymentInfoView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        info = build_crypto_payment_info()
        return success_response(
            message=BILLING_MESSAGES["CRYPTO_WALLETS_SUCCESS"],
            data={"wallets": info},
            status=status.HTTP_200_OK,
        )


class CryptoPlanWalletsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, plan_id):
        plan = SubscriptionPlan.objects.filter(id=plan_id, active=True, is_archived=False).first()
        if not plan:
            raise NotFound("Subscription plan not found.")

        networks, wallet_map = get_crypto_networks_for_plan(plan)
        serializer = CryptoNetworkPublicSerializer(
            networks,
            many=True,
            context={
                "wallet_map": wallet_map,
                "qr_payload_builder": build_wallet_qr_payload,
            },
        )
        return success_response(
            message=BILLING_MESSAGES["CRYPTO_WALLETS_SUCCESS"],
            data={
                "plan": SubscriptionPlanSerializer(plan).data,
                "networks": serializer.data,
            },
            status=status.HTTP_200_OK,
        )


class CryptoPaymentRequestViewSet(viewsets.ModelViewSet):
    serializer_class = CryptoPaymentRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        return (
            CryptoPaymentRequest.objects.filter(user=self.request.user)
            .select_related("plan", "network", "wallet", "reviewed_by", "payment")
            .order_by("-created_at")
        )

    def list(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_queryset(), many=True)
        return success_response(
            message=BILLING_MESSAGES["CRYPTO_PAYMENT_REQUEST_LIST_SUCCESS"],
            data={"items": serializer.data},
            status=status.HTTP_200_OK,
        )

    def retrieve(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_object())
        return success_response(
            message=BILLING_MESSAGES["CRYPTO_PAYMENT_REQUEST_DETAIL_SUCCESS"],
            data={"payment_request": serializer.data},
            status=status.HTTP_200_OK,
        )

    def create(self, request, *args, **kwargs):
        serializer = CryptoPaymentRequestCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        plan = SubscriptionPlan.objects.filter(
            id=serializer.validated_data["plan_id"],
            active=True,
            is_archived=False,
        ).first()
        if not plan:
            raise ValidationError(
                {
                    "code": "INVALID_PLAN",
                    "message": "Selected plan does not exist or is not active.",
                }
            )

        network = CryptoNetwork.objects.filter(
            id=serializer.validated_data["network_id"],
            is_active=True,
        ).first()
        if not network:
            raise ValidationError(
                {
                    "code": "INVALID_CRYPTO_NETWORK",
                    "message": "Selected crypto network does not exist or is not active.",
                }
            )

        wallet = None
        wallet_id = serializer.validated_data.get("wallet_id")
        if wallet_id is not None:
            wallet = CryptoWallet.objects.filter(id=wallet_id).select_related("network").first()
            if not wallet:
                raise ValidationError(
                    {
                        "code": "INVALID_CRYPTO_WALLET",
                        "message": "Selected crypto wallet does not exist.",
                    }
                )

        try:
            payment_request = create_crypto_payment_request(
                user=request.user,
                plan=plan,
                network=network,
                wallet=wallet,
            )
        except ValueError as exc:
            raise ValidationError(
                {
                    "code": "CRYPTO_PAYMENT_REQUEST_INVALID",
                    "message": str(exc),
                }
            )

        return success_response(
            message=BILLING_MESSAGES["CRYPTO_PAYMENT_REQUEST_CREATE_SUCCESS"],
            data={"payment_request": CryptoPaymentRequestSerializer(payment_request).data},
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], url_path="submit-transaction")
    def submit_transaction(self, request, pk=None):
        payment_request = self.get_object()
        serializer = CryptoPaymentSubmissionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            payment_request = submit_crypto_payment_request(
                payment_request=payment_request,
                transaction_hash=serializer.validated_data["transaction_hash"],
                sender_address=serializer.validated_data.get("sender_address", ""),
            )
        except ValueError as exc:
            raise ValidationError(
                {
                    "code": "CRYPTO_PAYMENT_SUBMISSION_INVALID",
                    "message": str(exc),
                }
            )

        return success_response(
            message=BILLING_MESSAGES["CRYPTO_PAYMENT_REQUEST_SUBMIT_SUCCESS"],
            data={"payment_request": CryptoPaymentRequestSerializer(payment_request).data},
            status=status.HTTP_200_OK,
        )


class AccessStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        payload = get_user_access_status(request.user)
        return success_response(
            message=BILLING_MESSAGES["ACCESS_STATUS_SUCCESS"],
            data=AccessStatusSerializer(payload).data,
            status=status.HTTP_200_OK,
        )


@method_decorator(csrf_exempt, name="dispatch")
class StripeWebhookView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        signature = request.META.get("HTTP_STRIPE_SIGNATURE", "")

        try:
            event = construct_stripe_event(request.body, signature)
            handle_stripe_webhook_event(event)
        except ValueError as exc:
            return HttpResponse(str(exc), status=400)
        except stripe.error.SignatureVerificationError:
            return HttpResponse("Invalid Stripe signature.", status=400)
        except Exception:
            return HttpResponse("Webhook processing failed.", status=500)

        return HttpResponse("received", status=200)
