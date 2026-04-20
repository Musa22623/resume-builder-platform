const appRoot = document.getElementById("app");

const state = {
  user: null,
  trial: null,
  activeView: "dashboard",
  viewHistory: [],
  message: "",
  error: "",
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function setMessage(message = "", isError = false) {
  state.message = isError ? "" : message;
  state.error = isError ? message : "";
}

function currentTrial() {
  if (typeof state.trial === "number") {
    return { remaining_days: state.trial };
  }

  if (state.trial && typeof state.trial === "object") {
    return state.trial;
  }

  return null;
}

function getTrialRemainingDays() {
  const trial = currentTrial();
  return typeof trial?.remaining_days === "number" ? trial.remaining_days : null;
}

function getUserDisplayName() {
  const fullName = state.user?.profile?.full_name || state.user?.full_name || state.user?.name || state.user?.username;
  if (fullName) return fullName;

  const email = state.user?.email || "";
  if (email.includes("@")) return email.split("@")[0];

  return "Resume Builder";
}

function formatShortDate(value) {
  if (!value) return "Not available";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function normalizeUiCopy(value) {
  return String(value).replaceAll("Â·", "|");
}

function getBillingPlanLabel() {
  const trial = currentTrial();

  if (trial?.plan_name) return trial.plan_name;
  if (trial?.plan?.name) return trial.plan.name;
  if (trial?.plan_type) return trial.plan_type;
  if (trial?.subscription_plan) return trial.subscription_plan;
  if (trial?.access_type) return trial.access_type;

  const remainingDays = getTrialRemainingDays();
  if (typeof remainingDays === "number") {
    return remainingDays > 0 ? "Trial access" : "Trial ended";
  }

  return "Plan unavailable";
}

// Keep trial language aligned across the login shell, sidebar, and dashboard cards.
function trialSnapshot() {
  const remainingDays = getTrialRemainingDays();

  if (typeof remainingDays !== "number") {
    return {
      label: "Billing status",
      detail: "Billing data could not be loaded yet.",
      tone: "muted",
    };
  }

  if (remainingDays > 0) {
    return {
      label: "Billing active",
      detail: `${remainingDays} day${remainingDays === 1 ? "" : "s"} left on current access.`,
      tone: "good",
    };
  }

  return {
    label: "Billing attention",
    detail: "Review payment before the next gated step.",
    tone: "warn",
  };
}

function authBannerHtml() {
  const notices = [];
  if (state.message) notices.push(`<p class="banner banner-success">${escapeHtml(state.message)}</p>`);
  if (state.error) notices.push(`<p class="banner banner-error">${escapeHtml(state.error)}</p>`);
  return notices.join("");
}

async function bootstrap() {
  const token = await window.desktopApi.getToken();
  if (!token?.access_token && !token?.access && !token?.token) {
    renderLogin();
    return;
  }
  await loadAuthenticatedState();
}

async function loadAuthenticatedState() {
  try {
    const [me, trial] = await Promise.all([
      window.desktopApi.me(),
      // window.desktopApi.get("/api/v1/billing/trial/me/"),
    ]);
    state.user = me;
    // state.trial = trial;
    state.trial = 3;
    state.activeView = "dashboard";
    state.viewHistory = [];
    renderShell();
  } catch (err) {
    await window.desktopApi.logout();
    state.viewHistory = [];
    renderLogin("Session expired. Please sign in again.");
  }
}

function renderLogin(message = "") {
  appRoot.innerHTML = `
    <div class="window-frame">
      <div class="window-chrome">
        <div class="window-actions" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <div class="window-title">Resume Builder Desktop</div>
        <div class="chrome-tools">
          <button id="chromeBackBtn" class="chrome-btn" type="button" disabled aria-label="Go back">
            <svg viewBox="0 0 24 24" aria-hidden="true" class="chrome-icon">
              <path d="M14.5 5.5L8 12l6.5 6.5" />
            </svg>
            <span class="sr-only">Back</span>
          </button>
          <button id="chromeReloadBtn" class="chrome-btn" type="button" aria-label="Reload window">
            <svg viewBox="0 0 24 24" aria-hidden="true" class="chrome-icon">
              <path d="M20 11a8 8 0 10-2.35 5.65" />
              <path d="M20 4v7h-7" />
            </svg>
            <span class="sr-only">Reload</span>
          </button>
        </div>
      </div>

      <div class="auth-shell">
        <section class="auth-panel auth-panel-dark">
          <p class="eyebrow eyebrow-teal">Desktop workflow</p>
          <h1>Resume Builder for focused editing on desktop.</h1>
          <p class="auth-copy">
            Sign in to continue your resume work, keep your target roles in view, and move through editing and billing
            from one desktop workspace.
          </p>
          <div class="auth-feature-list">
            <div class="feature-row"><span class="feature-dot"></span><span>Pick up where you left off and keep your resume draft moving.</span></div>
            <div class="feature-row"><span class="feature-dot"></span><span>Check access status and next steps as soon as you sign in.</span></div>
            <div class="feature-row"><span class="feature-dot"></span><span>Create an account on the web any time you need a new workspace.</span></div>
          </div>
          <div class="workspace-rack">
            <div class="rack-card">
              <span class="rack-label">Workspace mode</span>
              <strong>Editing station</strong>
              <span class="rack-note">Resume drafting, job targeting, and billing in one place.</span>
            </div>
            <div class="rack-card">
              <span class="rack-label">Focus</span>
              <strong>Stay in flow</strong>
              <span class="rack-note">Use the desktop app for focused work, and head to the web only when you need to sign up.</span>
            </div>
          </div>
        </section>

        <section class="auth-panel auth-panel-light">
          <div class="signin-header">
            <div>
              <p class="eyebrow">Sign in</p>
              <h2>Open your workspace</h2>
            </div>
            <div class="signin-badge">Desktop</div>
          </div>
          <p class="panel-copy">
            Use your account details below. If you still need an account, the app can open the sign-up page for you.
          </p>
          <div class="field-stack">
            <label class="field-label" for="email">Email</label>
            <input id="email" type="email" placeholder="name@email.com" autocomplete="email" />
            <label class="field-label" for="password">Password</label>
            <input id="password" type="password" placeholder="Password" autocomplete="current-password" />
          </div>
          <div class="button-row">
            <button id="signinBtn">Sign In</button>
            <button id="signupBtn" class="secondary">Sign Up on Web</button>
          </div>
          <div class="signin-note">
            <span class="signin-note-dot"></span>
            <span>Sign in and jump straight back into your workspace.</span>
          </div>
          <p class="status" id="loginMessage">${escapeHtml(message)}</p>
        </section>
      </div>
    </div>
  `;

  const submitSignIn = async () => {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const msg = document.getElementById("loginMessage");
    if (!email || !password) {
      msg.textContent = "Email and password are required.";
      return;
    }
    try {
      await window.desktopApi.signIn({ email, password });
      await loadAuthenticatedState();
    } catch {
      msg.textContent = "Sign in failed. Check your email and password.";
    }
  };

  document.getElementById("signinBtn").onclick = submitSignIn;

  document.getElementById("password").onkeydown = async (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    await submitSignIn();
  };

  document.getElementById("signupBtn").onclick = async () => {
    await window.desktopApi.signUpRedirect();
  };

  document.getElementById("chromeReloadBtn").onclick = async () => {
    await window.desktopApi.reloadWindow();
  };
}

// Desktop navigation stays in one renderer and swaps views without a client router.
function shellHtml(content) {
  const trialInfo = trialSnapshot();
  const canGoBack = state.viewHistory.length > 0;
  const menu = [
    { id: "dashboard", label: "Workspace", meta: "Status and next steps" },
    { id: "resume", label: "Resume Builder", meta: "Draft and edit content" },
    { id: "job", label: "Job Target", meta: "Paste job details" },
    { id: "billing", label: "Billing", meta: "Plans and payment rails" },
  ];

  return `
    <div class="window-frame">
      <div class="window-chrome">
        <div class="window-actions" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <div class="window-title">Resume Builder Desktop</div>
        <div class="chrome-tools">
          <button id="chromeBackBtn" class="chrome-btn" type="button" ${canGoBack ? "" : "disabled"} aria-label="Go back">
            <svg viewBox="0 0 24 24" aria-hidden="true" class="chrome-icon">
              <path d="M14.5 5.5L8 12l6.5 6.5" />
            </svg>
            <span class="sr-only">Back</span>
          </button>
          <button id="chromeReloadBtn" class="chrome-btn" type="button" aria-label="Reload window">
            <svg viewBox="0 0 24 24" aria-hidden="true" class="chrome-icon">
              <path d="M20 11a8 8 0 10-2.35 5.65" />
              <path d="M20 4v7h-7" />
            </svg>
            <span class="sr-only">Reload</span>
          </button>
        </div>
      </div>

      <div class="layout">
        <aside class="sidebar">
          <div class="sidebar-top">
            <div>
              <p class="eyebrow">Resume Builder</p>
              <div class="brand-row">
                <div class="brand">Desktop Workspace</div>
              </div>
            </div>
            <div class="sidebar-status sidebar-status-${trialInfo.tone}">
              <strong>${escapeHtml(trialInfo.label)}</strong>
              <span>${escapeHtml(trialInfo.detail)}</span>
            </div>
          </div>

          <div class="menu">
            ${menu
              .map(
                (item) => `
                  <button data-view="${item.id}" class="nav-btn ${state.activeView === item.id ? "active" : ""}">
                    <span class="nav-btn-label">${item.label}</span>
                    <span class="nav-btn-meta">${item.meta}</span>
                  </button>
                `
              )
              .join("")}
          </div>

          <div class="sidebar-footer">
            <div class="account-card">
              <p class="eyebrow">Signed in as</p>
              <strong>${escapeHtml(getUserDisplayName())}</strong>
              <span>${escapeHtml(state.user?.email || "Account connected")}</span>
            </div>
            <button id="logoutBtn" class="secondary">Logout</button>
          </div>
        </aside>
        <main class="content">
          ${authBannerHtml()}
          ${content}
        </main>
      </div>
    </div>
  `;
}

function renderShell() {
  let view = "";
  if (state.activeView === "dashboard") view = dashboardView();
  if (state.activeView === "resume") view = resumeView();
  if (state.activeView === "job") view = jobView();
  if (state.activeView === "billing") view = billingView();
  appRoot.innerHTML = shellHtml(view);
  bindShellEvents();
}

function navigateTo(viewId) {
  if (!viewId || viewId === state.activeView) return;
  state.viewHistory.push(state.activeView);
  state.activeView = viewId;
  setMessage("");
  renderShell();
}

function navigateBack() {
  if (!state.user || state.viewHistory.length === 0) return;
  const previousView = state.viewHistory.pop();
  if (!previousView) return;
  state.activeView = previousView;
  setMessage("");
  renderShell();
}

function bindShellEvents() {
  const chromeBackBtn = document.getElementById("chromeBackBtn");
  const chromeReloadBtn = document.getElementById("chromeReloadBtn");

  if (chromeBackBtn) {
    chromeBackBtn.onclick = () => {
      navigateBack();
    };
  }

  if (chromeReloadBtn) {
    chromeReloadBtn.onclick = async () => {
      await window.desktopApi.reloadWindow();
    };
  }

  document.querySelectorAll("[data-view]").forEach((btn) => {
    btn.onclick = () => {
      navigateTo(btn.dataset.view);
    };
  });

  const logoutBtn = document.getElementById("logoutBtn");
  logoutBtn.onclick = async () => {
    await window.desktopApi.logout();
    state.user = null;
    state.trial = null;
    state.viewHistory = [];
    renderLogin("Logged out successfully.");
  };

  attachViewHandlers();
}

function dashboardView() {
  const trial = currentTrial();
  const trialInfo = trialSnapshot();
  const remainingDays = getTrialRemainingDays();
  const displayName = getUserDisplayName();
  const billingPlanLabel = getBillingPlanLabel();
  const accessBadge =
    typeof remainingDays !== "number"
      ? "Billing status"
      : remainingDays > 0
        ? "Billing active"
        : "Billing attention";
  const accessTitle =
    typeof remainingDays !== "number"
      ? "Billing details could not be loaded"
      : remainingDays > 0
        ? "Billing status is active"
        : "Billing needs attention";
  const billingState =
    typeof remainingDays !== "number"
      ? "Status check needed"
      : remainingDays > 0
        ? "Current access active"
        : "Payment check recommended";
  const trialEndDate =
    trial?.started_at && trial?.trial_days
      ? formatShortDate(new Date(new Date(trial.started_at).setDate(new Date(trial.started_at).getDate() + trial.trial_days)))
      : "Not available";
  const nextStepTitle =
    typeof remainingDays === "number" && remainingDays > 0
      ? "Keep building while access is active."
      : "Handle billing before you continue.";
  const nextStepMessage =
    typeof remainingDays === "number" && remainingDays > 0
      ? "If your resume basics are already in place, move to your target role next. If not, save the core draft now and review billing before the end date."
      : "Your access needs attention first. Open billing, choose the next payment path, then return to editing without uncertainty.";
  const summaryMessage =
    typeof remainingDays !== "number"
      ? "Access status could not be loaded. Keep working, but check billing before the next gated step."
      : remainingDays > 0
        ? "Keep drafting and review billing before access changes."
        : "Access ended. Open billing before the next major step so work can continue without interruptions.";
  const primaryActionView = typeof remainingDays === "number" && remainingDays > 0 ? "resume" : "billing";
  const primaryActionLabel = typeof remainingDays === "number" && remainingDays > 0 ? "Continue Resume Setup" : "Go to Billing";

  return normalizeUiCopy(`
    <section class="workspace-header">
      <div>
        <h1>${escapeHtml(displayName)}'s workspace</h1>
        <p class="hero-copy">
          Keep access status and the next action visible at a glance.
        </p>
      </div>
      <div class="workspace-badge-row">
        <span class="workspace-badge workspace-badge-${trialInfo.tone}">${escapeHtml(accessBadge)}</span>
      </div>
    </section>

    <section class="workspace-toolbar workspace-toolbar-${trialInfo.tone}">
      <div class="toolbar-copy">
        <strong>${escapeHtml(accessTitle)}</strong>
        <span>${escapeHtml(summaryMessage)}</span>
        <div class="toolbar-detail-grid">
          <div class="toolbar-detail-item">
            <span class="toolbar-detail-label">Billing</span>
            <strong>${escapeHtml(billingState)}</strong>
            <span>Plan ${escapeHtml(billingPlanLabel)} · ${typeof remainingDays === "number" ? `${remainingDays} day${remainingDays === 1 ? "" : "s"} left` : "days unavailable"}</span>
            <span>Start ${escapeHtml(formatShortDate(trial?.started_at))} · End target ${escapeHtml(trialEndDate)}</span>
          </div>
        </div>
      </div>
    </section>

    <section class="workspace-columns workspace-columns-single">
      <div class="workspace-stack">
        <section class="workspace-panel">
          <div class="panel-line">
            <div>
              <p class="eyebrow">Next Best Step</p>
              <h2>${escapeHtml(nextStepTitle)}</h2>
            </div>
            <button class="dashboard-inline-btn" data-view="${primaryActionView}">
              ${escapeHtml(primaryActionLabel)}
            </button>
          </div>
          <p class="panel-copy">${escapeHtml(nextStepMessage)}</p>
        </section>

      </div>
    </section>
  `);
}

function resumeView() {
  return `
    <section class="card">
      <h2>Resume Editor</h2>
      <input id="resumeTitle" placeholder="Resume title (e.g. Product Manager Resume)" />
      <input id="resumeName" placeholder="Full name" />
      <input id="resumeContact" placeholder="Contact details (email, phone, city)" />
      <textarea id="resumeSummary" rows="4" placeholder="Professional summary"></textarea>
      <textarea id="resumeSkills" rows="3" placeholder="Skills (comma separated)"></textarea>
      <button id="saveResumeBtn">Save Resume Draft</button>
      <p id="resumeStatus" class="status"></p>
    </section>
  `;
}

function jobView() {
  return `
    <section class="card">
      <h2>Job Description Input</h2>
      <select id="jobSource">
        <option value="manual">Manual description</option>
        <option value="link">Job link</option>
      </select>
      <input id="jobLink" placeholder="Job URL (if source is link)" />
      <textarea id="jobText" rows="8" placeholder="Paste job description text"></textarea>
      <button id="saveJobBtn">Save Job Description</button>
      <p id="jobStatus" class="status"></p>
    </section>
  `;
}

function billingView() {
  return `
    <section class="card">
      <h2>Billing</h2>
      <button id="loadPlansBtn">Load Plans</button>
      <div id="plansContainer" class="status"></div>
      <h3>Create One-Time Placeholder Payment</h3>
      <input id="paymentAmount" placeholder="Amount USD" value="19.99" />
      <button id="payBtn">Create Payment Record</button>
      <p id="billingStatus" class="status"></p>
    </section>
  `;
}

function attachViewHandlers() {
  if (state.activeView === "resume") bindResumeHandlers();
  if (state.activeView === "job") bindJobHandlers();
  if (state.activeView === "billing") bindBillingHandlers();
}

function bindResumeHandlers() {
  const saveBtn = document.getElementById("saveResumeBtn");
  const statusEl = document.getElementById("resumeStatus");
  saveBtn.onclick = async () => {
    const title = document.getElementById("resumeTitle").value.trim();
    const name = document.getElementById("resumeName").value.trim();
    const contact = document.getElementById("resumeContact").value.trim();
    const summary = document.getElementById("resumeSummary").value.trim();
    const skillsRaw = document.getElementById("resumeSkills").value.trim();
    const skills = skillsRaw ? skillsRaw.split(",").map((s) => s.trim()).filter(Boolean) : [];

    if (!title || !name || !contact) {
      statusEl.textContent = "Title, name, and contact are required.";
      return;
    }

    try {
      const body = {
        title,
        source_type: "manual",
        is_draft: true,
        content_json: {
          name,
          contact_details: contact,
          summary,
          skills,
        },
      };
      const data = await window.desktopApi.post("/api/v1/resumes/items/", body);
      statusEl.textContent = `Resume saved with ID ${data.id}.`;
    } catch (err) {
      statusEl.textContent = "Failed to save resume.";
    }
  };
}

function bindJobHandlers() {
  const saveBtn = document.getElementById("saveJobBtn");
  const statusEl = document.getElementById("jobStatus");
  saveBtn.onclick = async () => {
    const source_type = document.getElementById("jobSource").value;
    const job_link = document.getElementById("jobLink").value.trim();
    const raw_text = document.getElementById("jobText").value.trim();
    try {
      await window.desktopApi.post("/api/v1/jobs/descriptions/", { source_type, job_link, raw_text });
      statusEl.textContent = "Job description saved.";
    } catch (err) {
      const detail = err?.message || "Failed to save job description.";
      statusEl.textContent = detail;
    }
  };
}

function bindBillingHandlers() {
  const plansBtn = document.getElementById("loadPlansBtn");
  const payBtn = document.getElementById("payBtn");
  const plansContainer = document.getElementById("plansContainer");
  const billingStatus = document.getElementById("billingStatus");

  plansBtn.onclick = async () => {
    try {
      const plans = await window.desktopApi.get("/api/v1/billing/plans/");
      plansContainer.innerHTML = plans.length
        ? plans
            .map(
              (p) =>
                `<div class="card"><strong>${escapeHtml(p.name)}</strong> - ${escapeHtml(p.plan_type)} - $${escapeHtml(
                  p.price_usd
                )}</div>`
            )
            .join("")
        : "No plans configured yet.";
    } catch {
      plansContainer.textContent = "Failed to load plans.";
    }
  };

  payBtn.onclick = async () => {
    const amount = Number(document.getElementById("paymentAmount").value);
    if (Number.isNaN(amount) || amount <= 0) {
      billingStatus.textContent = "Enter valid amount.";
      return;
    }
    try {
      await window.desktopApi.post("/api/v1/billing/payments/", {
        amount_usd: amount,
        provider: "placeholder",
      });
      billingStatus.textContent = "Payment record created (placeholder).";
      await refreshTrial();
    } catch {
      billingStatus.textContent = "Failed to create payment.";
    }
  };
}

async function refreshTrial() {
  try {
    state.trial = await window.desktopApi.get("/api/v1/billing/trial/me/");
    renderShell();
  } catch {
    // no-op
  }
}

bootstrap();
