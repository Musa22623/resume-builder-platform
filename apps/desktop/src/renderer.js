const appRoot = document.getElementById("app");

const state = {
  user: null,
  trial: null,
  activeView: "dashboard",
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

async function bootstrap() {
  const token = await window.desktopApi.getToken();
  if (!token?.access) {
    renderLogin();
    return;
  }
  await loadAuthenticatedState();
}

async function loadAuthenticatedState() {
  try {
    const [me, trial] = await Promise.all([
      window.desktopApi.me(),
      window.desktopApi.get("/api/billing/trial/me/"),
    ]);
    state.user = me;
    state.trial = trial;
    renderShell();
  } catch (err) {
    await window.desktopApi.logout();
    renderLogin("Session expired. Please sign in again.");
  }
}

function renderLogin(message = "") {
  appRoot.innerHTML = `
    <div class="content" style="max-width:460px; margin: 70px auto;">
      <div class="card">
        <h2>Resume Builder Desktop</h2>
        <p class="status">Sign in to continue</p>
        <input id="username" placeholder="Username" />
        <input id="password" type="password" placeholder="Password" />
        <button id="signinBtn">Sign In</button>
        <button id="signupBtn" class="secondary">Sign Up on Web</button>
        <p class="${message ? "status" : ""}" id="loginMessage">${escapeHtml(message)}</p>
      </div>
    </div>
  `;

  document.getElementById("signinBtn").onclick = async () => {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;
    const msg = document.getElementById("loginMessage");
    if (!username || !password) {
      msg.textContent = "Username and password are required.";
      return;
    }
    try {
      await window.desktopApi.signIn({ username, password });
      await loadAuthenticatedState();
    } catch {
      msg.textContent = "Sign in failed. Check credentials.";
    }
  };

  document.getElementById("signupBtn").onclick = async () => {
    await window.desktopApi.signUpRedirect();
  };
}

function shellHtml(content) {
  const trialDays = state.trial?.remaining_days ?? 0;
  const adminBadge = state.user?.is_platform_admin || state.user?.is_staff ? `<span class="pill">Admin</span>` : "";
  return `
    <div class="layout">
      <aside class="sidebar">
        <div class="brand">Resume Builder ${adminBadge}</div>
        <div class="menu">
          <button data-view="dashboard">Dashboard</button>
          <button data-view="resume">Resume Editor</button>
          <button data-view="job">Job Description</button>
          <button data-view="billing">Billing</button>
          ${state.user?.is_platform_admin || state.user?.is_staff ? '<button data-view="admin">Admin</button>' : ""}
          <button id="logoutBtn" class="secondary">Logout</button>
        </div>
        <p class="status">Trial remaining: ${trialDays} day(s)</p>
      </aside>
      <main class="content">
        ${content}
      </main>
    </div>
  `;
}

function renderShell() {
  let view = "";
  if (state.activeView === "dashboard") view = dashboardView();
  if (state.activeView === "resume") view = resumeView();
  if (state.activeView === "job") view = jobView();
  if (state.activeView === "billing") view = billingView();
  if (state.activeView === "admin") view = adminView();
  appRoot.innerHTML = shellHtml(view);
  bindShellEvents();
}

function bindShellEvents() {
  document.querySelectorAll("[data-view]").forEach((btn) => {
    btn.onclick = () => {
      state.activeView = btn.dataset.view;
      setMessage("");
      renderShell();
      attachViewHandlers();
    };
  });

  const logoutBtn = document.getElementById("logoutBtn");
  logoutBtn.onclick = async () => {
    await window.desktopApi.logout();
    state.user = null;
    state.trial = null;
    renderLogin("Logged out successfully.");
  };

  attachViewHandlers();
}

function dashboardView() {
  return `
    <section class="card">
      <h2>Welcome, ${escapeHtml(state.user?.username)}</h2>
      <p>Email: ${escapeHtml(state.user?.email)}</p>
      <p class="status">Use the left menu to manage resumes, jobs, and billing.</p>
      ${state.message ? `<p class="status">${escapeHtml(state.message)}</p>` : ""}
      ${state.error ? `<p class="error">${escapeHtml(state.error)}</p>` : ""}
    </section>
  `;
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

function adminView() {
  return `
    <section class="card">
      <h2>Admin Panel</h2>
      <button id="loadUsersBtn">Load Users</button>
      <div id="usersContainer" class="status"></div>
    </section>
  `;
}

function attachViewHandlers() {
  if (state.activeView === "resume") bindResumeHandlers();
  if (state.activeView === "job") bindJobHandlers();
  if (state.activeView === "billing") bindBillingHandlers();
  if (state.activeView === "admin") bindAdminHandlers();
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
      const data = await window.desktopApi.post("/api/resumes/items/", body);
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
      await window.desktopApi.post("/api/jobs/descriptions/", { source_type, job_link, raw_text });
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
      const plans = await window.desktopApi.get("/api/billing/plans/");
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
      await window.desktopApi.post("/api/billing/payments/", {
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

function bindAdminHandlers() {
  const loadUsersBtn = document.getElementById("loadUsersBtn");
  const usersContainer = document.getElementById("usersContainer");
  loadUsersBtn.onclick = async () => {
    try {
      const users = await window.desktopApi.get("/api/admin/users/");
      usersContainer.innerHTML = users.length
        ? users.map((u) => `<div class="card">${escapeHtml(u.username)} - ${escapeHtml(u.email)}</div>`).join("")
        : "No users.";
    } catch {
      usersContainer.textContent = "Not allowed or failed to load users.";
    }
  };
}

async function refreshTrial() {
  try {
    state.trial = await window.desktopApi.get("/api/billing/trial/me/");
    renderShell();
  } catch {
    // no-op
  }
}

bootstrap();
