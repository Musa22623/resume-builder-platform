import { useEffect, useState } from "react";
import api from "../services/api/client";
import Panel from "../components/ui/Panel";
import PageTitleBar from "../components/ui/PageTitleBar";
import { getApiErrorMessage } from "../lib/apiError";

const planTemplates = {
  monthly: {
    label: "Monthly",
    cadence: "/ month",
    summary: "Best if you want full access now and prefer a smaller recurring payment.",
    accent: "Most flexible",
    audience: "Good for a short job search or one focused resume refresh.",
    perks: ["Secure payment via Stripe", "No hidden fees", "Cancel anytime"],
  },
  yearly: {
    label: "Yearly",
    cadence: "/ year",
    summary: "Best value for longer search cycles, repeat tailoring, and ongoing resume refreshes.",
    accent: "Most popular",
    audience: "Best for ongoing applications, multiple target roles, and resume updates.",
    perks: ["Secure payment via Stripe", "Instant access after payment", "Cancel anytime"],
    recommended: true,
  },
  one_time: {
    label: "One-time",
    cadence: " one-time",
    summary: "Best if you want a single purchase without recurring billing.",
    accent: "Single payment",
    audience: "Good for a focused resume refresh without a subscription.",
    perks: ["Secure payment via Stripe", "No recurring charge", "Instant access after payment"],
  },
};

const currencySymbol = (currency = "USD") => (currency.toUpperCase() === "USD" ? "$" : `${currency.toUpperCase()} `);

const formatPlanPrice = (plan) => {
  const amount = Number(plan.price_usd);
  if (Number.isNaN(amount)) return `${currencySymbol(plan.currency)}0`;
  return `${currencySymbol(plan.currency)}${amount.toFixed(2).replace(/\.00$/, "")}`;
};

const getPlanCadence = (plan) => {
  if (plan.billing_interval === "month" || plan.plan_type === "monthly") return "/ month";
  if (plan.billing_interval === "year" || plan.plan_type === "yearly") return "/ year";
  return " one-time";
};

const buildBillingPlanMeta = (plan) => {
  const template = planTemplates[plan.plan_type] || planTemplates.one_time;
  const price = formatPlanPrice(plan);
  const cadence = getPlanCadence(plan);

  return {
    ...template,
    id: String(plan.id),
    planType: plan.plan_type,
    backendPlan: plan,
    label: template.label || plan.plan_type,
    title: plan.name || `${template.label} access`,
    price,
    cadence,
    chargeLabel: `${price}${cadence}`,
  };
};

const paymentMethods = [
  {
    id: "stripe",
    eyebrow: "Card",
    title: "Stripe",
    description: "Use a familiar hosted checkout for monthly or yearly access.",
    badge: "Recommended",
  },
  {
    id: "crypto",
    eyebrow: "Wallet",
    title: "Crypto",
    description: "Pay directly from a wallet with QR and copyable address details.",
    badge: "Direct pay",
  },
];

const wizardSteps = [
  { id: 1, label: "Plan", title: "Choose a price plan" },
  { id: 2, label: "Method", title: "Choose a payment method" },
  { id: 3, label: "Pay", title: "Open the payment window" },
];

const trustItems = ["Secure payment via Stripe", "No hidden fees", "Cancel anytime", "Instant access after payment"];

// The backend owns wallet formatting, including QR payloads; the UI only shapes it for selection and display.
const normalizeCryptoWallets = (payload) =>
  (payload.networks || []).flatMap((network) =>
    (network.wallets || []).map((wallet) => ({
      ...wallet,
      key: `${network.id}:${wallet.id}`,
      networkId: network.id,
      network: network.display_name || network.code,
      networkCode: network.code,
      networkName: network.network_name || network.display_name || network.code,
      label: wallet.label || `${network.display_name || network.code} wallet`,
      tokenSymbol: network.token_symbol || payload.plan?.currency || "USDT",
      plan: payload.plan,
      qrPayload: wallet.qr_payload || wallet.address,
      qrCodeDataUrl: wallet.qr_code_data_url || "",
    })),
  );

const statusToneClasses = {
  neutral: "border-slate-200 bg-slate-50 text-slate-700",
  success: "border-teal-200 bg-teal-50 text-teal-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  danger: "border-rose-200 bg-rose-50 text-rose-800",
};

const getStatusTone = (status) => {
  const value = status.toLowerCase();

  if (value.includes("copied")) return "success";
  if (value.includes("not available")) return "warning";
  if (value.includes("couldn't") || value.includes("invalid") || value.includes("error")) return "danger";
  return "neutral";
};

const formatQuoteTime = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainder = String(seconds % 60).padStart(2, "0");
  return `${minutes}:${remainder}`;
};

const maskWalletAddress = (address = "") => {
  if (address.length <= 14) return address;
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
};

const CopyIcon = () => (
  <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 20 20">
    <rect x="7" y="4.5" width="8.5" height="10.5" rx="2" stroke="currentColor" strokeWidth="1.5" />
    <path d="M4.5 12.5V7.5a2 2 0 0 1 2-2h1" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
  </svg>
);

const ArrowIcon = () => (
  <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 20 20">
    <path d="M4 10h12" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
    <path d="M10.5 4.5 16 10l-5.5 5.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
  </svg>
);

const SpinnerIcon = () => (
  <svg aria-hidden="true" className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 20 20">
    <circle cx="10" cy="10" r="7" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2" />
    <path d="M10 3a7 7 0 0 1 7 7" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
  </svg>
);

const PaymentPage = () => {
  const [wallets, setWallets] = useState([]);
  const [status, setStatus] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("");
  const [selectedMethod, setSelectedMethod] = useState("stripe");
  const [currentStep, setCurrentStep] = useState(1);
  const [activePlan, setActivePlan] = useState("");
  const [isLoadingCrypto, setIsLoadingCrypto] = useState(false);
  const [copiedNetwork, setCopiedNetwork] = useState("");
  const [selectedWalletNetwork, setSelectedWalletNetwork] = useState("");
  const [availablePlans, setAvailablePlans] = useState([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [cryptoPaymentRequest, setCryptoPaymentRequest] = useState(null);
  const [cryptoRequestAttemptKey, setCryptoRequestAttemptKey] = useState("");
  const [transactionHash, setTransactionHash] = useState("");
  const [senderAddress, setSenderAddress] = useState("");
  const [isSubmittingCrypto, setIsSubmittingCrypto] = useState(false);
  const [cryptoPaymentStatus, setCryptoPaymentStatus] = useState("waiting");
  const [quoteSeconds, setQuoteSeconds] = useState(15 * 60);

  const startStripeCheckout = async (plan) => {
    setActivePlan(plan.id);
    try {
      const { data } = await api.post("/api/v1/billing/stripe/checkout-session/", { plan_id: plan.backendPlan.id });
      window.location.href = data.checkout_url;
    } catch (e) {
      setStatus(getApiErrorMessage(e, "We couldn't start checkout right now. Please try again in a moment."));
      setActivePlan("");
    }
  };

  const loadBillingPlans = async () => {
    if (availablePlans.length) return availablePlans;

    const { data } = await api.get("/api/v1/billing/plans/");
    const nextPlans = (data.items || []).filter((plan) => plan.active && !plan.is_archived);
    setAvailablePlans(nextPlans);
    return nextPlans;
  };

  const loadCrypto = async () => {
    if (!selectedPlanMeta) return;

    setIsLoadingCrypto(true);
    try {
      const plans = await loadBillingPlans();
      const plan = plans.find((item) => String(item.id) === selectedPlanMeta.id);

      if (!plan) {
        setWallets([]);
        setStatus("This plan is not available for crypto payment yet.");
        return;
      }

      const { data } = await api.get(`/api/v1/billing/crypto/plans/${plan.id}/wallets/`);
      const nextWallets = normalizeCryptoWallets(data);
      setWallets(nextWallets);
      setSelectedWalletNetwork((current) => {
        if (current && nextWallets.some((wallet) => wallet.key === current)) return current;
        return nextWallets[0]?.key || "";
      });
      if (!nextWallets.length) setStatus("Crypto wallets are not configured for this plan yet.");
    } catch (e) {
      setStatus(getApiErrorMessage(e, "We couldn't load crypto payment details right now. Please try again in a moment."));
    } finally {
      setIsLoadingCrypto(false);
    }
  };

  const copyWalletAddress = async (network, address) => {
    if (!navigator?.clipboard?.writeText) {
      setStatus("Copy is not available in this browser right now. Please select and copy the address manually.");
      return;
    }

    try {
      await navigator.clipboard.writeText(address);
      setCopiedNetwork(network);
      setStatus(`${network} wallet address copied.`);
      window.setTimeout(() => {
        setCopiedNetwork((current) => (current === network ? "" : current));
      }, 1800);
    } catch {
      setStatus("We couldn't copy the wallet address automatically. Please copy it manually.");
    }
  };

  const createCryptoPaymentRequest = async () => {
    if (!selectedWallet?.plan || !selectedWallet) return null;
    if (
      cryptoPaymentRequest &&
      cryptoPaymentRequest.plan === selectedWallet.plan.id &&
      cryptoPaymentRequest.network === selectedWallet.networkId &&
      cryptoPaymentRequest.wallet === selectedWallet.id
    ) {
      return cryptoPaymentRequest;
    }

    setIsSubmittingCrypto(true);
    setCryptoRequestAttemptKey(selectedWallet.key);
    try {
      const { data } = await api.post("/api/v1/billing/crypto/payment-requests/", {
        plan_id: selectedWallet.plan.id,
        network_id: selectedWallet.networkId,
        wallet_id: selectedWallet.id,
      });
      setCryptoPaymentRequest(data.payment_request || null);
      setQuoteSeconds(24 * 60 * 60);
      setCryptoPaymentStatus("waiting");
      return data.payment_request || null;
    } catch (e) {
      setStatus(getApiErrorMessage(e, "We couldn't create a crypto payment request. Please try again."));
      return null;
    } finally {
      setIsSubmittingCrypto(false);
    }
  };

  const submitCryptoTransaction = async () => {
    const trimmedHash = transactionHash.trim();
    if (!trimmedHash) {
      setStatus("Enter your transaction hash before submitting for review.");
      return;
    }

    const paymentRequest = cryptoPaymentRequest || (await createCryptoPaymentRequest());
    if (!paymentRequest) return;

    setIsSubmittingCrypto(true);
    try {
      const { data } = await api.post(`/api/v1/billing/crypto/payment-requests/${paymentRequest.id}/submit-transaction/`, {
        transaction_hash: trimmedHash,
        sender_address: senderAddress.trim(),
      });
      setCryptoPaymentRequest(data.payment_request || paymentRequest);
      setCryptoPaymentStatus("detecting");
      setStatus("Transaction submitted for admin review.");
    } catch (e) {
      setStatus(getApiErrorMessage(e, "We couldn't submit that transaction yet. Please check the hash and try again."));
    } finally {
      setIsSubmittingCrypto(false);
    }
  };

  const checkCryptoPaymentStatus = () => {
    if (!cryptoPaymentRequest?.id) {
      setStatus("Create a payment request first, then submit your transaction hash.");
      return;
    }

    api
      .get(`/api/v1/billing/crypto/payment-requests/${cryptoPaymentRequest.id}/`)
      .then(({ data }) => {
        const nextRequest = data.payment_request || data;
        setCryptoPaymentRequest(nextRequest);
        setCryptoPaymentStatus(nextRequest.status === "approved" ? "confirmed" : nextRequest.status === "pending_review" ? "detecting" : "waiting");
        setStatus(`Payment status: ${nextRequest.status.replace(/_/g, " ")}.`);
      })
      .catch((e) => {
        setStatus(getApiErrorMessage(e, "We couldn't refresh payment status right now."));
      });
  };

  const statusTone = status ? getStatusTone(status) : "neutral";
  const billingPlans = availablePlans.map(buildBillingPlanMeta);
  const selectedPlanMeta = billingPlans.find((plan) => plan.id === selectedPlan);
  const selectedMethodMeta = paymentMethods.find((method) => method.id === selectedMethod);
  const walletOptions = wallets;
  const selectedWallet = walletOptions.find((wallet) => wallet.key === selectedWalletNetwork) || null;
  const selectedChargeLabel = selectedPlanMeta?.chargeLabel || "";
  const cryptoAmount = cryptoPaymentRequest?.expected_amount || selectedWallet?.plan?.price_usd || selectedPlanMeta?.backendPlan?.price_usd || "";
  const cryptoTokenSymbol = cryptoPaymentRequest?.token_symbol || selectedWallet?.tokenSymbol || "USDT";
  const cryptoNetworkLabel = cryptoPaymentRequest?.network_name || selectedWallet?.networkName || selectedWallet?.network || "Choose network";
  const cryptoReceiverAddress = cryptoPaymentRequest?.receiver_address || selectedWallet?.address || "";
  const cryptoQrPayload = selectedWallet?.qrPayload || cryptoReceiverAddress;
  const cryptoStatusLabel =
    cryptoPaymentStatus === "confirmed"
      ? "Payment confirmed"
      : cryptoPaymentStatus === "detecting"
        ? "Pending admin review"
        : "Waiting for payment";
  const canContinueToPayment = Boolean(selectedPlanMeta && selectedMethodMeta && (selectedMethod !== "crypto" || selectedWalletNetwork));

  useEffect(() => {
    let mounted = true;
    setIsLoadingPlans(true);
    api
      .get("/api/v1/billing/plans/")
      .then(({ data }) => {
        if (!mounted) return;
        const nextPlans = (data.items || []).filter((plan) => plan.active && !plan.is_archived);
        setAvailablePlans(nextPlans);
        setSelectedPlan((current) => (current && nextPlans.some((plan) => String(plan.id) === current) ? current : ""));
        if (!nextPlans.length) {
          setStatus("No active billing plans are available yet.");
        }
      })
      .catch((e) => {
        if (mounted) setStatus(getApiErrorMessage(e, "We couldn't load billing plans right now."));
      })
      .finally(() => {
        if (mounted) setIsLoadingPlans(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if ((currentStep === 2 || currentStep === 3) && selectedMethod === "crypto" && selectedPlan && !wallets.length && !isLoadingCrypto) {
      loadCrypto();
    }
  }, [currentStep, isLoadingCrypto, selectedMethod, selectedPlan, wallets.length]);

  useEffect(() => {
    setQuoteSeconds(15 * 60);
    setCryptoPaymentStatus("waiting");
    setCryptoPaymentRequest(null);
    setCryptoRequestAttemptKey("");
    setTransactionHash("");
    setSenderAddress("");
  }, [selectedPlan, selectedWalletNetwork, selectedMethod]);

  useEffect(() => {
    setWallets([]);
    setSelectedWalletNetwork("");
  }, [selectedPlan]);

  useEffect(() => {
    if (
      currentStep === 3 &&
      selectedMethod === "crypto" &&
      selectedWallet &&
      !cryptoPaymentRequest &&
      !isSubmittingCrypto &&
      cryptoRequestAttemptKey !== selectedWalletNetwork
    ) {
      createCryptoPaymentRequest();
    }
  }, [currentStep, selectedMethod, selectedWalletNetwork, cryptoPaymentRequest, isSubmittingCrypto, cryptoRequestAttemptKey]);

  useEffect(() => {
    if (currentStep !== 3 || selectedMethod !== "crypto" || quoteSeconds <= 0) return undefined;

    const timerId = window.setInterval(() => {
      setQuoteSeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [currentStep, quoteSeconds, selectedMethod]);

  const canOpenStep = (stepId) => {
    if (stepId === 1) return true;
    if (stepId === 2) return Boolean(selectedPlanMeta);
    if (stepId === 3) return canContinueToPayment;
    return false;
  };

  const goToStep = (stepId) => {
    if (canOpenStep(stepId)) setCurrentStep(stepId);
  };

  const renderWizardProgress = () => (
    <div className="mb-5">
      <p className="mb-3 text-sm font-semibold text-slate-700">
        Step {currentStep} of 3: {wizardSteps.find((step) => step.id === currentStep)?.title}
      </p>
      <div className="grid w-full grid-cols-3 gap-2 sm:gap-3">
        {wizardSteps.map((step, index) => {
        const isActive = currentStep === step.id;
        const isComplete = currentStep > step.id;
        const isLocked = !canOpenStep(step.id);

        return (
          <div className="relative min-w-0" key={step.id}>
            <button
              className={`relative z-10 flex w-full items-center justify-center gap-2 rounded-full px-2 py-1.5 text-center transition duration-200 sm:px-3 ${
                isActive
                  ? "bg-teal-50 text-teal-800"
                  : isComplete
                    ? "bg-white text-slate-700 hover:bg-slate-50"
                    : "bg-transparent text-slate-400"
              }`}
              disabled={isLocked}
              onClick={() => goToStep(step.id)}
              type="button"
            >
              <span
                className={`inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                  isActive
                    ? "bg-teal-600 text-white"
                    : isComplete
                      ? "bg-slate-900 text-white"
                      : "bg-white text-slate-500"
                }`}
              >
                {step.id}
              </span>
              <span className={`min-w-0 text-[10px] font-semibold uppercase tracking-[0.18em] ${isActive ? "text-teal-700" : "text-slate-400"}`}>
                {step.label}
              </span>
            </button>

            {index < wizardSteps.length - 1 ? (
              <span
                aria-hidden="true"
                className={`absolute left-[calc(50%+1.1rem)] right-[-0.5rem] top-3 hidden h-px sm:block ${
                  currentStep > step.id ? "bg-teal-500" : "bg-slate-200"
                }`}
              />
            ) : null}
          </div>
        );
      })}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <PageTitleBar
        subtitle="Pick a plan, choose a payment rail, and keep access status easy to confirm."
        title="Billing"
      />
      {status ? (
        <section className={`rounded-[1.6rem] border px-4 py-3 shadow-[0_16px_35px_rgba(15,23,42,0.05)] ${statusToneClasses[statusTone]}`}>
          <p className="text-sm font-medium leading-6">{status}</p>
        </section>
      ) : null}

      {currentStep === 1 ? (
        <section>
        <Panel className="p-5 sm:p-6">
          {renderWizardProgress()}
          <fieldset>
            <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">Choose a price plan</h2>
            <p className="mt-2 max-w-full text-sm leading-6 text-slate-500">
              Start with one of the active plans configured by the admin team.
            </p>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {billingPlans.map((plan) => {
                const isSelected = selectedPlan === plan.id;

                return (
                  <label
                    className={`relative flex cursor-pointer items-start gap-3 rounded-xl border px-5 py-5 transition duration-200 ${
                      isSelected
                        ? "border-teal-500 bg-teal-50/90 shadow-[0_18px_42px_rgba(13,148,136,0.18)]"
                        : plan.recommended
                          ? "border-teal-200 bg-white shadow-[0_14px_34px_rgba(15,23,42,0.08)] hover:border-teal-400 hover:bg-teal-50/40"
                          : "border-slate-200 bg-white hover:border-teal-200 hover:bg-slate-50"
                    }`}
                    key={plan.id}
                  >
                    {plan.recommended ? (
                      <span className="absolute right-4 top-4 rounded-full bg-teal-600 px-3 py-1 text-xs font-semibold text-white">
                        Most popular
                      </span>
                    ) : null}
                    <input
                      checked={isSelected}
                      className="sr-only"
                      name="billing-plan"
                      onChange={() => setSelectedPlan(plan.id)}
                      type="radio"
                      value={plan.id}
                    />
                    <span
                      aria-hidden="true"
                      className={`mt-1 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border transition duration-200 ${
                        isSelected ? "border-teal-600 bg-teal-600" : "border-slate-300 bg-white"
                      }`}
                    >
                      <span className={`h-2 w-2 rounded-full bg-white ${isSelected ? "opacity-100" : "opacity-0"}`} />
                    </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-4">
                          <span>
                            <span className={`block text-xs font-semibold uppercase tracking-[0.22em] ${isSelected ? "text-teal-700" : "text-slate-400"}`}>
                              {plan.label}
                            </span>
                            <span className="mt-1.5 block text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">{plan.title}</span>
                          </span>
                          <span className={`mt-8 rounded-full px-3 py-1 text-xs font-semibold ${isSelected ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}>
                            {isSelected ? "Selected" : plan.accent}
                          </span>
                        </span>
                      <span className="mt-4 flex flex-wrap items-end gap-2">
                        <span className="text-4xl font-semibold tracking-tight text-slate-950">{plan.price}</span>
                        <span className="pb-1 text-base font-semibold text-slate-600">{plan.cadence}</span>
                        {plan.savings ? (
                          <span className="mb-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">{plan.savings}</span>
                        ) : null}
                      </span>
                      <span className="mt-2 block text-sm leading-6 text-slate-600">{plan.summary}</span>
                      <span className="mt-3 block rounded-lg bg-slate-50 px-3 py-2 text-sm font-medium leading-6 text-slate-700">{plan.audience}</span>
                      <span className="mt-3 grid gap-2">
                        {plan.perks.map((perk) => (
                          <span className="flex items-center gap-2 text-sm font-semibold text-slate-700" key={perk}>
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-teal-100 text-[11px] text-teal-700">OK</span>
                            {perk}
                          </span>
                        ))}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
            {!billingPlans.length ? (
              <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">
                <p className="text-sm font-semibold text-slate-700">
                  {isLoadingPlans ? "Loading active billing plans..." : "No active plans are available."}
                </p>
              </div>
            ) : null}
          </fieldset>
          {selectedPlanMeta ? (
            <div className="mt-5 rounded-xl border border-teal-200 bg-teal-50/70 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">You will be charged: {selectedChargeLabel}</p>
              <p className="mt-1 text-sm text-slate-600">
                Cancel anytime. No hidden fees. Instant access after payment.
              </p>
            </div>
          ) : null}
          <div className="mt-5 flex justify-end">
            <button className="rb-btn-primary inline-flex items-center gap-2" disabled={!selectedPlanMeta} onClick={() => goToStep(2)} type="button">
              <span>Continue to Secure Payment</span>
              <ArrowIcon />
            </button>
          </div>
        </Panel>
        </section>
      ) : null}

      {currentStep === 2 && selectedPlanMeta ? (
        <section>
          <Panel className="p-5 sm:p-6">
            {renderWizardProgress()}
            <fieldset>
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">Choose a payment method</h2>
              <p className="mt-2 max-w-full text-sm leading-6 text-slate-500">
                {selectedPlanMeta.title} is selected. Choose Stripe for secure hosted checkout, or crypto for direct wallet payment.
              </p>

              <div className="mt-5 space-y-3">
                {paymentMethods.map((method) => {
                  const isSelected = selectedMethod === method.id;

                  return (
                    <label
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border px-5 py-4 transition duration-200 ${
                        isSelected
                          ? "border-teal-500 bg-teal-50/90 shadow-[0_18px_42px_rgba(13,148,136,0.18)]"
                          : "border-slate-200 bg-white hover:border-teal-200 hover:bg-slate-50"
                      }`}
                      key={method.id}
                    >
                      <input
                        checked={isSelected}
                        className="sr-only"
                        name="payment-method"
                        onChange={() => setSelectedMethod(method.id)}
                        type="radio"
                        value={method.id}
                      />
                      <span
                        aria-hidden="true"
                        className={`mt-1 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border transition duration-200 ${
                          isSelected ? "border-teal-600 bg-teal-600" : "border-slate-300 bg-white"
                        }`}
                      >
                        <span className={`h-2 w-2 rounded-full bg-white ${isSelected ? "opacity-100" : "opacity-0"}`} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-4">
                          <span>
                            <span className={`block text-xs font-semibold uppercase tracking-[0.22em] ${isSelected ? "text-teal-700" : "text-slate-400"}`}>
                              {method.eyebrow}
                            </span>
                            <span className="mt-1.5 block text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">{method.title}</span>
                          </span>
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isSelected ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}>
                            {isSelected ? "Selected" : method.badge}
                          </span>
                        </span>
                        <span className="mt-2 block text-sm leading-6 text-slate-600">{method.description}</span>
                        {method.id === "stripe" ? (
                          <span className="mt-3 flex flex-wrap gap-2">
                            {trustItems.slice(0, 3).map((item) => (
                              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200" key={item}>
                                OK {item}
                              </span>
                            ))}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
            {selectedMethod === "crypto" ? (
              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-950">Choose a crypto network before continuing</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Select the exact network your wallet will use. The payment screen will show the QR code and copyable address.
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {walletOptions.map((wallet) => {
                    const isSelected = selectedWalletNetwork === wallet.key;

                    return (
                      <button
                        className={`rounded-xl border px-4 py-3 text-left transition duration-200 ${
                          isSelected
                            ? "border-teal-500 bg-teal-50 shadow-[0_14px_30px_rgba(13,148,136,0.16)]"
                            : "border-slate-200 bg-white hover:border-teal-200 hover:bg-teal-50/50"
                        }`}
                        key={wallet.key}
                        onClick={() => setSelectedWalletNetwork(wallet.key)}
                        type="button"
                      >
                        <span className="block text-sm font-semibold text-slate-950">{wallet.network}</span>
                        <span className="mt-1 block text-xs text-slate-500">{wallet.tokenSymbol} on {wallet.networkName}</span>
                        <span className="mt-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{wallet.label}</span>
                      </button>
                    );
                  })}
                </div>
                {selectedWallet ? (
                  <div className="mt-4 flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-3 sm:flex-row sm:items-center">
                    <div className="w-full max-w-[132px] rounded-lg border border-slate-200 bg-slate-50 p-2">
                      {selectedWallet.qrCodeDataUrl ? (
                        <img
                          alt={`${selectedWallet.network} wallet qr`}
                          className="aspect-square w-full rounded-md object-cover"
                          src={selectedWallet.qrCodeDataUrl}
                        />
                      ) : (
                        <div className="flex aspect-square w-full items-center justify-center rounded-md bg-white px-2 text-center text-[11px] font-semibold leading-5 text-slate-500">
                          QR payload from backend
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-950">Payment address for {selectedWallet.network}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{selectedWallet.tokenSymbol} on {selectedWallet.networkName}</p>
                      <p className="mt-2 break-all text-xs font-medium text-slate-500">{maskWalletAddress(selectedWallet.address)}</p>
                      <p className="mt-1 break-all text-[11px] text-slate-400">QR payload: {selectedWallet.qrPayload}</p>
                    </div>
                  </div>
                ) : isLoadingCrypto ? (
                  <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-500">
                    Loading supported crypto networks...
                  </div>
                ) : (
                  <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-white p-3 text-sm font-semibold text-slate-500">
                    No crypto wallets are configured for this plan.
                  </div>
                )}
              </div>
            ) : null}
            <div className="mt-5 rounded-xl border border-teal-100 bg-teal-50/60 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">Selected purchase</p>
              <p className="mt-1 text-sm text-slate-600">
                You will be charged: <span className="font-semibold text-slate-900">{selectedChargeLabel}</span> via {selectedMethodMeta?.title}. Cancel anytime.
              </p>
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-between">
              <button className="rb-btn-secondary px-3 py-2 text-xs" onClick={() => goToStep(1)} type="button">
                Back to Plan
              </button>
              <button className="rb-btn-primary inline-flex items-center gap-2" disabled={!canContinueToPayment} onClick={() => goToStep(3)} type="button">
                <span>Continue to Secure Payment</span>
                <ArrowIcon />
              </button>
            </div>
          </Panel>
        </section>
      ) : null}

      {currentStep === 3 && selectedPlanMeta && selectedMethod === "stripe" ? (
        <section>
          <Panel className="overflow-hidden p-0">
            <div className="px-5 pt-5 sm:px-6 sm:pt-6">
              {renderWizardProgress()}
            </div>
            <div className="border-b border-slate-100 bg-[linear-gradient(135deg,rgba(20,184,166,0.12),rgba(255,255,255,0.65),rgba(14,165,233,0.12))] px-5 py-5 sm:px-6 sm:py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">Stripe checkout</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-[1.75rem]">Pay securely with Stripe</h2>
              <p className="mt-2 max-w-full text-sm leading-6 text-slate-600">
                Your plan is selected. Continue to secure hosted checkout and get instant access after payment.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {trustItems.map((item) => (
                  <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200" key={item}>
                    OK {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-5 sm:p-6">
              <article className="rounded-xl border border-teal-200 bg-teal-50/70 p-5 shadow-[0_18px_45px_rgba(20,184,166,0.12)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{selectedPlanMeta.label}</p>
                    <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{selectedPlanMeta.title}</h3>
                  </div>
                  <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">{selectedPlanMeta.accent}</span>
                </div>

                <div className="mt-5 flex items-end gap-2">
                  <span className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">{selectedPlanMeta.price}</span>
                  <span className="pb-1 text-sm font-medium text-slate-500">{selectedPlanMeta.cadence}</span>
                  {selectedPlanMeta.savings ? (
                    <span className="mb-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">{selectedPlanMeta.savings}</span>
                  ) : null}
                </div>

                <p className="mt-3 text-sm leading-6 text-slate-600">{selectedPlanMeta.summary}</p>
                <div className="mt-4 rounded-lg border border-white/70 bg-white/80 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-950">You will be charged: {selectedChargeLabel}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">No commitment. Cancel anytime. Instant access after payment.</p>
                </div>

                <div className="mt-5 space-y-2.5">
                  {selectedPlanMeta.perks.map((perk) => (
                    <div className="flex items-start gap-3 text-sm text-slate-600" key={perk}>
                      <span className="mt-1 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-teal-100 text-[11px] font-bold text-teal-700">
                        OK
                      </span>
                      <span className="leading-6">{perk}</span>
                    </div>
                  ))}
                </div>

                <button
                  className="rb-btn-primary mt-6 inline-flex h-12 w-full items-center justify-center gap-2 text-base"
                  disabled={Boolean(activePlan)}
                  onClick={() => startStripeCheckout(selectedPlanMeta)}
                  type="button"
                >
                  <span>{activePlan === selectedPlanMeta.id ? "Opening secure checkout..." : "Pay securely with Stripe"}</span>
                  <ArrowIcon />
                </button>
              </article>
              <div className="mt-3 flex justify-start">
                <button className="rb-btn-secondary px-3 py-2 text-xs" onClick={() => goToStep(2)} type="button">
                  Back to Method
                </button>
              </div>
            </div>
          </Panel>
        </section>
      ) : currentStep === 3 && selectedPlanMeta ? (
        <section className="space-y-3">
          <Panel className="overflow-hidden p-0 text-white shadow-[0_18px_50px_rgba(15,23,42,0.14)]" tone="dark">
            <div className="px-4 pt-4 sm:px-5 sm:pt-5">
              {renderWizardProgress()}
            </div>
            <div className="border-b border-white/10 bg-slate-950/55 px-4 py-4 sm:px-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-300">Crypto payment</p>
                  <h2 className="mt-1 text-xl font-semibold tracking-tight text-white">Send payment, then submit the hash</h2>
                </div>
                <div className="grid gap-2 text-sm sm:grid-cols-3 lg:min-w-[520px]">
                  <div className="rounded-lg border border-white/10 bg-white/10 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">Amount</p>
                    <p className="mt-0.5 font-semibold text-white">{cryptoAmount} {cryptoTokenSymbol}</p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/10 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">Network</p>
                    <p className="mt-0.5 truncate font-semibold text-white" title={cryptoNetworkLabel}>{cryptoNetworkLabel}</p>
                  </div>
                  <div className="rounded-lg border border-amber-300/25 bg-amber-400/10 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-100">Valid</p>
                    <p className="mt-0.5 font-semibold text-amber-50">{formatQuoteTime(quoteSeconds)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3 p-4 sm:p-5">
              {selectedWallet ? (
                <div className="space-y-3">
                  {walletOptions.length > 1 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {walletOptions.map((wallet) => {
                        const isSelected = wallet.key === selectedWallet.key;

                        return (
                          <button
                            className={`rounded-lg border px-3 py-2 text-left text-xs font-semibold transition duration-200 ${
                              isSelected
                                ? "border-teal-300 bg-teal-400/20 text-teal-50 shadow-[0_12px_24px_rgba(20,184,166,0.16)]"
                                : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10"
                            }`}
                            key={wallet.key}
                            onClick={() => setSelectedWalletNetwork(wallet.key)}
                            type="button"
                          >
                            <span className="block">{wallet.network}</span>
                            <span className="mt-0.5 block font-normal text-slate-300">{wallet.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}

                  <div className="rounded-lg border border-red-300/35 bg-red-500/12 px-3 py-2.5 text-red-50">
                    <p className="text-sm font-semibold">Send only {cryptoTokenSymbol} on {cryptoNetworkLabel}. Other assets or networks may be lost.</p>
                  </div>

                  <article className="rounded-xl border border-white/10 bg-white/5 p-3 sm:p-4">
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-start">
                      <div className="space-y-3">
                        <div className="rounded-lg border border-white/10 bg-slate-950/30 px-3 py-3">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Wallet address</p>
                              <p className="mt-1 text-xl font-semibold tracking-tight text-white">{maskWalletAddress(cryptoReceiverAddress)}</p>
                              <p className="mt-1 text-xs text-slate-400">{selectedWallet.networkCode} | {cryptoNetworkLabel}</p>
                            </div>
                            <button
                              className="rb-btn-primary h-10 min-w-36 gap-2 px-3"
                              onClick={() => copyWalletAddress(selectedWallet.network, cryptoReceiverAddress)}
                              type="button"
                            >
                              <CopyIcon />
                              <span>{copiedNetwork === selectedWallet.network ? "Copied" : "Copy address"}</span>
                            </button>
                          </div>
                          <p className="mt-2 break-all rounded-md bg-white/5 px-2.5 py-2 text-xs leading-5 text-slate-200">{cryptoReceiverAddress}</p>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2">
                          <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Reference</p>
                            <p className="mt-1 break-all text-sm font-semibold text-slate-200">{cryptoPaymentRequest?.reference_code || "Creating reference..."}</p>
                          </div>
                          <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Status</p>
                            <p className="mt-1 text-sm font-semibold text-amber-100">{cryptoStatusLabel}</p>
                          </div>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
                          <input
                            className="rb-field h-10 border-white/10 bg-white/95 text-sm text-slate-900"
                            onChange={(event) => setTransactionHash(event.target.value)}
                            placeholder="Transaction hash"
                            value={transactionHash}
                          />
                          <input
                            className="rb-field h-10 border-white/10 bg-white/95 text-sm text-slate-900"
                            onChange={(event) => setSenderAddress(event.target.value)}
                            placeholder="Sender address optional"
                            value={senderAddress}
                          />
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row">
                          <button className="rb-btn-primary h-10 justify-center px-4" disabled={isSubmittingCrypto} onClick={submitCryptoTransaction} type="button">
                            {isSubmittingCrypto ? "Submitting..." : "Submit transaction"}
                          </button>
                          <button className="rb-btn-secondary-dark h-10 justify-center px-4" onClick={checkCryptoPaymentStatus} type="button">
                            Check payment status
                          </button>
                        </div>
                      </div>

                      <div className="mx-auto w-full max-w-[220px] rounded-lg border border-white/10 bg-white p-2.5 text-slate-900">
                        {selectedWallet.qrCodeDataUrl ? (
                          <img
                            alt={`${selectedWallet.network} wallet qr`}
                            className="aspect-square w-full rounded-lg object-cover"
                            src={selectedWallet.qrCodeDataUrl}
                          />
                        ) : (
                          <div className="flex aspect-square w-full items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 text-center text-xs font-semibold leading-5 text-slate-600">
                            Use the address or payload below.
                          </div>
                        )}
                        <p className="mt-2 text-center text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{selectedWallet.qrCodeDataUrl ? "Scan wallet" : "QR payload"}</p>
                        <p className="mt-1 text-center text-sm font-semibold text-slate-900">{cryptoAmount} {cryptoTokenSymbol}</p>
                        <p className="mt-1 break-all rounded-md bg-slate-50 px-2 py-1.5 text-[11px] leading-5 text-slate-500">{cryptoQrPayload}</p>
                      </div>
                    </div>
                  </article>

                </div>
              ) : (
                <div className="mt-5 rounded-[1.5rem] border border-dashed border-white/15 bg-white/5 px-5 py-8 text-center">
                  <p className="text-lg font-semibold tracking-tight text-white">Crypto payment details are not available right now.</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    When the backend returns a wallet address and QR, they will appear here automatically without a separate load action.
                  </p>
                </div>
              )}
              <div className="mt-5 flex justify-start">
                <button className="rb-btn-secondary px-3 py-2 text-xs" onClick={() => goToStep(2)} type="button">
                  Back to Method
                </button>
              </div>
            </div>
          </Panel>
        </section>
      ) : null}
    </div>
  );
};

export default PaymentPage;
