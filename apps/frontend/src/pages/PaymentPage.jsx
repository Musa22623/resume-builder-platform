import { useState } from "react";
import api from "../services/api/client";
import PageIntro from "../components/ui/PageIntro";
import Panel from "../components/ui/Panel";
import { getApiErrorMessage } from "../lib/apiError";

const PaymentPage = () => {
  const [wallets, setWallets] = useState([]);
  const [status, setStatus] = useState("");

  const startStripeCheckout = async (planType) => {
    try {
      const { data } = await api.post("/api/billing/stripe/checkout-session/", { plan_type: planType });
      window.location.href = data.checkout_url;
    } catch (e) {
      setStatus(getApiErrorMessage(e, "Failed to start Stripe checkout."));
    }
  };

  const loadCrypto = async () => {
    try {
      const { data } = await api.get("/api/billing/crypto/payment-info/");
      setWallets(data.wallets || []);
      if (!data.wallets?.length) setStatus("No crypto payment wallets configured by admin yet.");
    } catch (e) {
      setStatus(getApiErrorMessage(e, "Failed to load crypto payment info."));
    }
  };

  return (
    <div className="space-y-6">
      <PageIntro
        description="Stripe remains the fastest path to access. Crypto instructions can be loaded when admin-configured wallets are enabled."
        eyebrow="Billing"
        title="Choose the payment path that fits your workflow."
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <Panel className="p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">Stripe</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">Hosted checkout</h2>
          <p className="mt-3 text-sm leading-7 text-slate-500">Use the existing backend checkout flow for a monthly or yearly plan.</p>
          <div className="mt-6 grid gap-3">
            <button className="rb-btn-primary" onClick={() => startStripeCheckout("monthly")} type="button">
              Pay Monthly with Stripe
            </button>
            <button className="rb-btn-secondary" onClick={() => startStripeCheckout("yearly")} type="button">
              Pay Yearly with Stripe
            </button>
          </div>
        </Panel>

        <Panel className="p-6 text-white shadow-[0_18px_50px_rgba(15,23,42,0.14)]" tone="dark">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-300">Crypto</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight">Direct wallet instructions</h2>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            Load configured wallet addresses and QR codes for stablecoin transfers when that payment rail is enabled.
          </p>
          <button className="rb-btn-secondary-dark mt-6" onClick={loadCrypto} type="button">
            Load Crypto Wallets
          </button>
        </Panel>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {wallets.map((w) => (
          <Panel className="p-6" key={w.network}>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">Network</p>
            <strong className="mt-3 block text-2xl font-semibold tracking-tight text-slate-900">{w.network}</strong>
            <p className="mt-4 break-all rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-7 text-slate-600">{w.address}</p>
            <img className="mt-5 rounded-2xl border border-slate-200" src={w.qr_code_data_url} alt={`${w.network} wallet qr`} width={180} />
          </Panel>
        ))}
      </section>

      <p className="text-sm text-slate-500">{status}</p>
    </div>
  );
};

export default PaymentPage;
