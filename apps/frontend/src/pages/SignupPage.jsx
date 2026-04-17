import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ONBOARDING_STEPS = [
  "Create your account with email, username, and password.",
  "Land in the dashboard right after sign-up.",
  "Start resume editing, job targeting, and billing review from one place.",
];

const SignupPage = () => {
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.username.trim() || !form.email.trim() || !form.password.trim()) {
      setError("Fill in username, email, and password to create your account.");
      return;
    }

    if (!form.email.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }

    if (form.password.length < 8) {
      setError("Use at least 8 characters for the password.");
      return;
    }

    setIsSubmitting(true);

    try {
      await signup(form);
      // New accounts should land in the main workspace immediately after registration.
      await login(form.username, form.password);
      navigate("/dashboard");
    } catch (err) {
      setError(err?.response?.data?.detail || "Unable to create the account right now.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-9rem)] max-w-7xl items-center px-4 py-10 lg:px-6">
      <div className="grid w-full gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[2rem] border border-white/80 bg-white/85 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">Start free</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900">Create your account and move straight into the workspace.</h1>
          <p className="mt-4 text-sm leading-7 text-slate-500">
            The MVP flow is simple on purpose: sign up, arrive in the dashboard, then continue with resume entry, job targeting, and billing only
            when you need it.
          </p>

          <div className="mt-8 space-y-3">
            {ONBOARDING_STEPS.map((item, index) => (
              <div className="flex items-start gap-4 rounded-[1.4rem] border border-slate-200 bg-white px-4 py-4" key={item}>
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-50 text-sm font-semibold text-teal-700">
                  0{index + 1}
                </span>
                <p className="pt-1 text-sm leading-7 text-slate-600">{item}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-[1.5rem] border border-teal-100 bg-teal-50/70 p-5">
            <p className="text-sm font-semibold text-slate-900">What happens next</p>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              After registration, the page signs you in automatically and sends you to the dashboard so you can keep moving without another login step.
            </p>
          </div>
        </div>

        <form
          className="rounded-[2rem] border border-white/80 bg-white/90 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.1)]"
          onSubmit={onSubmit}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">Create account</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">Set up your workspace</h2>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">Trial ready</span>
          </div>
          <p className="mt-4 text-sm leading-7 text-slate-500">
            Use your real account details here. After sign-up, you will be signed in automatically and taken to the dashboard.
          </p>
          <div className="mt-8 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Username</label>
              <input
                className="rb-field"
                autoComplete="username"
                placeholder="Username"
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                value={form.username}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Email</label>
              <input
                className="rb-field"
                autoComplete="email"
                placeholder="Email"
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                value={form.email}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Password</label>
              <input
                className="rb-field"
                type="password"
                autoComplete="new-password"
                placeholder="Password"
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                value={form.password}
              />
            </div>
          </div>
          <button
            className="rb-btn-primary mt-6 w-full disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Creating account..." : "Create Account"}
          </button>
          {error ? <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p> : null}

          <div className="mt-4 flex items-center justify-between gap-4 rounded-[1.3rem] bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <span>Already have an account?</span>
            <Link className="font-semibold text-teal-700 transition hover:text-teal-800" to="/login">
              Sign in instead
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignupPage;
