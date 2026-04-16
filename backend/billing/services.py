import base64
import io
import os

import qrcode
import stripe


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
