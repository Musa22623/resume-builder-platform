import base64
import io
import os
from datetime import timedelta

import qrcode
import stripe
from django.utils import timezone

from billing.models import TrialStatus, UserSubscription


def create_stripe_checkout_session(user_email: str, plan_type: str) -> str:
    stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")
    if not stripe.api_key:
        raise ValueError("Stripe key is not configured.")

    price_map = {
        "monthly": os.getenv("STRIPE_PRICE_MONTHLY", ""),
        "yearly": os.getenv("STRIPE_PRICE_YEARLY", ""),
    }
    price_id = price_map.get(plan_type, "")
    if not price_id:
        raise ValueError("Plan not configured for Stripe.")

    session = stripe.checkout.Session.create(
        mode="subscription",
        line_items=[{"price": price_id, "quantity": 1}],
        customer_email=user_email,
        success_url=os.getenv("STRIPE_SUCCESS_URL", "http://localhost:5173/payment?status=success"),
        cancel_url=os.getenv("STRIPE_CANCEL_URL", "http://localhost:5173/payment?status=cancel"),
    )
    return session.url


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
