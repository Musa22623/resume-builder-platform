import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api/client";

const formatDate = (value) => {
  if (!value) return "Not available";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
};

const DashboardPage = () => {
  const { user } = useAuth();
  const [trial, setTrial] = useState(null);
  const [isLoadingTrial, setIsLoadingTrial] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // Dashboard status should stay readable even if billing data is temporarily unavailable.
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

  const trialSnapshot = useMemo(() => {
    if (isLoadingTrial) {
      return {
        badge: "Loading access",
        title: "Checking your access status",
        tone: "border-slate-200 bg-slate-50 text-slate-700",
        message: "Pulling the latest trial information from billing.",
        remainingDays: "...",
        actionLabel: "Open billing",
      };
    }

    if (!trial) {
      return {
        badge: "Status unavailable",
        title: "Trial details could not be loaded",
        tone: "border-amber-200 bg-amber-50 text-amber-800",
        message: "You can still work in the app, but billing status should be checked before checkout-related actions.",
        remainingDays: "--",
        actionLabel: "Review billing",
      };
    }

    if (trial.remaining_days > 0) {
      return {
        badge: "Trial active",
        title: `${trial.remaining_days} day${trial.remaining_days === 1 ? "" : "s"} remaining`,
        tone: "border-teal-200 bg-teal-50 text-teal-800",
        message: "Your workspace is still in trial, so now is a good time to finish your draft and review payment options before access runs out.",
        remainingDays: trial.remaining_days,
        actionLabel: "Review plans",
      };
    }

    return {
      badge: "Payment needed",
      title: "Your trial has ended",
      tone: "border-rose-200 bg-rose-50 text-rose-800",
      message: "To keep generating and move forward without interruptions, head to billing and choose a payment path.",
      remainingDays: 0,
      actionLabel: "Pay now",
    };
  }, [isLoadingTrial, trial]);

  const trialEndDate = useMemo(() => {
    if (!trial?.started_at || !trial?.trial_days) return "Not available";

    const endDate = new Date(trial.started_at);
    endDate.setDate(endDate.getDate() + trial.trial_days);
    return formatDate(endDate);
  }, [trial]);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/80 bg-white/85 p-8 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">Dashboard</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900">
              {user?.username ? `${user.username}'s workspace` : "Resume Builder workspace"}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-500">
              Track access, resume progress, and the next steps in your resume workflow from one place.
            </p>
          </div>
          <span className="inline-flex w-fit rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
            {trialSnapshot.badge}
          </span>
        </div>
      </section>

      <section className={`rounded-[2rem] border p-6 shadow-[0_16px_40px_rgba(15,23,42,0.05)] ${trialSnapshot.tone}`}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em]">Access overview</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">{trialSnapshot.title}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7">{trialSnapshot.message}</p>
          </div>
          <Link className="rb-btn-dark w-full justify-center lg:w-auto" to="/payment">
            {trialSnapshot.actionLabel}
          </Link>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Trial remaining</p>
          <p className="mt-4 text-4xl font-semibold tracking-tight text-slate-900">{trialSnapshot.remainingDays}</p>
          <p className="mt-2 text-sm leading-7 text-slate-500">
            {trial?.remaining_days > 0
              ? "days left before payment is required."
              : "Use billing to keep access clear before the next gated step."}
          </p>
        </div>

        <div className="rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Billing visibility</p>
          <p className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">
            {trial?.remaining_days > 0 ? "Trial in progress" : "Payment check recommended"}
          </p>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-500">
            Trial start: <span className="font-semibold text-slate-700">{formatDate(trial?.started_at)}</span>
          </p>
          <p className="mt-2 text-sm leading-7 text-slate-500">
            Trial end target: <span className="font-semibold text-slate-700">{trialEndDate}</span>
          </p>
        </div>

        <div className="rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Resume status</p>
          <p className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">Draft workflow ready</p>
          <p className="mt-2 text-sm leading-7 text-slate-500">
            Save profile data, add a target role, then move into review and payment when needed.
          </p>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[2rem] border border-white/80 bg-slate-900 p-6 text-white shadow-[0_18px_50px_rgba(15,23,42,0.14)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-300">Quick actions</p>
          <div className="mt-5 grid gap-3">
            <Link className="rb-btn-secondary-dark justify-start px-4 py-3" to="/resume">
              Edit Resume
            </Link>
            <Link className="rb-btn-secondary-dark justify-start px-4 py-3" to="/job">
              Add Job Description
            </Link>
            <Link className="rb-btn-secondary-dark justify-start px-4 py-3" to="/payment">
              {trial?.remaining_days > 0 ? "Review Billing" : "Open Billing"}
            </Link>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/80 bg-white/85 p-8 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">Recommended flow</p>
          <ol className="mt-6 space-y-4 text-sm text-slate-600">
            <li className="rounded-3xl bg-slate-50 p-4">Capture or update your base resume details.</li>
            <li className="rounded-3xl bg-slate-50 p-4">Add the job post you want to target.</li>
            <li className="rounded-3xl bg-slate-50 p-4">Review billing before trial ends so access stays predictable.</li>
          </ol>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2rem] border border-white/80 bg-white/85 p-8 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">Account visibility</p>
          <p className="mt-4 text-sm leading-7 text-slate-500">
            Trial and payment status should stay obvious throughout the app, especially before generation and checkout-related actions.
          </p>
          <div className="mt-6 grid gap-3 text-sm text-slate-600">
            <div className="rounded-3xl bg-slate-50 p-4">Dashboard shows remaining trial time as soon as the page loads.</div>
            <div className="rounded-3xl bg-slate-50 p-4">Billing stays available as a first-level navigation item.</div>
            <div className="rounded-3xl bg-slate-50 p-4">Expired access gets a stronger payment prompt instead of a vague neutral state.</div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/80 bg-white/85 p-8 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">Next best step</p>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">
            {trial?.remaining_days > 0 ? "Keep building before trial runs out." : "Handle billing before you continue."}
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-500">
            {trial?.remaining_days > 0
              ? "If your resume basics are not saved yet, start there. If they are, move to the target job and review billing before the end date."
              : "Your access status needs attention first. Open billing, choose a payment route, then return to editing without uncertainty."}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link className="rb-btn-primary justify-center" to={trial?.remaining_days > 0 ? "/resume" : "/payment"}>
              {trial?.remaining_days > 0 ? "Continue Resume Setup" : "Go to Billing"}
            </Link>
            <Link className="rb-btn-secondary justify-center" to="/job">
              Open Job Target
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default DashboardPage;
