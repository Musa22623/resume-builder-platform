import base64
import io
import os
import uuid
from decimal import Decimal
from datetime import datetime
from datetime import timedelta

import qrcode
import stripe
from django.contrib.auth import get_user_model
from django.utils import timezone

from billing.models import (
    CryptoNetwork,
    CryptoPaymentRequest,
    CryptoPaymentReviewLog,
    CryptoWallet,
    Payment,
    PlanCryptoAvailability,
    SubscriptionPlan,
    TrialStatus,
    UserSubscription,
)
from platform_settings.services import log_admin_action

User = get_user_model()


def _get_stripe_api_key() -> str:
    api_key = os.getenv("STRIPE_SECRET_KEY", "")
    if not api_key:
        raise ValueError("Stripe key is not configured.")
    return api_key


def _unix_to_datetime(value):
    if not value:
        return None
    return datetime.fromtimestamp(value, tz=timezone.utc)


def _subscription_is_active(status_value: str) -> bool:
    return status_value in {"active", "trialing"}


def create_stripe_checkout_session(*, user_email: str, user_id: int, plan: SubscriptionPlan) -> str:
    stripe.api_key = _get_stripe_api_key()

    if not plan.active or plan.is_archived:
        raise ValueError("Selected plan is not active.")

    if plan.plan_type not in ("monthly", "yearly"):
        raise ValueError("Selected plan does not support subscription checkout.")

    if not plan.stripe_price_id:
        raise ValueError("Plan not configured for Stripe.")

    session = stripe.checkout.Session.create(
        mode="subscription",
        line_items=[{"price": plan.stripe_price_id, "quantity": 1}],
        customer_email=user_email,
        success_url=os.getenv("STRIPE_SUCCESS_URL", "http://localhost:5173/payment?status=success"),
        cancel_url=os.getenv("STRIPE_CANCEL_URL", "http://localhost:5173/payment?status=cancel"),
        metadata={
            "user_id": str(user_id),
            "plan_id": str(plan.id),
            "plan_type": plan.plan_type,
        },
        subscription_data={
            "metadata": {
                "user_id": str(user_id),
                "plan_id": str(plan.id),
                "plan_type": plan.plan_type,
            }
        },
    )
    return session.url


def construct_stripe_event(payload: bytes, signature: str):
    stripe.api_key = _get_stripe_api_key()
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET", "")
    if not webhook_secret:
        raise ValueError("Stripe webhook secret is not configured.")
    return stripe.Webhook.construct_event(payload=payload, sig_header=signature, secret=webhook_secret)


def _sync_user_subscription(*, user, plan, subscription_id: str, customer_id: str, subscription_payload: dict):
    current_period_start = _unix_to_datetime(subscription_payload.get("current_period_start"))
    current_period_end = _unix_to_datetime(subscription_payload.get("current_period_end"))
    status_value = subscription_payload.get("status", "active")
    cancel_at_period_end = bool(subscription_payload.get("cancel_at_period_end", False))

    defaults = {
        "user": user,
        "plan": plan,
        "stripe_customer_id": customer_id or "",
        "status": status_value,
        "current_period_start": current_period_start,
        "current_period_end": current_period_end,
        "cancel_at_period_end": cancel_at_period_end,
        "is_active": _subscription_is_active(status_value),
        "ends_at": current_period_end,
    }

    subscription, _ = UserSubscription.objects.update_or_create(
        stripe_subscription_id=subscription_id,
        defaults=defaults,
    )
    return subscription


def _sync_payment(*, user, plan, session_payload: dict, subscription_id: str, invoice_id: str = ""):
    amount_total = session_payload.get("amount_total") or 0
    amount_usd = Decimal(amount_total) / Decimal("100")
    checkout_session_id = session_payload.get("id", "")
    currency = (session_payload.get("currency") or "USD").upper()

    defaults = {
        "user": user,
        "plan": plan,
        "amount_usd": amount_usd,
        "currency": currency,
        "provider": "stripe",
        "status": "paid",
        "external_reference": checkout_session_id,
        "stripe_subscription_id": subscription_id or "",
        "stripe_invoice_id": invoice_id or "",
        "raw_payload": session_payload,
    }

    payment, _ = Payment.objects.update_or_create(
        stripe_checkout_session_id=checkout_session_id,
        defaults=defaults,
    )
    return payment


def _resolve_subscription_owner(*, subscription_id: str, metadata: dict | None = None):
    metadata = metadata or {}

    existing = (
        UserSubscription.objects.filter(stripe_subscription_id=subscription_id)
        .select_related("user", "plan")
        .first()
    )
    if existing:
        return existing.user, existing.plan, existing

    user_id = metadata.get("user_id")
    plan_id = metadata.get("plan_id")
    if not user_id or not plan_id:
        raise ValueError("Stripe subscription metadata is incomplete.")

    user = User.objects.get(id=user_id)
    plan = SubscriptionPlan.objects.get(id=plan_id)
    return user, plan, None


def _sync_invoice_payment(*, user, plan, invoice_payload: dict, subscription_id: str, status_value: str):
    amount_paid = invoice_payload.get("amount_paid")
    amount_total = invoice_payload.get("amount_due")
    amount_minor = amount_paid if amount_paid is not None else amount_total or 0
    amount_usd = Decimal(amount_minor) / Decimal("100")
    invoice_id = invoice_payload.get("id", "")
    currency = (invoice_payload.get("currency") or "USD").upper()

    defaults = {
        "user": user,
        "plan": plan,
        "amount_usd": amount_usd,
        "currency": currency,
        "provider": "stripe",
        "status": status_value,
        "external_reference": invoice_id,
        "stripe_subscription_id": subscription_id or "",
        "stripe_invoice_id": invoice_id,
        "raw_payload": invoice_payload,
    }

    payment, _ = Payment.objects.update_or_create(
        stripe_invoice_id=invoice_id,
        defaults=defaults,
    )
    return payment


def handle_checkout_session_completed(session_payload: dict):
    metadata = session_payload.get("metadata") or {}
    user_id = metadata.get("user_id")
    plan_id = metadata.get("plan_id")
    subscription_id = session_payload.get("subscription")
    customer_id = session_payload.get("customer")

    if not user_id or not plan_id or not subscription_id:
        raise ValueError("Stripe checkout session metadata is incomplete.")

    user = User.objects.get(id=user_id)
    plan = SubscriptionPlan.objects.get(id=plan_id)

    stripe.api_key = _get_stripe_api_key()
    subscription = stripe.Subscription.retrieve(subscription_id)

    _sync_payment(
        user=user,
        plan=plan,
        session_payload=session_payload,
        subscription_id=subscription_id,
        invoice_id=subscription.get("latest_invoice", "") or "",
    )
    _sync_user_subscription(
        user=user,
        plan=plan,
        subscription_id=subscription_id,
        customer_id=customer_id or "",
        subscription_payload=subscription,
    )


def handle_subscription_updated(subscription_payload: dict):
    subscription_id = subscription_payload.get("id")
    customer_id = subscription_payload.get("customer")
    metadata = subscription_payload.get("metadata") or {}
    user_id = metadata.get("user_id")
    plan_id = metadata.get("plan_id")

    if subscription_id:
        existing = UserSubscription.objects.filter(stripe_subscription_id=subscription_id).select_related("user", "plan").first()
        if existing:
            user = existing.user
            plan = existing.plan
        else:
            if not user_id or not plan_id:
                raise ValueError("Stripe subscription metadata is incomplete.")
            user = User.objects.get(id=user_id)
            plan = SubscriptionPlan.objects.get(id=plan_id)
    else:
        raise ValueError("Stripe subscription id is missing.")

    _sync_user_subscription(
        user=user,
        plan=plan,
        subscription_id=subscription_id,
        customer_id=customer_id or "",
        subscription_payload=subscription_payload,
    )


def handle_subscription_deleted(subscription_payload: dict):
    subscription_id = subscription_payload.get("id")
    if not subscription_id:
        raise ValueError("Stripe subscription id is missing.")

    subscription = UserSubscription.objects.filter(stripe_subscription_id=subscription_id).first()
    if not subscription:
        return

    subscription.status = subscription_payload.get("status", "canceled")
    subscription.is_active = False
    subscription.cancel_at_period_end = bool(subscription_payload.get("cancel_at_period_end", False))
    subscription.current_period_end = _unix_to_datetime(subscription_payload.get("current_period_end"))
    subscription.ends_at = subscription.current_period_end
    subscription.save(
        update_fields=[
            "status",
            "is_active",
            "cancel_at_period_end",
            "current_period_end",
            "ends_at",
        ]
    )


def handle_invoice_paid(invoice_payload: dict):
    subscription_id = invoice_payload.get("subscription")
    if not subscription_id:
        return

    user, plan, existing_subscription = _resolve_subscription_owner(
        subscription_id=subscription_id,
        metadata=invoice_payload.get("metadata") or {},
    )

    _sync_invoice_payment(
        user=user,
        plan=plan,
        invoice_payload=invoice_payload,
        subscription_id=subscription_id,
        status_value="paid",
    )

    if existing_subscription:
        existing_subscription.status = "active"
        existing_subscription.is_active = True
        existing_subscription.save(update_fields=["status", "is_active"])


def handle_invoice_payment_failed(invoice_payload: dict):
    subscription_id = invoice_payload.get("subscription")
    if not subscription_id:
        return

    user, plan, existing_subscription = _resolve_subscription_owner(
        subscription_id=subscription_id,
        metadata=invoice_payload.get("metadata") or {},
    )

    _sync_invoice_payment(
        user=user,
        plan=plan,
        invoice_payload=invoice_payload,
        subscription_id=subscription_id,
        status_value="failed",
    )

    if existing_subscription:
        existing_subscription.status = "past_due"
        existing_subscription.is_active = False
        existing_subscription.save(update_fields=["status", "is_active"])


def handle_stripe_webhook_event(event):
    event_type = event["type"]
    payload = event["data"]["object"]

    if event_type == "checkout.session.completed":
        handle_checkout_session_completed(payload)
        return

    if event_type == "invoice.paid":
        handle_invoice_paid(payload)
        return

    if event_type == "invoice.payment_failed":
        handle_invoice_payment_failed(payload)
        return

    if event_type == "customer.subscription.updated":
        handle_subscription_updated(payload)
        return

    if event_type == "customer.subscription.deleted":
        handle_subscription_deleted(payload)
        return


def build_crypto_payment_info() -> list[dict]:
    wallets = [
        ("BTC", os.getenv("CRYPTO_BTC_ADDRESS", "")),
        ("ETH", os.getenv("CRYPTO_ETH_ADDRESS", "")),
        ("USDT-TRC20", os.getenv("CRYPTO_USDT_TRC20_ADDRESS", "")),
    ]
    result = []
    for chain, address in wallets:
        if not address:
            continue
        qr = qrcode.QRCode(version=1, box_size=8, border=2)
        qr.add_data(address)
        qr.make(fit=True)
        image = qr.make_image(fill_color="black", back_color="white")
        buffer = io.BytesIO()
        image.save(buffer, format="PNG")
        qr_b64 = base64.b64encode(buffer.getvalue()).decode("utf-8")
        result.append(
            {
                "network": chain,
                "address": address,
                "qr_code_data_url": f"data:image/png;base64,{qr_b64}",
            }
        )
    return result


def build_wallet_qr_payload(wallet: CryptoWallet) -> str:
    if wallet.qr_payload_override:
        return wallet.qr_payload_override.format(address=wallet.address)
    if wallet.network.qr_payload_template:
        return wallet.network.qr_payload_template.format(address=wallet.address)
    return wallet.address


def generate_crypto_payment_reference() -> str:
    date_part = timezone.now().strftime("%Y%m%d")
    suffix = uuid.uuid4().hex[:6].upper()
    return f"CR-{date_part}-{suffix}"


def build_crypto_payment_instructions(*, plan: SubscriptionPlan, network: CryptoNetwork, wallet: CryptoWallet | None, expected_amount, expected_currency: str, reference_code: str) -> dict:
    receiver_address = wallet.address if wallet else ""
    token_symbol = network.token_symbol or expected_currency
    network_name = network.network_name or network.display_name or network.code
    return {
        "headline": f"Send {expected_amount} {token_symbol} on {network_name}",
        "steps": [
            f"Send only {token_symbol} on {network_name} to the wallet address below.",
            "After sending, submit your transaction hash for review.",
            f"Reference {reference_code} when contacting support.",
        ],
        "reference_code": reference_code,
        "receiver_address": receiver_address,
        "token_symbol": token_symbol,
        "network_name": network_name,
    }


def get_crypto_networks_for_plan(plan: SubscriptionPlan):
    availabilities = (
        PlanCryptoAvailability.objects.filter(plan=plan, is_enabled=True, network__is_active=True)
        .select_related("network")
        .order_by("network__sort_order", "network__id")
    )
    network_ids = [availability.network_id for availability in availabilities]
    wallets = (
        CryptoWallet.objects.filter(network_id__in=network_ids, is_active=True, is_public=True)
        .select_related("network")
        .order_by("network__sort_order", "id")
    )
    wallet_map: dict[int, list[CryptoWallet]] = {}
    for wallet in wallets:
        wallet_map.setdefault(wallet.network_id, []).append(wallet)
    networks = [availability.network for availability in availabilities]
    return networks, wallet_map


def create_crypto_payment_request(*, user, plan: SubscriptionPlan, network: CryptoNetwork, wallet: CryptoWallet | None):
    availability = PlanCryptoAvailability.objects.filter(plan=plan, network=network, is_enabled=True).first()
    if not availability:
        raise ValueError("Selected crypto network is not enabled for this plan.")

    if not plan.active or plan.is_archived:
        raise ValueError("Selected plan is not active.")

    if wallet and wallet.network_id != network.id:
        raise ValueError("Selected wallet does not belong to the selected crypto network.")

    if wallet and (not wallet.is_active or not wallet.is_public):
        raise ValueError("Selected wallet is not available for public payment.")

    reference_code = generate_crypto_payment_reference()
    receiver_address = wallet.address if wallet else ""
    token_symbol = network.token_symbol or plan.currency
    network_name = network.network_name or network.display_name or network.code
    expires_at = timezone.now() + timedelta(hours=24)
    instruction_snapshot = build_crypto_payment_instructions(
        plan=plan,
        network=network,
        wallet=wallet,
        expected_amount=plan.price_usd,
        expected_currency=plan.currency,
        reference_code=reference_code,
    )

    return CryptoPaymentRequest.objects.create(
        user=user,
        plan=plan,
        network=network,
        wallet=wallet,
        reference_code=reference_code,
        expected_amount=plan.price_usd,
        expected_currency=plan.currency,
        token_symbol=token_symbol,
        network_name=network_name,
        receiver_address=receiver_address,
        instruction_snapshot=instruction_snapshot,
        expires_at=expires_at,
    )


def submit_crypto_payment_request(*, payment_request: CryptoPaymentRequest, transaction_hash: str, sender_address: str = ""):
    if payment_request.status != "pending_submission":
        raise ValueError("This crypto payment request can no longer accept transaction submission.")
    if payment_request.expires_at and payment_request.expires_at <= timezone.now():
        payment_request.status = "expired"
        payment_request.save(update_fields=["status", "updated_at"])
        raise ValueError("This crypto payment request has expired.")

    before_payload = {
        "status": payment_request.status,
        "transaction_hash": payment_request.transaction_hash,
        "sender_address": payment_request.sender_address,
    }
    payment_request.transaction_hash = transaction_hash
    payment_request.sender_address = sender_address
    payment_request.status = "pending_review"
    payment_request.submitted_at = timezone.now()
    payment_request.save(update_fields=["transaction_hash", "sender_address", "status", "submitted_at", "updated_at"])

    CryptoPaymentReviewLog.objects.create(
        payment_request=payment_request,
        actor=payment_request.user,
        action="submitted",
        before_payload=before_payload,
        after_payload={
            "status": payment_request.status,
            "transaction_hash": payment_request.transaction_hash,
            "sender_address": payment_request.sender_address,
        },
    )
    return payment_request


def _activate_subscription_for_payment(*, user, plan: SubscriptionPlan):
    if plan.plan_type not in {"monthly", "yearly"}:
        return None

    status_value = "active"
    if plan.plan_type == "monthly":
        ends_at = timezone.now() + timedelta(days=30)
    else:
        ends_at = timezone.now() + timedelta(days=365)

    subscription, _ = UserSubscription.objects.update_or_create(
        user=user,
        plan=plan,
        defaults={
            "is_active": True,
            "status": status_value,
            "current_period_start": timezone.now(),
            "current_period_end": ends_at,
            "ends_at": ends_at,
        },
    )
    return subscription


def approve_crypto_payment_request(*, payment_request: CryptoPaymentRequest, admin_user, note: str = ""):
    if payment_request.status != "pending_review":
        raise ValueError("Only pending review crypto payment requests can be approved.")

    before_payload = {
        "status": payment_request.status,
        "payment_id": payment_request.payment_id,
        "review_note": payment_request.review_note,
    }

    payment = Payment.objects.create(
        user=payment_request.user,
        plan=payment_request.plan,
        amount_usd=payment_request.expected_amount,
        currency=payment_request.expected_currency,
        payment_reference=payment_request.reference_code,
        token_symbol=payment_request.token_symbol,
        network_name=payment_request.network_name,
        payer_address=payment_request.sender_address,
        provider="crypto",
        status="paid",
        external_reference=payment_request.transaction_hash,
        verified_at=timezone.now(),
        verified_by=admin_user,
        raw_payload={
            "network": payment_request.network.code,
            "wallet": payment_request.wallet.address if payment_request.wallet else "",
            "reference_code": payment_request.reference_code,
            "receiver_address": payment_request.receiver_address,
            "transaction_hash": payment_request.transaction_hash,
            "sender_address": payment_request.sender_address,
        },
    )

    subscription = _activate_subscription_for_payment(user=payment_request.user, plan=payment_request.plan)

    payment_request.status = "approved"
    payment_request.reviewed_at = timezone.now()
    payment_request.reviewed_by = admin_user
    payment_request.review_note = note
    payment_request.payment = payment
    payment_request.save(
        update_fields=["status", "reviewed_at", "reviewed_by", "review_note", "payment", "updated_at"]
    )

    after_payload = {
        "status": payment_request.status,
        "payment_id": payment.id,
        "review_note": payment_request.review_note,
        "subscription_id": subscription.id if subscription else None,
    }
    CryptoPaymentReviewLog.objects.create(
        payment_request=payment_request,
        actor=admin_user,
        action="approved",
        note=note,
        before_payload=before_payload,
        after_payload=after_payload,
    )
    log_admin_action(
        actor=admin_user,
        action_type="crypto.payment.approved",
        target_type="crypto_payment_request",
        target_id=str(payment_request.id),
        before_payload=before_payload,
        after_payload=after_payload,
    )
    return payment_request


def reject_crypto_payment_request(*, payment_request: CryptoPaymentRequest, admin_user, note: str = ""):
    if payment_request.status != "pending_review":
        raise ValueError("Only pending review crypto payment requests can be rejected.")

    before_payload = {
        "status": payment_request.status,
        "review_note": payment_request.review_note,
    }

    payment_request.status = "rejected"
    payment_request.reviewed_at = timezone.now()
    payment_request.reviewed_by = admin_user
    payment_request.review_note = note
    payment_request.save(update_fields=["status", "reviewed_at", "reviewed_by", "review_note", "updated_at"])

    after_payload = {
        "status": payment_request.status,
        "review_note": payment_request.review_note,
    }
    CryptoPaymentReviewLog.objects.create(
        payment_request=payment_request,
        actor=admin_user,
        action="rejected",
        note=note,
        before_payload=before_payload,
        after_payload=after_payload,
    )
    log_admin_action(
        actor=admin_user,
        action_type="crypto.payment.rejected",
        target_type="crypto_payment_request",
        target_id=str(payment_request.id),
        before_payload=before_payload,
        after_payload=after_payload,
    )
    return payment_request


def get_user_access_status(user) -> dict:
    now = timezone.now()

    active_subscription = (
        UserSubscription.objects.filter(user=user, is_active=True)
        .order_by("-started_at")
        .select_related("plan")
        .first()
    )
    trial = TrialStatus.objects.filter(user=user).first()

    trial_is_active = False
    trial_remaining_days = 0
    trial_ends_at = None
    if trial:
        trial_ends_at = trial.started_at + timedelta(days=trial.trial_days)
        trial_remaining_days = max(0, (trial_ends_at - now).days)
        trial_is_active = trial_ends_at > now

    subscription_is_active = False
    subscription_ends_at = None
    subscription_plan_type = None
    if active_subscription:
        subscription_ends_at = active_subscription.ends_at
        subscription_plan_type = active_subscription.plan.plan_type
        subscription_is_active = active_subscription.ends_at is None or active_subscription.ends_at > now

    has_access = subscription_is_active or trial_is_active
    access_type = "subscription" if subscription_is_active else "trial" if trial_is_active else "none"

    return {
        "has_access": has_access,
        "access_type": access_type,
        "trial": {
            "is_active": trial_is_active,
            "remaining_days": trial_remaining_days,
            "started_at": trial.started_at if trial else None,
            "ends_at": trial_ends_at,
        },
        "subscription": {
            "is_active": subscription_is_active,
            "plan_type": subscription_plan_type,
            "ends_at": subscription_ends_at,
        },
        "features": {
            "resume_edit": has_access,
            "ai_optimize": has_access,
            "export": has_access,
        },
    }
