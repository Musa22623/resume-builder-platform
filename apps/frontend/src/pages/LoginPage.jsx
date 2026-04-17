import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Keep QA login shortcuts in one place so they stay easy to update or remove.
const QUICK_LOGIN_ACCOUNTS = [
  {
    id: "admin",
    label: "Admin Quick Login",
    email: "admin@resume-builder.local",
    username: "admin_demo",
    password: "admin1234!",
    destination: "/admin",
    user: {
      username: "admin_demo",
      email: "admin@resume-builder.local",
      is_platform_admin: true,
      is_staff: true,
    },
  },
  {
    id: "user",
    label: "User Quick Login",
    email: "user@resume-builder.local",
    username: "user_demo",
    password: "user1234!",
    destination: "/dashboard",
    user: {
      username: "user_demo",
      email: "user@resume-builder.local",
      is_platform_admin: false,
      is_staff: false,
    },
  },
];

const CHECKPOINTS = [
  "Open your saved resume and target job details in one place.",
  "Check trial and billing status without hunting through settings.",
  "Pick up from dashboard, resume builder, or payment in a single step.",
];

const LoginPage = () => {
  const { forceLogin, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.username.trim() || !form.password.trim()) {
      setError("Enter both your username and password to continue.");
      return;
    }

    setIsSubmitting(true);

    try {
      await login(form.username, form.password);
      navigate("/dashboard");
    } catch (err) {
      setError(err?.response?.data?.detail || "We couldn't sign you in with those details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = (account) => {
    setError("");
    setForm({ username: account.username, password: account.password });
    forceLogin(account.user);
    navigate(account.destination);
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-9rem)] max-w-7xl items-center px-4 py-10 lg:px-6">
      <div className="grid w-full gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[2rem] border border-white/80 bg-slate-900 p-8 text-white shadow-[0_20px_60px_rgba(15,23,42,0.18)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-300">Sign in</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">Return to your resume workspace without losing momentum.</h1>
          <p className="mt-4 text-sm leading-7 text-slate-300">
            The web MVP is meant to get users back into editing quickly. Sign in to continue resume updates, review job targets, and
            check access status from the dashboard.
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
            <p className="text-sm font-semibold text-white">Quick login is still editable from this file.</p>
            <p className="mt-2 text-sm leading-7 text-slate-300">
              Update or remove the `QUICK_LOGIN_ACCOUNTS` constant in `LoginPage.jsx` whenever you want.
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
            Use your account details below, or jump in with one of the editable QA accounts for layout review.
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
              <label className="mb-2 block text-sm font-semibold text-slate-700">Password</label>
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

          <div className="mt-6 border-t border-slate-200 pt-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">Quick login accounts</p>
                <p className="mt-1 text-sm text-slate-500">Useful when you want to review the UI without creating fresh test users.</p>
              </div>
              <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">Editable</span>
            </div>
            <div className="mt-4 grid gap-3">
              {QUICK_LOGIN_ACCOUNTS.map((account) => (
                <button
                  className="rounded-[1.5rem] border border-slate-200 bg-white p-4 text-left transition duration-200 hover:border-teal-200 hover:bg-teal-50"
                  key={account.id}
                  onClick={() => handleQuickLogin(account)}
                  type="button"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{account.label}</p>
                      <p className="mt-1 text-sm text-slate-500">{account.email}</p>
                    </div>
                    <span className="inline-flex rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                      {account.user.is_platform_admin ? "Admin" : "User"}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-1 text-sm text-slate-600">
                    <p>Username: {account.username}</p>
                    <p>Password: {account.password}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
