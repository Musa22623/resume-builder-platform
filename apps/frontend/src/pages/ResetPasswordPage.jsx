import { useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { getApiErrorMessage } from "../lib/apiError";
import api from "../services/api/client";

const PASSWORD_RULES = [
  "Use at least 8 characters.",
  "Make both password fields match.",
  "Return to sign in after the reset completes.",
];

const ResetPasswordPage = () => {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const uid = searchParams.get("uid") || params.uid || "";
  const token = searchParams.get("token") || params.token || "";
  const [form, setForm] = useState({ newPassword: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordStatus = useMemo(() => {
    const hasMinLength = form.newPassword.length >= 8;
    const matches = form.newPassword && form.newPassword === form.confirmPassword;
    return { hasMinLength, matches };
  }, [form.confirmPassword, form.newPassword]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!uid || !token) {
      setError("This reset link is missing required details. Please request a new password reset email.");
      return;
    }

    if (!passwordStatus.hasMinLength) {
      setError("Use at least 8 characters for your new password.");
      return;
    }

    if (!passwordStatus.matches) {
      setError("Make sure both password fields match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await api.post("/api/v1/auth/reset-password/", {
        "uid": uid,
        "token": token,
        "new_password": form.newPassword,
        "confirm_password": form.confirmPassword,
      });
      setSuccess(response.message || "Password has been reset successfully.");
      setForm({ newPassword: "", confirmPassword: "" });
    } catch (err) {
      setError(getApiErrorMessage(err, "We couldn't reset your password right now."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-9rem)] max-w-6xl items-center px-4 py-10 lg:px-6">
      <div className="grid w-full gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[2rem] border border-white/80 bg-slate-900 p-8 text-white shadow-[0_20px_60px_rgba(15,23,42,0.18)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-300">Password reset</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">Choose a new password for your workspace.</h1>
          <p className="mt-4 text-sm leading-7 text-slate-300">
            Finish the reset from the email link, then sign in with your updated password.
          </p>

          <div className="mt-8 space-y-3">
            {PASSWORD_RULES.map((item) => (
              <div className="flex items-start gap-3 rounded-[1.4rem] border border-white/10 bg-white/5 px-4 py-4" key={item}>
                <span className="mt-1 h-2.5 w-2.5 rounded-full bg-teal-300" />
                <p className="text-sm leading-7 text-slate-200">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <form
          className="rounded-[2rem] border border-white/80 bg-white/90 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.1)]"
          onSubmit={onSubmit}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">Secure access</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">Reset password</h2>
            </div>
            <span
              className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                uid && token ? "bg-teal-50 text-teal-700" : "bg-rose-50 text-rose-700"
              }`}
            >
              {uid && token ? "Link ready" : "Link missing"}
            </span>
          </div>

          <div className="mt-8 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">New password</label>
              <input
                className="rb-field"
                type="password"
                autoComplete="new-password"
                placeholder="New password"
                onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                value={form.newPassword}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Confirm password</label>
              <input
                className="rb-field"
                type="password"
                autoComplete="new-password"
                placeholder="Confirm password"
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                value={form.confirmPassword}
              />
            </div>
          </div>

          <div className="mt-5 grid gap-3 rounded-[1.4rem] bg-slate-50 p-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium text-slate-600">Minimum length</span>
              <span className={`font-semibold ${passwordStatus.hasMinLength ? "text-teal-700" : "text-slate-400"}`}>
                {passwordStatus.hasMinLength ? "Ready" : "8+ characters"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium text-slate-600">Password match</span>
              <span className={`font-semibold ${passwordStatus.matches ? "text-teal-700" : "text-slate-400"}`}>
                {passwordStatus.matches ? "Matched" : "Waiting"}
              </span>
            </div>
          </div>

          <button
            className="rb-btn-primary mt-6 w-full disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSubmitting || Boolean(success)}
            type="submit"
          >
            {isSubmitting ? "Resetting..." : "Reset Password"}
          </button>

          {error ? <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p> : null}
          {success ? (
            <div className="mt-4 rounded-[1.3rem] bg-teal-50 px-4 py-3 text-sm font-medium text-teal-800">
              <p>{success}</p>
              <Link className="mt-3 inline-flex font-semibold text-teal-700 transition hover:text-teal-900" to="/login">
                Back to sign in
              </Link>
            </div>
          ) : null}
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
