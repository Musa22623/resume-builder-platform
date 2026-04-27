import { useEffect, useState } from "react";
import api from "../services/api/client";
import Panel from "../components/ui/Panel";
import PageTitleBar from "../components/ui/PageTitleBar";
import { getApiErrorMessage } from "../lib/apiError";

const stripePlans = [
  {
    id: "monthly",
    label: "Monthly",
    title: "Monthly access",
    price: "$19",
    cadence: "/ month",
    chargeLabel: "$19/month",
    summary: "Best if you want full access now and prefer a smaller recurring payment.",
    accent: "Most flexible",
    audience: "Good for a short job search or one focused resume refresh.",
    perks: ["Secure payment via Stripe", "No hidden fees", "Cancel anytime"],
  },
  {
    id: "yearly",
    label: "Yearly",
    title: "Yearly access",
    price: "$190",
    cadence: "/ year",
    chargeLabel: "$190/year",
    savings: "Save $38",
    summary: "Best value for longer search cycles, repeat tailoring, and ongoing resume refreshes.",
    accent: "Most popular",
    audience: "Best for ongoing applications, multiple target roles, and resume updates.",
    perks: ["Secure payment via Stripe", "Instant access after payment", "Cancel anytime"],
    recommended: true,
  },
];

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

const cryptoChecklist = [
  "Choose the supported network that matches your wallet before sending funds.",
  "Copy the wallet address directly from the page to avoid formatting errors.",
  "Use the QR code for a faster mobile-wallet handoff when that is easier.",
];

const trustItems = ["Secure payment via Stripe", "No hidden fees", "Cancel anytime", "Instant access after payment"];
const cryptoTrustItems = ["Secure wallet system", "Auto-detection of transactions", "No manual verification needed"];
const networkDescriptions = {
  "USDT (ERC-20)": "Ethereum network",
  "USDT (TRC-20)": "Tron network - lower fees",
};

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

const buildPreviewQrDataUrl = (network) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
      <rect width="160" height="160" rx="20" fill="#ffffff"/>
      <rect x="18" y="18" width="36" height="36" rx="6" fill="#111827"/>
      <rect x="106" y="18" width="36" height="36" rx="6" fill="#111827"/>
      <rect x="18" y="106" width="36" height="36" rx="6" fill="#111827"/>
      <rect x="28" y="28" width="16" height="16" rx="2" fill="#ffffff"/>
      <rect x="116" y="28" width="16" height="16" rx="2" fill="#ffffff"/>
      <rect x="28" y="116" width="16" height="16" rx="2" fill="#ffffff"/>
      <rect x="70" y="26" width="10" height="10" rx="2" fill="#111827"/>
      <rect x="86" y="26" width="10" height="10" rx="2" fill="#111827"/>
      <rect x="60" y="48" width="10" height="10" rx="2" fill="#111827"/>
      <rect x="76" y="48" width="10" height="10" rx="2" fill="#111827"/>
      <rect x="92" y="48" width="10" height="10" rx="2" fill="#111827"/>
      <rect x="58" y="68" width="12" height="12" rx="2" fill="#111827"/>
      <rect x="76" y="68" width="12" height="12" rx="2" fill="#14b8a6"/>
      <rect x="94" y="68" width="12" height="12" rx="2" fill="#111827"/>
      <rect x="60" y="88" width="10" height="10" rx="2" fill="#111827"/>
      <rect x="76" y="88" width="10" height="10" rx="2" fill="#111827"/>
      <rect x="92" y="88" width="10" height="10" rx="2" fill="#111827"/>
      <rect x="70" y="110" width="10" height="10" rx="2" fill="#111827"/>
      <rect x="86" y="110" width="10" height="10" rx="2" fill="#111827"/>
      <text x="80" y="147" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#64748b">${network} preview</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const cryptoPreviewWallets = [
  {
    network: "USDT (ERC-20)",
    address: "0xFC4A23D5097FcC3eD5b5c50e1D3282C3895CeF3",
    qr_code_data_url: buildPreviewQrDataUrl("ERC20"),
  },
  {
    network: "USDT (TRC-20)",
    address: "TQ7hKx8DkcbWcQwNn6w8b8x7S1Qf1f8vP2",
    qr_code_data_url: buildPreviewQrDataUrl("TRC20"),
  },
];

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
  const [cryptoPaymentStatus, setCryptoPaymentStatus] = useState("waiting");
  const [quoteSeconds, setQuoteSeconds] = useState(15 * 60);

  const startStripeCheckout = async (planType) => {
    setActivePlan(planType);
    try {
      const { data } = await api.post("/api/billing/stripe/checkout-session/", { plan_type: planType });
      window.location.href = data.checkout_url;
    } catch (e) {
      setStatus(getApiErrorMessage(e, "We couldn't start checkout right now. Please try again in a moment."));
      setActivePlan("");
    }
  };

  const loadCrypto = async () => {
    setIsLoadingCrypto(true);
    try {
      const { data } = await api.get("/api/billing/crypto/payment-info/");
      setWallets(data.wallets || []);
      setSelectedWalletNetwork((current) => {
        if (current && data.wallets?.some((wallet) => wallet.network === current)) return current;
        return data.wallets?.[0]?.network || "";
      });
      if (!data.wallets?.length) setStatus("Live crypto details are not ready yet, so a preview address and QR are shown for the UI.");
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

  const markCryptoPaymentSent = () => {
    setCryptoPaymentStatus("detecting");
    setStatus("Payment marked as sent. We are watching the selected network for the incoming transfer.");
  };

  const checkCryptoPaymentStatus = () => {
    setCryptoPaymentStatus("detecting");
    setStatus("Still waiting for network confirmation. Keep this page open while detection continues.");
  };

  const statusTone = status ? getStatusTone(status) : "neutral";
  const selectedPlanMeta = stripePlans.find((plan) => plan.id === selectedPlan);
  const selectedMethodMeta = paymentMethods.find((method) => method.id === selectedMethod);
  const walletOptions = wallets.length ? wallets : cryptoPreviewWallets;
  const isUsingPreviewWallets = !wallets.length;
  const selectedWallet = walletOptions.find((wallet) => wallet.network === selectedWalletNetwork) || null;
  const selectedChargeLabel = selectedPlanMeta?.chargeLabel || "";
  const cryptoAmount = selectedPlanMeta?.id === "yearly" ? "190" : "19";
  const cryptoStatusLabel =
    cryptoPaymentStatus === "confirmed"
      ? "Payment confirmed"
      : cryptoPaymentStatus === "detecting"
        ? "Detecting transaction"
        : "Waiting for payment";
  const canContinueToPayment = Boolean(selectedPlanMeta && selectedMethodMeta && (selectedMethod !== "crypto" || selectedWalletNetwork));

  useEffect(() => {
    if (currentStep === 3 && selectedMethod === "crypto" && selectedPlan && !wallets.length && !isLoadingCrypto) {
      loadCrypto();
    }
  }, [currentStep, isLoadingCrypto, selectedMethod, selectedPlan, wallets.length]);

  useEffect(() => {
    setQuoteSeconds(15 * 60);
    setCryptoPaymentStatus("waiting");
  }, [selectedPlan, selectedWalletNetwork, selectedMethod]);

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
              Start with the plan that fits your timeline. Yearly saves $38 compared with paying monthly for 12 months.
            </p>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {stripePlans.map((plan) => {
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
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-teal-100 text-[11px] text-teal-700">✓</span>
                            {perk}
                          </span>
                        ))}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
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
                                ✓ {item}
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
                    const isSelected = selectedWalletNetwork === wallet.network;

                    return (
                      <button
                        className={`rounded-xl border px-4 py-3 text-left transition duration-200 ${
                          isSelected
                            ? "border-teal-500 bg-teal-50 shadow-[0_14px_30px_rgba(13,148,136,0.16)]"
                            : "border-slate-200 bg-white hover:border-teal-200 hover:bg-teal-50/50"
                        }`}
                        key={wallet.network}
                        onClick={() => setSelectedWalletNetwork(wallet.network)}
                        type="button"
                      >
                        <span className="block text-sm font-semibold text-slate-950">{wallet.network}</span>
                        <span className="mt-1 block text-xs text-slate-500">{networkDescriptions[wallet.network] || "Supported wallet network"}</span>
                      </button>
                    );
                  })}
                </div>
                {selectedWallet ? (
                  <div className="mt-4 flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-3 sm:flex-row sm:items-center">
                    <div className="w-full max-w-[112px] rounded-lg border border-slate-200 bg-white p-2">
                      <img
                        alt={`${selectedWallet.network} wallet qr preview`}
                        className="aspect-square w-full rounded-md object-cover"
                        src={selectedWallet.qr_code_data_url}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-950">Preview for {selectedWallet.network}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">QR and address will be shown again on the payment step.</p>
                      <p className="mt-2 break-all text-xs font-medium text-slate-500">{maskWalletAddress(selectedWallet.address)}</p>
                    </div>
                  </div>
                ) : null}
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
                    ✓ {item}
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
                  onClick={() => startStripeCheckout(selectedPlanMeta.id)}
                  type="button"
                >
                  <span>{activePlan === selectedPlanMeta.id ? "Opening secure checkout..." : "Pay securely with Stripe"}</span>
                  <ArrowIcon />
                </button>
              </article>
              <div className="mt-5 flex justify-start">
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
            <div className="px-5 pt-5 sm:px-6 sm:pt-6">
              {renderWizardProgress()}
            </div>
            <div className="border-b border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.92),rgba(15,23,42,0.82),rgba(8,145,178,0.55))] px-5 py-5 sm:px-6 sm:py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-300">Crypto payment</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-[1.75rem]">Follow these payment details exactly</h2>
              <p className="mt-2 max-w-full text-sm leading-6 text-slate-300">
                Send the exact USDT amount on the selected network. We will detect the transaction automatically.
              </p>
              <div className="mt-4 grid gap-3 lg:grid-cols-4">
                <div className="rounded-xl border border-white/10 bg-white/10 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">Send exactly</p>
                  <p className="mt-1 text-2xl font-semibold text-white">{cryptoAmount} USDT</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/10 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">Network</p>
                  <p className="mt-1 text-lg font-semibold text-white">{selectedWallet?.network || "Choose network"}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/10 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">Status</p>
                  <p className="mt-1 text-lg font-semibold text-amber-100">{cryptoStatusLabel}</p>
                </div>
                <div className="rounded-xl border border-amber-300/25 bg-amber-400/10 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-100">Price valid for</p>
                  <p className="mt-1 text-2xl font-semibold text-amber-50">{formatQuoteTime(quoteSeconds)}</p>
                </div>
              </div>
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              <div className="grid gap-2.5">
                {cryptoChecklist.map((item, index) => (
                  <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-6 text-slate-200" key={item}>
                    <span className="inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-[11px] font-bold text-white">
                      {index + 1}
                    </span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              {selectedWallet ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                      {isLoadingCrypto ? <SpinnerIcon /> : null}
                      <span>{isLoadingCrypto ? "Generating your payment address..." : isUsingPreviewWallets ? "Preview payment details" : "Live payment details"}</span>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${cryptoPaymentStatus === "detecting" ? "bg-amber-400/15 text-amber-100" : "bg-teal-400/15 text-teal-100"}`}>
                      {cryptoStatusLabel}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {walletOptions.map((wallet) => {
                      const isSelected = wallet.network === selectedWallet.network;

                      return (
                        <button
                          className={`rounded-xl border px-4 py-2 text-left text-xs font-semibold transition duration-200 ${
                            isSelected
                              ? "border-teal-300 bg-teal-400/20 text-teal-50 shadow-[0_12px_24px_rgba(20,184,166,0.16)]"
                              : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10"
                          }`}
                          key={wallet.network}
                          onClick={() => setSelectedWalletNetwork(wallet.network)}
                          type="button"
                        >
                          <span className="block">{wallet.network}</span>
                          <span className="mt-1 block font-normal text-slate-300">{networkDescriptions[wallet.network] || "Supported network"}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="rounded-xl border border-red-300/40 bg-red-500/15 px-4 py-3 text-red-50">
                    <p className="text-sm font-bold">⚠ Send only USDT on {selectedWallet.network} network.</p>
                    <p className="mt-1 text-sm leading-6">Sending other assets or using another network will result in permanent loss.</p>
                  </div>

                  <article className="rounded-xl border border-white/10 bg-white/5 p-4 sm:p-5">
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-start">
                      <div className="space-y-4">
                        <div className="rounded-xl border border-white/10 bg-slate-950/30 px-4 py-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Wallet address</p>
                              <p className="mt-2 text-2xl font-semibold tracking-tight text-white">{maskWalletAddress(selectedWallet.address)}</p>
                              <p className="mt-1 text-xs text-slate-400">{selectedWallet.network} | {networkDescriptions[selectedWallet.network]}</p>
                            </div>
                            <button
                              className="rb-btn-primary h-12 min-w-40 gap-2"
                              onClick={() => copyWalletAddress(selectedWallet.network, selectedWallet.address)}
                              type="button"
                            >
                              <CopyIcon />
                              <span>{copiedNetwork === selectedWallet.network ? "Copied ✓" : "Copy address"}</span>
                            </button>
                          </div>
                          <p className="mt-3 break-all rounded-lg bg-white/5 px-3 py-2 text-sm leading-6 text-slate-200">{selectedWallet.address}</p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                          {[
                            { label: "Waiting for payment", active: cryptoPaymentStatus === "waiting" },
                            { label: "Detecting transaction", active: cryptoPaymentStatus === "detecting" },
                            { label: "Payment confirmed ✓", active: cryptoPaymentStatus === "confirmed" },
                          ].map((item) => (
                            <div
                              className={`rounded-xl border px-3 py-3 text-sm font-semibold ${
                                item.active ? "border-teal-300 bg-teal-400/15 text-teal-50" : "border-white/10 bg-white/5 text-slate-400"
                              }`}
                              key={item.label}
                            >
                              {item.label}
                            </div>
                          ))}
                        </div>

                        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                          <p className="text-sm font-semibold text-white">After payment</p>
                          <p className="mt-1 text-sm leading-6 text-slate-300">Resume Builder unlocks instantly after transaction confirmation.</p>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row">
                          <button className="rb-btn-primary h-11 justify-center" onClick={markCryptoPaymentSent} type="button">
                            I've sent payment
                          </button>
                          <button className="rb-btn-secondary-dark h-11 justify-center" onClick={checkCryptoPaymentStatus} type="button">
                            Check payment status
                          </button>
                        </div>
                      </div>

                      <div className="mx-auto w-full max-w-[260px] rounded-xl border border-white/10 bg-white p-3 text-slate-900">
                        <img
                          alt={`${selectedWallet.network} wallet qr`}
                          className="aspect-square w-full rounded-[1rem] object-cover"
                          src={selectedWallet.qr_code_data_url}
                        />
                        <p className="mt-3 text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Scan with your wallet app</p>
                        <p className="mt-2 text-center text-sm font-semibold text-slate-900">{cryptoAmount} USDT</p>
                        <p className="mt-1 text-center text-xs text-slate-500">{maskWalletAddress(selectedWallet.address)}</p>
                      </div>
                    </div>
                  </article>

                  <div className="grid gap-2 sm:grid-cols-3">
                    {cryptoTrustItems.map((item) => (
                      <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200" key={item}>
                        ✓ {item}
                      </div>
                    ))}
                  </div>
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
