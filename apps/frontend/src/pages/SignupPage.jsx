import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const SignupPage = () => {
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await signup(form);
      await login(form.username, form.password);
      navigate("/dashboard");
    } catch (err) {
      setError(err?.response?.data?.detail || "Unable to create the account right now.");
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-9rem)] max-w-7xl items-center px-4 py-10 lg:px-6">
      <div className="grid w-full gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[2rem] border border-white/80 bg-white/85 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">Start free</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900">Create an account and start tailoring resumes in minutes.</h1>
          <p className="mt-4 text-sm leading-7 text-slate-500">
            The MVP is designed to get you from sign-up to first draft quickly, with trial visibility and a clear path to billing when needed.
          </p>
        </div>

        <form
          className="rounded-[2rem] border border-white/80 bg-white/90 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.1)]"
          onSubmit={onSubmit}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">Create account</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">Set up your workspace</h2>
          <div className="mt-8 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Username</label>
              <input
                className="rb-field"
                placeholder="Username"
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                value={form.username}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Email</label>
              <input
                className="rb-field"
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
                placeholder="Password"
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                value={form.password}
              />
            </div>
          </div>
          <button className="rb-btn-primary mt-6 w-full" type="submit">
            Create Account
          </button>
          {error ? <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p> : null}
          <Link className="mt-4 inline-flex text-sm font-semibold text-teal-700 transition hover:text-teal-800" to="/login">
            Have account?
          </Link>
        </form>
      </div>
    </div>
  );
};

export default SignupPage;
