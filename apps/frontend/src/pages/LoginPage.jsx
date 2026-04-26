import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getApiErrorMessage } from "../lib/apiError";
import api from "../services/api/client";

const CHECKPOINTS = [
  "Open your saved resume and target job details in one place.",
  "Check trial and billing status without hunting through settings.",
  "Pick up from dashboard, resume builder, or payment in a single step.",
];

const forgotPanelId = "forgot-password-panel";

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [forgotEmail, setForgotEmail] = useState("");
  const [error, setError] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isForgotSubmitting, setIsForgotSubmitting] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.email.trim() || !form.password.trim()) {
      setError("Enter both your email and password to continue.");
      return;
    }

    setIsSubmitting(true);

    try {
      await login(form.email, form.password);
      navigate("/dashboard");
    } catch (err) {
      setError(getApiErrorMessage(err, "We couldn't sign you in with those details."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const onForgotPassword = async () => {
    const email = forgotEmail.trim();

    setForgotError("");
    setForgotSuccess("");

    if (!email) {
      setForgotError("Enter your account email so we can send reset instructions.");
      return;
    }

    setIsForgotSubmitting(true);

    try {
      const response = await api.post("/api/v1/auth/forgot-password/", { "email": email });
      setForgotSuccess(response.message || "If an account exists for that email, reset instructions are on the way.");
    } catch (err) {
      setForgotError(getApiErrorMessage(err, "We couldn't send reset instructions right now."));
    } finally {
      setIsForgotSubmitting(false);
    }
  };

  const toggleForgotPassword = () => {
    setShowForgotPassword((current) => {
      const next = !current;
      if (next && !forgotEmail && form.email) {
        setForgotEmail(form.email);
      }
      setForgotError("");
      setForgotSuccess("");
      return next;
    });
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-9rem)] max-w-7xl items-center px-4 py-10 lg:px-6">
      <div className="grid w-full gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[2rem] border border-white/80 bg-slate-900 p-8 text-white shadow-[0_20px_60px_rgba(15,23,42,0.18)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-300">Sign in</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">Return to your resume workspace without losing momentum.</h1>
          <p className="mt-4 text-sm leading-7 text-slate-300">
            Sign in to continue updating your resume, reviewing job targets, and checking access details from the dashboard.
          </p>

          <div className="mt-8 space-y-3">
            {CHECKPOINTS.map((item) => (
              <div className="flex items-start gap-3 rounded-[1.4rem] border border-white/10 bg-white/5 px-4 py-4" key={item}>
                <span className="mt-1 h-2.5 w-2.5 rounded-full bg-teal-300" />
                <p className="text-sm leading-7 text-slate-200">{item}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
            <p className="text-sm font-semibold text-white">Use your account email to continue.</p>
            <p className="mt-2 text-sm leading-7 text-slate-300">
              Sign in with the same email you used during registration to get back into your workspace.
            </p>
          </div>
        </div>

        <form
          className="rounded-[2rem] border border-white/80 bg-white/90 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.1)]"
          onSubmit={onSubmit}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">Welcome back</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">Access your workspace</h2>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">Dashboard first</span>
          </div>
          <p className="mt-4 text-sm leading-7 text-slate-500">
            Use the account details you created during signup to get back into your workspace.
          </p>
          <div className="mt-8 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Email</label>
              <input
                className="rb-field"
                autoComplete="email"
                placeholder="name@email.com"
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                value={form.email}
              />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label className="block text-sm font-semibold text-slate-700">Password</label>
                <button
                  aria-controls={forgotPanelId}
                  aria-expanded={showForgotPassword}
                  className="inline-flex items-center gap-2 rounded-full px-2 py-1 text-sm font-semibold text-teal-700 transition hover:bg-teal-50 hover:text-teal-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-100"
                  onClick={toggleForgotPassword}
                  type="button"
                >
                  Forgot password?
                  <span
                    className={`text-base leading-none transition-transform duration-300 ${showForgotPassword ? "rotate-45" : ""}`}
                    aria-hidden="true"
                  >
                    +
                  </span>
                </button>
              </div>
              <input
                className="rb-field"
                type="password"
                autoComplete="current-password"
                placeholder="Password"
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                value={form.password}
              />
            </div>
          </div>
          <div
            className={`grid transition-[grid-template-rows,opacity,margin] duration-300 ease-out ${
              showForgotPassword ? "mt-5 grid-rows-[1fr] opacity-100" : "mt-0 grid-rows-[0fr] opacity-0"
            }`}
            id={forgotPanelId}
          >
            <div className="overflow-hidden">
              <div className="rounded-[1.5rem] border border-teal-100 bg-gradient-to-br from-teal-50 to-cyan-50/70 p-5 shadow-[0_16px_40px_rgba(20,184,166,0.12)]">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Reset your password</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">Enter your account email and we'll send reset instructions.</p>
                  </div>
                  <span className="w-fit rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-teal-700 shadow-sm">
                    Email link
                  </span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                  <input
                    className="rb-field border-teal-100 bg-white"
                    autoComplete="email"
                    placeholder="name@email.com"
                    onChange={(e) => setForgotEmail(e.target.value)}
                    value={forgotEmail}
                  />
                  <button
                    className="rb-btn-dark whitespace-nowrap disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70"
                    disabled={isForgotSubmitting}
                    onClick={onForgotPassword}
                    type="button"
                  >
                    {isForgotSubmitting ? "Sending..." : "Send reset link"}
                  </button>
                </div>
                {forgotError ? <p className="mt-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{forgotError}</p> : null}
                {forgotSuccess ? (
                  <p className="mt-3 rounded-2xl bg-white/80 px-4 py-3 text-sm font-medium text-teal-800">{forgotSuccess}</p>
                ) : null}
              </div>
            </div>
          </div>
          <button
            className="rb-btn-primary mt-6 w-full disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Signing in..." : "Sign In"}
          </button>
          {error ? <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p> : null}

          <div className="mt-4 flex items-center justify-between gap-4 rounded-[1.3rem] bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <span>Need an account first?</span>
            <Link className="font-semibold text-teal-700 transition hover:text-teal-800" to="/signup">
              Create one here
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
