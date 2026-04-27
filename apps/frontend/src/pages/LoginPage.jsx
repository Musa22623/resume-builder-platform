import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getApiErrorMessage } from "../lib/apiError";
import api from "../services/api/client";

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
    <div className="mx-auto flex min-h-[calc(100vh-9rem)] max-w-6xl items-center px-4 py-8 lg:px-6">
      <div className="grid w-full gap-5 lg:grid-cols-[1.08fr_0.72fr] lg:items-stretch">
        <form
          className="rounded-2xl border border-teal-100 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.14)] sm:p-8"
          onSubmit={onSubmit}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">Welcome back</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Sign in to continue your resume
              </h1>
            </div>
            <span className="hidden rounded-lg bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700 sm:inline-flex">Resume workspace</span>
          </div>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">
            Enter your email and password to open your saved resume draft.
          </p>
          <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50/80 p-4 shadow-inner sm:p-5">
            <div className="space-y-5">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <label className="mb-2 block text-sm font-semibold text-slate-700">Email</label>
                <input
                  className="rb-field bg-white text-base"
                  autoComplete="email"
                  placeholder="name@email.com"
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  value={form.email}
                />
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="block text-sm font-semibold text-slate-700">Password</label>
                  <button
                    aria-controls={forgotPanelId}
                    aria-expanded={showForgotPassword}
                    className="inline-flex items-center gap-1.5 rounded-md px-1 py-1 text-sm font-semibold text-teal-700 underline decoration-2 underline-offset-4 transition hover:bg-teal-50 hover:text-teal-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-100"
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
                  className="rb-field bg-white text-base"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Password"
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  value={form.password}
                />
              </div>
            </div>
          </div>
          <div
            className={`grid transition-[grid-template-rows,opacity,margin] duration-300 ease-out ${
              showForgotPassword ? "mt-5 grid-rows-[1fr] opacity-100" : "mt-0 grid-rows-[0fr] opacity-0"
            }`}
            id={forgotPanelId}
          >
            <div className="overflow-hidden">
              <div className="rounded-xl border border-teal-100 bg-teal-50/80 p-5 shadow-[0_16px_40px_rgba(20,184,166,0.10)]">
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
                {forgotError ? <p className="mt-3 rounded-lg bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{forgotError}</p> : null}
                {forgotSuccess ? (
                  <p className="mt-3 rounded-lg bg-white/80 px-4 py-3 text-sm font-medium text-teal-800">{forgotSuccess}</p>
                ) : null}
              </div>
            </div>
          </div>
          <div aria-live="polite" className="mt-5 min-h-[3.25rem]">
            {error ? (
              <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                {error}
              </p>
            ) : null}
          </div>
          <button
            className="rb-btn-primary mt-1 h-14 w-full text-base shadow-[0_18px_36px_rgba(13,148,136,0.28)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Signing in..." : "Sign In"}
          </button>

          <div className="mt-5 flex flex-col gap-2 rounded-xl border border-teal-100 bg-teal-50/70 px-4 py-4 text-sm text-slate-700 sm:flex-row sm:items-center sm:justify-between">
            <span className="font-medium">Need an account first?</span>
            <Link className="font-semibold text-teal-800 underline decoration-2 underline-offset-4 transition hover:text-teal-950" to="/signup">
              Create account
            </Link>
          </div>
        </form>

        <aside className="hidden rounded-2xl border border-slate-800 bg-slate-900 p-6 text-white shadow-[0_20px_60px_rgba(15,23,42,0.16)] lg:block">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-300">Resume Builder</p>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight">Your resume workspace is ready.</h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Sign in with your account email to continue editing your saved resume.
          </p>
        </aside>
      </div>
    </div>
  );
};

export default LoginPage;
