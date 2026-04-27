import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageTitleBar from "../components/ui/PageTitleBar";
import api from "../services/api/client";

const formatDate = (value) => {
  if (!value) return "Not available";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
};

const ActionIcon = ({ type }) => {
  const paths = {
    resume: (
      <>
        <path d="M7 3.75h7.5L18 7.25v13H7z" />
        <path d="M14.5 3.75v3.5H18" />
        <path d="M10 11h5" />
        <path d="M10 14.5h5" />
        <path d="M10 18h3" />
      </>
    ),
    target: (
      <>
        <circle cx="12" cy="12" r="7.25" />
        <circle cx="12" cy="12" r="3.25" />
        <path d="M12 2.75v3" />
        <path d="M21.25 12h-3" />
      </>
    ),
    billing: (
      <>
        <rect x="4" y="6.5" width="16" height="11" rx="2" />
        <path d="M4 9.5h16" />
        <path d="M8 14.5h3" />
      </>
    ),
  };

  return (
    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 transition duration-200 group-hover:bg-teal-50 group-hover:text-teal-700">
      <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24">
        {paths[type]}
      </svg>
    </span>
  );
};

const DashboardPage = () => {
  const [trial, setTrial] = useState(null);
  const [isLoadingTrial, setIsLoadingTrial] = useState(true);

  useEffect(() => {
    let isMounted = true;

    api
      .get("/api/v1/billing/trial/me/")
      .then((res) => {
        if (isMounted) setTrial(res.data);
      })
      .catch(() => {
        if (isMounted) setTrial(null);
      })
      .finally(() => {
        if (isMounted) setIsLoadingTrial(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const trialState = useMemo(() => {
    if (isLoadingTrial) {
      return {
        badge: "Checking access",
        daysLabel: "...",
        headline: "Continue building while we check access.",
        message: "Keep your resume moving. Billing status will update here as soon as it loads.",
        tone: "text-slate-500",
        primaryTo: "/resume",
        primaryLabel: "Continue Resume Building",
      };
    }

    if (!trial) {
      return {
        badge: "Billing needs review",
        daysLabel: "--",
        headline: "Continue your resume, then review billing.",
        message: "Trial details are unavailable right now, so keep editing and confirm billing before checkout.",
        tone: "text-amber-600",
        primaryTo: "/resume",
        primaryLabel: "Continue Resume Building",
      };
    }

    if (trial.remaining_days > 0) {
      return {
        badge: "Trial active",
        daysLabel: trial.remaining_days,
        headline: "Finish your resume before trial ends.",
        message: "Build an ATS-friendly draft now, then add the target job when your basics are ready.",
        tone: "text-teal-700",
        primaryTo: "/resume",
        primaryLabel: "Continue Resume Building",
      };
    }

    return {
      badge: "Payment needed",
      daysLabel: 0,
      headline: "Resolve billing to keep building.",
      message: "Choose a payment path first, then return to resume editing without interruption.",
      tone: "text-rose-600",
      primaryTo: "/payment",
      primaryLabel: "Go to Billing",
    };
  }, [isLoadingTrial, trial]);

  const trialEndDate = useMemo(() => {
    if (!trial?.started_at || !trial?.trial_days) return "Not available";

    const endDate = new Date(trial.started_at);
    endDate.setDate(endDate.getDate() + trial.trial_days);
    return formatDate(endDate);
  }, [trial]);

  const quickActions = [
    {
      icon: "resume",
      label: "Edit Resume",
      note: "Update profile, summary, skills, and experience.",
      to: "/resume",
    },
    {
      icon: "target",
      label: "Step 2: Add Job Target",
      note: "Paste the job description to tailor your resume.",
      to: "/job",
    },
    {
      icon: "billing",
      label: trial?.remaining_days > 0 ? "Review Billing" : "Open Billing",
      note: "Confirm access, plan, and payment status.",
      to: "/payment",
    },
  ];

  return (
    <div className="space-y-5">
      <PageTitleBar
        subtitle="One focused path: finish the resume, add a target role, then review billing when needed."
        title="Overview"
      />

      <section className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.07)] lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="min-w-0">
          <span className="inline-flex rounded-lg bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">
            {trialState.badge}
          </span>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Your next action</p>
          <h2 className="mt-2 max-w-3xl text-3xl font-semibold tracking-tight text-slate-950">
            {trialState.headline}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">{trialState.message}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              className="rb-btn-primary h-12 justify-center px-6 text-base transition active:scale-[0.99] sm:w-auto"
              to={trialState.primaryTo}
            >
              {trialState.primaryLabel}
            </Link>
            <Link className="rb-btn-secondary justify-center transition active:scale-[0.99]" to="/job">
              Add Job Target
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-center lg:min-w-56">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Trial left</p>
          <p className={`mt-2 text-6xl font-semibold tracking-tight ${trialState.tone}`}>{trialState.daysLabel}</p>
          <p className="mt-1 text-sm font-semibold text-slate-700">
            {trial?.remaining_days === 1 ? "day" : "days"}
          </p>
          <p className="mt-4 text-xs leading-5 text-slate-500">End target: {trialEndDate}</p>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Quick actions</p>
              <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">Keep moving in order</h3>
            </div>
            <p className="text-sm text-slate-500">Build ATS-friendly resumes with facts kept intact.</p>
          </div>

          <div className="mt-5 grid gap-3">
            {quickActions.map((action) => (
              <Link
                className="group flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-teal-200 hover:bg-teal-50/40 hover:shadow-[0_14px_30px_rgba(15,23,42,0.08)] active:translate-y-0"
                key={action.label}
                to={action.to}
              >
                <ActionIcon type={action.icon} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-slate-950">{action.label}</span>
                  <span className="mt-1 block text-sm leading-5 text-slate-500">{action.note}</span>
                </span>
                <span className="text-slate-300 transition duration-200 group-hover:translate-x-0.5 group-hover:text-teal-700">-&gt;</span>
              </Link>
            ))}
          </div>
        </div>

        <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Billing and access</p>
          <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
            {trial?.remaining_days > 0 ? "Access is clear for now." : "Confirm access before generating."}
          </h3>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Trial start: <span className="font-semibold text-slate-700">{formatDate(trial?.started_at)}</span>
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Trial end: <span className="font-semibold text-slate-700">{trialEndDate}</span>
          </p>
          <Link className="rb-btn-secondary mt-5 w-full justify-center transition active:scale-[0.99]" to="/payment">
            Review Billing
          </Link>
        </aside>
      </section>
    </div>
  );
};

export default DashboardPage;
