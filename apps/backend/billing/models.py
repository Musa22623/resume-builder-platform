from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone


class SubscriptionPlan(models.Model):
    PLAN_TYPES = [("monthly", "Monthly"), ("yearly", "Yearly"), ("one_time", "One Time")]
    name = models.CharField(max_length=80)
    plan_type = models.CharField(max_length=20, choices=PLAN_TYPES)
    price_usd = models.DecimalField(max_digits=8, decimal_places=2)
    currency = models.CharField(max_length=10, default="USD")
    billing_interval = models.CharField(max_length=20, blank=True)
    stripe_price_id = models.CharField(max_length=120, blank=True)
    stripe_product_id = models.CharField(max_length=120, blank=True)
    display_order = models.PositiveIntegerField(default=0)
    active = models.BooleanField(default=True)
    is_archived = models.BooleanField(default=False)


class UserSubscription(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.PROTECT)
    is_active = models.BooleanField(default=True)
    stripe_subscription_id = models.CharField(max_length=120, blank=True, db_index=True)
    stripe_customer_id = models.CharField(max_length=120, blank=True, db_index=True)
    status = models.CharField(max_length=40, default="active")
    current_period_start = models.DateTimeField(null=True, blank=True)
    current_period_end = models.DateTimeField(null=True, blank=True)
    cancel_at_period_end = models.BooleanField(default=False)
    started_at = models.DateTimeField(auto_now_add=True)
    ends_at = models.DateTimeField(null=True, blank=True)


class Payment(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.PROTECT, null=True, blank=True)
    amount_usd = models.DecimalField(max_digits=8, decimal_places=2)
    currency = models.CharField(max_length=10, default="USD")
    payment_reference = models.CharField(max_length=50, blank=True, db_index=True)
    token_symbol = models.CharField(max_length=20, blank=True)
    network_name = models.CharField(max_length=40, blank=True)
    payer_address = models.CharField(max_length=255, blank=True)
    provider = models.CharField(max_length=30, default="placeholder")
    status = models.CharField(max_length=20, default="pending")
    external_reference = models.CharField(max_length=120, blank=True)
    stripe_checkout_session_id = models.CharField(max_length=120, blank=True, db_index=True)
    stripe_subscription_id = models.CharField(max_length=120, blank=True, db_index=True)
    stripe_invoice_id = models.CharField(max_length=120, blank=True, db_index=True)
    raw_payload = models.JSONField(default=dict, blank=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="verified_payments",
    )
    created_at = models.DateTimeField(auto_now_add=True)


class TrialStatus(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    started_at = models.DateTimeField(default=timezone.now)
    trial_days = models.PositiveIntegerField(default=14)

    @property
    def remaining_days(self) -> int:
        expire_at = self.started_at + timedelta(days=self.trial_days)
        diff = (expire_at - timezone.now()).days
        return max(0, diff)


class CryptoNetwork(models.Model):
    code = models.CharField(max_length=40, unique=True)
    display_name = models.CharField(max_length=80)
    token_symbol = models.CharField(max_length=20, blank=True)
    network_name = models.CharField(max_length=40, blank=True)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)
    qr_payload_template = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class CryptoWallet(models.Model):
    network = models.ForeignKey(CryptoNetwork, on_delete=models.CASCADE, related_name="wallets")
    address = models.CharField(max_length=255)
    label = models.CharField(max_length=80, blank=True)
    is_public = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    qr_payload_override = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class PlanCryptoAvailability(models.Model):
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.CASCADE, related_name="crypto_availability")
    network = models.ForeignKey(CryptoNetwork, on_delete=models.CASCADE, related_name="plan_availability")
    is_enabled = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("plan", "network")


class CryptoPaymentRequest(models.Model):
    STATUS_CHOICES = [
        ("pending_submission", "Pending Submission"),
        ("pending_review", "Pending Review"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
        ("expired", "Expired"),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="crypto_payment_requests")
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.PROTECT, related_name="crypto_payment_requests")
    network = models.ForeignKey(CryptoNetwork, on_delete=models.PROTECT, related_name="payment_requests")
    wallet = models.ForeignKey(CryptoWallet, on_delete=models.PROTECT, null=True, blank=True, related_name="payment_requests")
    reference_code = models.CharField(max_length=50, unique=True, db_index=True)
    expected_amount = models.DecimalField(max_digits=12, decimal_places=8)
    expected_currency = models.CharField(max_length=20)
    token_symbol = models.CharField(max_length=20)
    network_name = models.CharField(max_length=40)
    receiver_address = models.CharField(max_length=255)
    instruction_snapshot = models.JSONField(default=dict, blank=True)
    transaction_hash = models.CharField(max_length=255, blank=True)
    sender_address = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default="pending_submission")
    expires_at = models.DateTimeField(null=True, blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_crypto_payment_requests",
    )
    review_note = models.TextField(blank=True)
    payment = models.ForeignKey(Payment, on_delete=models.SET_NULL, null=True, blank=True, related_name="crypto_requests")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class CryptoPaymentReviewLog(models.Model):
    ACTION_CHOICES = [
        ("submitted", "Submitted"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
        ("reopened", "Reopened"),
    ]

    payment_request = models.ForeignKey(CryptoPaymentRequest, on_delete=models.CASCADE, related_name="review_logs")
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="crypto_payment_review_logs")
    action = models.CharField(max_length=30, choices=ACTION_CHOICES)
    note = models.TextField(blank=True)
    before_payload = models.JSONField(default=dict, blank=True)
    after_payload = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
