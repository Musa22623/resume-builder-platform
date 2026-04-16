import { Link } from "react-router-dom";

const HomePage = () => {
  return (
    <div className="pb-16">
      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-14 lg:grid-cols-[1.1fr_0.9fr] lg:px-6 lg:py-20" id="intro">
        <div className="max-w-2xl">
          <div className="inline-flex rounded-full border border-teal-200 bg-teal-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-teal-700">
            Tailor resumes without changing the facts
          </div>
          <h1 className="mt-6 text-5xl font-semibold tracking-tight text-slate-900 sm:text-6xl">
            Build job-ready resumes with AI guardrails you can trust.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
            Use your existing resume, paste a job description, and generate sharper summaries and experience bullets
            while keeping names, dates, education, and factual details unchanged.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link className="rb-btn-primary px-6 py-3" to="/signup">
              Start Free
            </Link>
            <Link className="rb-btn-secondary px-6 py-3" to="/login">
              Sign In
            </Link>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-white/80 bg-white/80 p-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
              <p className="text-sm font-semibold text-slate-900">AI-safe editing</p>
              <p className="mt-2 text-sm text-slate-500">Summary and experience improve while protected facts stay intact.</p>
            </div>
            <div className="rounded-3xl border border-white/80 bg-white/80 p-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
              <p className="text-sm font-semibold text-slate-900">Shared workflow</p>
              <p className="mt-2 text-sm text-slate-500">Move between web and desktop with one account and one backend.</p>
            </div>
            <div className="rounded-3xl border border-white/80 bg-white/80 p-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
              <p className="text-sm font-semibold text-slate-900">Flexible billing</p>
              <p className="mt-2 text-sm text-slate-500">Stripe checkout and crypto instructions are available when enabled.</p>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 -z-10 rounded-[2rem] bg-gradient-to-br from-teal-100 via-transparent to-slate-100 blur-2xl" />
          <div className="rounded-[2rem] border border-white/80 bg-white/90 p-6 shadow-[0_20px_70px_rgba(15,23,42,0.12)]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">Resume Preview</p>
                <p className="mt-2 text-xl font-semibold text-slate-900">Targeted Product Resume</p>
              </div>
              <div className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">Draft</div>
            </div>
            <div className="mt-6 space-y-4">
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Professional Summary</p>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  AI rewrites tone and relevance for the target role without altering career history, dates, or identity data.
                </p>
              </div>
              <div className="rounded-3xl bg-teal-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">AI Alignment Notes</p>
                <ul className="mt-3 space-y-3 text-sm text-slate-700">
                  <li>Emphasizes measurable outcomes in work experience.</li>
                  <li>Preserves company names, timelines, and education records.</li>
                  <li>Aligns wording with the selected job description.</li>
                </ul>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-slate-200 p-4">
                  <p className="text-sm font-semibold text-slate-900">Input sources</p>
                  <p className="mt-2 text-sm text-slate-500">Resume upload, manual entry, job link, or pasted description.</p>
                </div>
                <div className="rounded-3xl border border-slate-200 p-4">
                  <p className="text-sm font-semibold text-slate-900">Review flow</p>
                  <p className="mt-2 text-sm text-slate-500">Edit, regenerate, and approve before exporting the final draft.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
        <div className="rounded-[2rem] border border-white/80 bg-white/80 p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">How it works</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">A focused workflow from raw input to reviewable output.</h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-slate-500">
              The MVP is intentionally narrow: capture resume details, capture the target role, generate approved sections,
              and make billing and support status obvious.
            </p>
          </div>
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            <div className="rounded-3xl bg-slate-50 p-6">
              <p className="text-sm font-semibold text-slate-900">1. Bring your source data</p>
              <p className="mt-3 text-sm leading-7 text-slate-500">Use an existing resume or fill in your profile manually.</p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-6">
              <p className="text-sm font-semibold text-slate-900">2. Add the target job</p>
              <p className="mt-3 text-sm leading-7 text-slate-500">Paste a job description or provide a job post link.</p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-6">
              <p className="text-sm font-semibold text-slate-900">3. Review AI suggestions</p>
              <p className="mt-3 text-sm leading-7 text-slate-500">Accept tailored wording for summaries and experience only.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
        <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[2rem] border border-white/80 bg-white/85 p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">Product guardrails</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">The platform improves alignment without rewriting your identity.</h2>
            <div className="mt-6 grid gap-4">
              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-900">Protected fields stay protected</p>
                <p className="mt-2 text-sm leading-7 text-slate-500">
                  Names, dates, contact details, companies, and education timelines are preserved while approved text sections are refined.
                </p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-900">Shared web and desktop workflow</p>
                <p className="mt-2 text-sm leading-7 text-slate-500">
                  One backend powers sign-in, resume data, job targeting, billing visibility, and support access across clients.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/80 bg-white/85 p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">What you get in the MVP</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 p-5">
                <p className="text-sm font-semibold text-slate-900">Authentication</p>
                <p className="mt-2 text-sm leading-7 text-slate-500">Simple sign up and sign in flow across the platform.</p>
              </div>
              <div className="rounded-3xl border border-slate-200 p-5">
                <p className="text-sm font-semibold text-slate-900">Resume input</p>
                <p className="mt-2 text-sm leading-7 text-slate-500">Manual draft creation today, with upload-friendly workflow direction.</p>
              </div>
              <div className="rounded-3xl border border-slate-200 p-5">
                <p className="text-sm font-semibold text-slate-900">Job targeting</p>
                <p className="mt-2 text-sm leading-7 text-slate-500">Paste job descriptions or provide links to shape the resume language.</p>
              </div>
              <div className="rounded-3xl border border-slate-200 p-5">
                <p className="text-sm font-semibold text-slate-900">Billing options</p>
                <p className="mt-2 text-sm leading-7 text-slate-500">Stripe checkout with optional crypto payment instructions when enabled.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-6" id="desktop">
        <div className="rounded-[2rem] border border-slate-200 bg-slate-900 p-8 text-white shadow-[0_18px_60px_rgba(15,23,42,0.16)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-300">Desktop companion</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">Move the same workflow onto desktop.</h2>
          <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">
            The desktop app shares authentication, resume data, job inputs, and billing status with the web experience.
            It is ideal for focused writing sessions while the public site handles onboarding and marketing.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-semibold">Windows</p>
              <p className="mt-2 text-sm text-slate-300">Installer coming soon</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-semibold">macOS</p>
              <p className="mt-2 text-sm text-slate-300">Installer coming soon</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-semibold">Linux</p>
              <p className="mt-2 text-sm text-slate-300">AppImage coming soon</p>
            </div>
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link className="rb-btn-primary px-6 py-3" to="/signup">
              Reserve Your Access
            </Link>
            <a className="rb-btn-secondary-dark px-6 py-3" href="#contact">
              Ask About Desktop
            </a>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/80 bg-white/85 p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)]" id="contact">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">Contact & support</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">Need help before or after signup?</h2>
          <div className="mt-6 space-y-4 text-sm leading-7 text-slate-600">
            <p>Email: support@resume-builder.local</p>
            <p>Logged-in users can open the in-app support chat widget for direct admin responses.</p>
            <p>Partnership, sales, and ops questions can start through the same support channel.</p>
          </div>
          <div className="mt-8 rounded-3xl bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-900">What users should expect</p>
            <p className="mt-2 text-sm leading-7 text-slate-500">
              Clear trial visibility, flexible checkout, and a focused experience built for getting from draft to targeted resume faster.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-6 lg:px-6" id="faq">
        <div className="rounded-[2rem] border border-white/80 bg-white/85 p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">FAQ</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">Common questions before you start.</h2>
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 p-5">
              <h3 className="text-base font-semibold text-slate-900">Does AI change factual details?</h3>
              <p className="mt-3 text-sm leading-7 text-slate-500">
                No. AI only rewrites approved wording and keeps names, dates, companies, and education facts unchanged.
              </p>
            </div>
            <div className="rounded-3xl border border-slate-200 p-5">
              <h3 className="text-base font-semibold text-slate-900">Can I pay with Stripe or crypto?</h3>
              <p className="mt-3 text-sm leading-7 text-slate-500">
                Yes. The payment page supports Stripe checkout and direct crypto payment with wallet QR instructions.
              </p>
            </div>
            <div className="rounded-3xl border border-slate-200 p-5">
              <h3 className="text-base font-semibold text-slate-900">Can I use web and desktop together?</h3>
              <p className="mt-3 text-sm leading-7 text-slate-500">
                Yes. Desktop and web use the same backend account and the same shared data.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
        <div className="rounded-[2rem] border border-slate-200 bg-slate-900 p-8 text-white shadow-[0_18px_60px_rgba(15,23,42,0.16)] lg:flex lg:items-center lg:justify-between lg:gap-8">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-300">Ready to start</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">Go from first account to first targeted draft without a complicated setup.</h2>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              Sign up on the web, manage your resume workflow, and move to desktop later using the same shared account.
            </p>
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row lg:mt-0">
            <Link className="rb-btn-primary px-6 py-3" to="/signup">
              Create Account
            </Link>
            <Link className="rb-btn-secondary-dark px-6 py-3" to="/login">
              Sign In
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
