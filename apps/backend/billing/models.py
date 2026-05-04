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
    provider = models.CharField(max_length=30, default="placeholder")
    status = models.CharField(max_length=20, default="pending")
    external_reference = models.CharField(max_length=120, blank=True)
    stripe_checkout_session_id = models.CharField(max_length=120, blank=True, db_index=True)
    stripe_subscription_id = models.CharField(max_length=120, blank=True, db_index=True)
    stripe_invoice_id = models.CharField(max_length=120, blank=True, db_index=True)
    raw_payload = models.JSONField(default=dict, blank=True)
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
