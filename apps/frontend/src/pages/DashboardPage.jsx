import { useEffect, useState } from "react";
import api from "../services/api/client";

const DashboardPage = () => {
  const [trial, setTrial] = useState(null);

  useEffect(() => {
    api.get("/api/billing/trial/me/").then((res) => setTrial(res.data)).catch(() => setTrial(null));
  }, []);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/80 bg-white/85 p-8 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">Dashboard</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900">Resume Builder workspace</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-500">
          Track access, resume progress, and the next steps in your resume workflow from one place.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Trial remaining</p>
          <p className="mt-4 text-4xl font-semibold tracking-tight text-slate-900">{trial?.remaining_days ?? "..."}</p>
          <p className="mt-2 text-sm text-slate-500">days left before payment is required.</p>
        </div>
        <div className="rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Resume status</p>
          <p className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">Draft workflow ready</p>
          <p className="mt-2 text-sm leading-7 text-slate-500">Save profile data, add a target role, then move into review and payment when needed.</p>
        </div>
        <div className="rounded-[2rem] border border-white/80 bg-slate-900 p-6 text-white shadow-[0_18px_50px_rgba(15,23,42,0.14)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-300">Quick actions</p>
          <div className="mt-5 grid gap-3">
            <a className="rb-btn-secondary-dark justify-start px-4 py-3" href="/resume">
              Edit Resume
            </a>
            <a className="rb-btn-secondary-dark justify-start px-4 py-3" href="/job">
              Add Job Description
            </a>
            <a className="rb-btn-secondary-dark justify-start px-4 py-3" href="/payment">
              Open Billing
            </a>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[2rem] border border-white/80 bg-white/85 p-8 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">Recommended flow</p>
          <ol className="mt-6 space-y-4 text-sm text-slate-600">
            <li className="rounded-3xl bg-slate-50 p-4">Capture or update your base resume details.</li>
            <li className="rounded-3xl bg-slate-50 p-4">Add the job post you want to target.</li>
            <li className="rounded-3xl bg-slate-50 p-4">Review AI-assisted wording for summary and experience sections.</li>
          </ol>
        </div>
        <div className="rounded-[2rem] border border-white/80 bg-white/85 p-8 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">Account visibility</p>
          <p className="mt-4 text-sm leading-7 text-slate-500">
            Trial and subscription information should remain obvious throughout the app, especially before generation and checkout actions.
          </p>
        </div>
      </section>
    </div>
  );
};

export default DashboardPage;
