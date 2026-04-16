import { useState } from "react";
import api from "../services/api/client";

const PaymentPage = () => {
  const [wallets, setWallets] = useState([]);
  const [status, setStatus] = useState("");

  const startStripeCheckout = async (planType) => {
    try {
      const { data } = await api.post("/api/billing/stripe/checkout-session/", { plan_type: planType });
      window.location.href = data.checkout_url;
    } catch (e) {
      setStatus(e.response?.data?.detail || "Failed to start Stripe checkout.");
    }
  };

  const loadCrypto = async () => {
    try {
      const { data } = await api.get("/api/billing/crypto/payment-info/");
      setWallets(data.wallets || []);
      if (!data.wallets?.length) setStatus("No crypto payment wallets configured by admin yet.");
    } catch {
      setStatus("Failed to load crypto payment info.");
    }
  };

  return (
    <div>
      <h2>Payment & Subscription</h2>
      <button onClick={() => startStripeCheckout("monthly")}>Pay Monthly with Stripe</button>
      <button onClick={() => startStripeCheckout("yearly")}>Pay Yearly with Stripe</button>

      <hr />
      <h3>Pay with Crypto</h3>
      <button onClick={loadCrypto}>Load Crypto Wallets</button>
      {wallets.map((w) => (
        <div key={w.network} style={{ border: "1px solid #ccc", marginTop: 12, padding: 12 }}>
          <strong>{w.network}</strong>
          <p>{w.address}</p>
          <img src={w.qr_code_data_url} alt={`${w.network} wallet qr`} width={150} />
        </div>
      ))}
      <p>{status}</p>
    </div>
  );
};

export default PaymentPage;
