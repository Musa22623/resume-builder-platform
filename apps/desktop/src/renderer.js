(() => {
  const root = window.RBD;
  const h = root.helpers;
  const S = root.services;
  const api = S.api;
  const appRoot = document.getElementById("app");

  const makeResumeState = () => {
    const payload = S.resume.createEmptyPayload();
    return {
      loaded: false,
      loading: false,
      resumeId: null,
      payload,
      lastSavedSnapshot: JSON.stringify(payload),
      selectedFile: null,
      uploadedFileName: "",
      lastUploadId: null,
      status: "",
      loadStatus: "",
      uploadStatus: "",
      parseStatus: "",
      validationErrors: {},
      isSaving: false,
      isUploading: false,
      isParsing: false,
      isApplyingParsed: false,
      generationContext: null,
      sectionVisibility: {
        profile: true,
        contact: true,
        summary: true,
        skills: true,
        experience: true,
        education: true,
      },
    };
  };

  const state = {
    user: null,
    trial: null,
    activeView: "dashboard",
    viewHistory: [],
    banner: null,
    resume: makeResumeState(),
    job: {
      form: { ...S.jobs.EMPTY_JOB_FORM },
      recentJobs: [],
      selectedRecentJobId: null,
      recentLoaded: false,
      isLoadingRecentJobs: false,
      isSaving: false,
      deletingJobId: null,
      message: "",
      messageTone: "neutral",
    },
    billing: {
      selectedPlan: "",
      selectedMethod: "stripe",
      currentStep: 1,
      activePlan: "",
      wallets: [],
      selectedWalletNetwork: "",
      cryptoLoaded: false,
      isLoadingCrypto: false,
      copiedNetwork: "",
      status: "",
    },
  };

  const getUserDisplayName = () => {
    const user = state.user || {};
    const fullName = user.profile?.full_name || user.full_name || user.name || user.username;
    if (fullName) return fullName;
    if (user.email?.includes("@")) return user.email.split("@")[0];
    return "Resume Builder";
  };

  const setBanner = (text, tone = "neutral") => {
    state.banner = text ? { text, tone } : null;
  };

  const trialSnapshot = () => {
    const trial = state.trial;

    if (!trial) {
      return {
        badge: "Status unavailable",
        title: "Trial details could not be loaded",
        tone: "warning",
        message: "You can keep working for now, but review billing before payment changes.",
        remainingDays: "--",
        actionLabel: "Review billing",
      };
    }

    if (trial.remaining_days > 0) {
      return {
        badge: "Trial active",
        title: `${trial.remaining_days} day${trial.remaining_days === 1 ? "" : "s"} remaining`,
        tone: "good",
        message: "Your workspace is still in trial. Finish the draft and review payment options before access runs out.",
        remainingDays: trial.remaining_days,
        actionLabel: "Review plans",
      };
    }

    return {
      badge: "Payment needed",
      title: "Your trial has ended",
      tone: "danger",
      message: "Open billing and choose a payment route before the next gated step.",
      remainingDays: 0,
      actionLabel: "Pay now",
    };
  };

  const trialEndDate = () => {
    if (!state.trial?.started_at || !state.trial?.trial_days) return "Not available";
    const endDate = new Date(state.trial.started_at);
    endDate.setDate(endDate.getDate() + state.trial.trial_days);
    return h.formatShortDate(endDate);
  };

  const hasResumeUnsavedChanges = () => JSON.stringify(state.resume.payload) !== state.resume.lastSavedSnapshot;

  let resumePreviewFrame = null;

  const refreshResumeLiveRegions = () => {
    const indicator = document.querySelector(".save-indicator");
    if (indicator) {
      const isDirty = hasResumeUnsavedChanges();
      indicator.className = `save-indicator ${isDirty ? "dirty" : "clean"}`;
      indicator.textContent = isDirty ? "Unsaved changes" : "All changes saved";
    }

    const preview = document.querySelector(".preview-panel");
    if (preview) preview.outerHTML = renderResumePreview();
  };

  const scheduleResumeLiveRefresh = () => {
    if (resumePreviewFrame) window.cancelAnimationFrame(resumePreviewFrame);
    // Keep typing smooth by refreshing the document preview outside the input event itself.
    resumePreviewFrame = window.requestAnimationFrame(() => {
      resumePreviewFrame = null;
      refreshResumeLiveRegions();
    });
  };

  const navigateTo = (viewId) => {
    if (!viewId || viewId === state.activeView) return;
    state.viewHistory.push(state.activeView);
    state.activeView = viewId;
    setBanner("");
    render();
  };

  const navigateBack = () => {
    if (!state.viewHistory.length) return;
    state.activeView = state.viewHistory.pop();
    setBanner("");
    render();
  };

  const renderShell = (content) => {
    const menu = [
      { id: "dashboard", label: "Overview", meta: "Access and next steps" },
      { id: "resume", label: "Resume", meta: "Draft, upload, parse" },
      { id: "job", label: "Target Role", meta: "Save latest 5 roles" },
      { id: "billing", label: "Billing", meta: "Stripe and crypto" },
    ];
    const access = trialSnapshot();
    const canGoBack = state.viewHistory.length > 0;

    return `
      <div class="app-frame">
        <header class="titlebar">
          <div class="traffic" aria-hidden="true"><span></span><span></span><span></span></div>
          <div class="titlebar-title">Resume Builder Desktop</div>
          <div class="titlebar-actions">
            <span class="titlebar-account">${h.escapeHtml(state.user?.email || getUserDisplayName())}</span>
            <button class="icon-btn" id="chromeBackBtn" type="button" ${canGoBack ? "" : "disabled"} title="Back">${h.icon("back")}</button>
            <button class="icon-btn" id="chromeReloadBtn" type="button" title="Reload">${h.icon("reload")}</button>
            <button class="secondary-btn titlebar-logout" data-logout type="button">Logout</button>
          </div>
        </header>
        <div class="workspace-shell">
          <aside class="sidebar">
            <div class="brand-block">
              <div class="eyebrow">Workspace</div>
              <strong>Desktop</strong>
            </div>
            <div class="access-chip access-${access.tone}">
              <span>${h.escapeHtml(access.badge)}</span>
              <strong>${h.escapeHtml(String(access.remainingDays))}</strong>
            </div>
            <nav class="nav-list">
              ${menu
                .map(
                  (item) => `
                    <button class="nav-item ${state.activeView === item.id ? "active" : ""}" data-view="${item.id}" type="button">
                      <span>${h.escapeHtml(item.label)}</span>
                      <small>${h.escapeHtml(item.meta)}</small>
                    </button>
                  `
                )
                .join("")}
            </nav>
            <div class="account-panel">
              <div class="eyebrow">Signed in</div>
              <strong>${h.escapeHtml(getUserDisplayName())}</strong>
              <span>${h.escapeHtml(state.user?.email || "Account connected")}</span>
              <button class="secondary-btn full" data-logout type="button">Logout</button>
            </div>
          </aside>
          <main class="content">
            ${
              state.banner
                ? `<div class="banner banner-${state.banner.tone}">${h.escapeHtml(state.banner.text)}</div>`
                : ""
            }
            ${content}
          </main>
        </div>
      </div>
    `;
  };

  const renderLogin = (message = "") => {
    appRoot.innerHTML = `
      <div class="app-frame login-frame">
        <header class="titlebar">
          <div class="traffic" aria-hidden="true"><span></span><span></span><span></span></div>
          <div class="titlebar-title">Resume Builder Desktop</div>
          <div class="titlebar-actions">
            <button class="icon-btn" id="loginReloadBtn" type="button" title="Reload">${h.icon("reload")}</button>
          </div>
        </header>
        <main class="login-shell">
          <section class="login-copy">
            <div class="eyebrow">Desktop workflow</div>
            <h1>Focused resume work, without leaving the desk.</h1>
            <p>Sign in to continue draft editing, target role capture, and billing review in one desktop workspace.</p>
            <div class="login-meter">
              <span>Resume</span>
              <span>Target Role</span>
              <span>Billing</span>
            </div>
          </section>
          <section class="login-panel">
            <div class="panel-title">
              <div>
                <div class="eyebrow">Sign in</div>
                <h2>Open workspace</h2>
              </div>
              <span class="pill">Desktop</span>
            </div>
            <label class="field-label" for="email">Email</label>
            <input class="field" id="email" type="email" autocomplete="email" placeholder="name@email.com" />
            <label class="field-label" for="password">Password</label>
            <input class="field" id="password" type="password" autocomplete="current-password" placeholder="Password" />
            <div class="button-row">
              <button class="primary-btn" id="signinBtn" type="button">Sign In</button>
              <button class="secondary-btn" id="signupBtn" type="button">Sign Up on Web</button>
            </div>
            <p class="status-line" id="loginMessage">${h.escapeHtml(message)}</p>
          </section>
        </main>
      </div>
    `;

    bindLoginEvents();
  };

  const renderDashboard = () => {
    const access = trialSnapshot();

    return `
      <section class="page-head">
        <div>
          <div class="eyebrow">Overview</div>
          <h1>${h.escapeHtml(getUserDisplayName())}'s workspace</h1>
        </div>
        <button class="secondary-btn" data-action="refresh-trial" type="button">Refresh status</button>
      </section>

      <section class="status-strip status-${access.tone}">
        <div>
          <div class="eyebrow">Access overview</div>
          <h2>${h.escapeHtml(access.title)}</h2>
          <p>${h.escapeHtml(access.message)}</p>
        </div>
        <button class="dark-btn" data-view="billing" type="button">${h.escapeHtml(access.actionLabel)}</button>
      </section>

      <section class="metric-grid">
        <article class="metric-box">
          <span>Trial remaining</span>
          <strong>${h.escapeHtml(String(access.remainingDays))}</strong>
          <p>${state.trial?.remaining_days > 0 ? "days left before payment is required." : "Use billing to keep access clear."}</p>
        </article>
        <article class="metric-box">
          <span>Billing visibility</span>
          <strong>${state.trial?.remaining_days > 0 ? "Trial in progress" : "Payment check recommended"}</strong>
          <p>Trial start: ${h.escapeHtml(h.formatShortDate(state.trial?.started_at))}</p>
          <p>Trial end target: ${h.escapeHtml(trialEndDate())}</p>
        </article>
      </section>

      <section class="split-grid">
        <article class="dark-panel">
          <div class="eyebrow">Quick actions</div>
          <div class="stack compact">
            <button class="secondary-dark-btn" data-view="resume" type="button">Edit Resume</button>
            <button class="secondary-dark-btn" data-view="job" type="button">Add Job Description</button>
            <button class="secondary-dark-btn" data-view="billing" type="button">${state.trial?.remaining_days > 0 ? "Review Billing" : "Open Billing"}</button>
          </div>
        </article>
        <article class="panel">
          <div class="eyebrow">Next best step</div>
          <h2>${state.trial?.remaining_days > 0 ? "Keep building before trial runs out." : "Handle billing before you continue."}</h2>
          <p>${state.trial?.remaining_days > 0 ? "If your resume basics are not saved yet, start there. If they are, move to the target job and review billing before the end date." : "Your access status needs attention first. Open billing, choose a payment route, then return to editing without uncertainty."}</p>
          <div class="inline-actions">
            <button class="primary-btn" data-view="${state.trial?.remaining_days > 0 ? "resume" : "billing"}" type="button">${state.trial?.remaining_days > 0 ? "Continue Resume Setup" : "Go to Billing"}</button>
            <button class="secondary-btn" data-view="job" type="button">Open Job Target</button>
          </div>
        </article>
      </section>
    `;
  };

  const field = ({ label, value, path, placeholder = "", type = "text", error = "" }) => `
    <label class="field-group">
      <span>${h.escapeHtml(label)}</span>
      <input class="field ${error ? "field-error" : ""}" data-resume-field="${h.escapeAttr(path)}" type="${type}" value="${h.escapeAttr(value)}" placeholder="${h.escapeAttr(placeholder)}" />
      ${error ? `<small class="field-hint error">${h.escapeHtml(error)}</small>` : ""}
    </label>
  `;

  const textarea = ({ label, value, path, placeholder = "", rows = 4, error = "" }) => `
    <label class="field-group">
      <span>${h.escapeHtml(label)}</span>
      <textarea class="field ${error ? "field-error" : ""}" data-resume-field="${h.escapeAttr(path)}" rows="${rows}" placeholder="${h.escapeAttr(placeholder)}">${h.escapeHtml(value)}</textarea>
      ${error ? `<small class="field-hint error">${h.escapeHtml(error)}</small>` : ""}
    </label>
  `;

  const sectionHeader = (id, title, eyebrow, actionHtml = "") => `
    <div class="section-head">
      <div>
        <div class="eyebrow">${h.escapeHtml(eyebrow)}</div>
        <h2>${h.escapeHtml(title)}</h2>
      </div>
      <div class="inline-actions tight">
        ${actionHtml}
        <button class="icon-btn light" data-resume-action="toggle-section" data-section="${id}" type="button" title="Toggle section">${state.resume.sectionVisibility[id] ? "Hide" : "Show"}</button>
      </div>
    </div>
  `;

  const renderExperienceItem = (item, index) => `
    <div class="record-row">
      <div class="record-toolbar">
        <strong>Experience ${index + 1}</strong>
        <div class="inline-actions tight">
          <button class="mini-btn" data-resume-action="move-experience" data-direction="up" data-index="${index}" type="button" ${index === 0 ? "disabled" : ""}>Up</button>
          <button class="mini-btn" data-resume-action="move-experience" data-direction="down" data-index="${index}" type="button" ${index === state.resume.payload.content_json.experience.length - 1 ? "disabled" : ""}>Down</button>
          <button class="mini-btn danger" data-resume-action="remove-experience" data-index="${index}" type="button">${h.icon("trash")}</button>
        </div>
      </div>
      <div class="form-grid two">
        <label class="field-group"><span>Role</span><input class="field" data-exp-index="${index}" data-exp-field="role" value="${h.escapeAttr(item.role)}" placeholder="Product Manager" /></label>
        <label class="field-group"><span>Company</span><input class="field" data-exp-index="${index}" data-exp-field="company" value="${h.escapeAttr(item.company)}" placeholder="Company" /></label>
        <label class="field-group"><span>Employment type</span><input class="field" data-exp-index="${index}" data-exp-field="employmentType" value="${h.escapeAttr(item.employmentType)}" placeholder="Full-time" /></label>
        <label class="field-group"><span>Location</span><input class="field" data-exp-index="${index}" data-exp-field="location" value="${h.escapeAttr(item.location)}" placeholder="Remote" /></label>
        <label class="field-group"><span>Start date</span><input class="field" data-exp-index="${index}" data-exp-field="startDate" value="${h.escapeAttr(item.startDate)}" placeholder="Jan 2024" /></label>
        <label class="field-group"><span>End date</span><input class="field" data-exp-index="${index}" data-exp-field="endDate" value="${h.escapeAttr(item.endDate)}" placeholder="Present" ${item.isCurrent ? "disabled" : ""} /></label>
      </div>
      <label class="check-row"><input type="checkbox" data-exp-index="${index}" data-exp-field="isCurrent" ${item.isCurrent ? "checked" : ""} /> <span>This is my current role</span></label>
      <label class="field-group">
        <span>Highlights</span>
        <textarea class="field" data-exp-index="${index}" data-exp-field="highlights" rows="5" placeholder="Write one achievement per line.">${h.escapeHtml(item.highlights)}</textarea>
      </label>
    </div>
  `;

  const renderEducationItem = (item, index) => `
    <div class="record-row">
      <div class="record-toolbar">
        <strong>Education ${index + 1}</strong>
        <div class="inline-actions tight">
          <button class="mini-btn" data-resume-action="move-education" data-direction="up" data-index="${index}" type="button" ${index === 0 ? "disabled" : ""}>Up</button>
          <button class="mini-btn" data-resume-action="move-education" data-direction="down" data-index="${index}" type="button" ${index === state.resume.payload.content_json.education.length - 1 ? "disabled" : ""}>Down</button>
          <button class="mini-btn danger" data-resume-action="remove-education" data-index="${index}" type="button">${h.icon("trash")}</button>
        </div>
      </div>
      <div class="form-grid two">
        <label class="field-group"><span>School</span><input class="field" data-edu-index="${index}" data-edu-field="school" value="${h.escapeAttr(item.school)}" placeholder="School" /></label>
        <label class="field-group"><span>Degree</span><input class="field" data-edu-index="${index}" data-edu-field="degree" value="${h.escapeAttr(item.degree)}" placeholder="Degree" /></label>
        <label class="field-group"><span>Field</span><input class="field" data-edu-index="${index}" data-edu-field="field" value="${h.escapeAttr(item.field)}" placeholder="Field of study" /></label>
        <label class="field-group"><span>Start date</span><input class="field" data-edu-index="${index}" data-edu-field="startDate" value="${h.escapeAttr(item.startDate)}" placeholder="2020" /></label>
        <label class="field-group span-two"><span>End date</span><input class="field" data-edu-index="${index}" data-edu-field="endDate" value="${h.escapeAttr(item.endDate)}" placeholder="2024" /></label>
      </div>
    </div>
  `;

  const renderResumePreview = () => {
    const payload = state.resume.payload;
    const content = payload.content_json;
    const contactItems = [
      content.contact_details.email,
      content.contact_details.phone,
      content.contact_details.location,
      content.contact_details.website,
      content.contact_details.linkedin,
    ].filter(Boolean);
    const skills = content.skills.filter(Boolean);
    const experiences = content.experience.filter((item) => item.role || item.company || item.highlights);
    const education = content.education.filter((item) => item.school || item.degree || item.field);

    return `
      <aside class="preview-panel">
        <div class="preview-toolbar">
          <div>
            <div class="eyebrow">Document preview</div>
            <h2>${h.escapeHtml(payload.title || "Untitled resume draft")}</h2>
          </div>
          <span class="pill">${h.escapeHtml(payload.source_type)}</span>
        </div>
        <div class="resume-page">
          <header class="resume-preview-head">
            <div>
              <h3>${h.escapeHtml(content.name || "Your full name")}</h3>
              <p>${h.escapeHtml(content.headline || "Your headline will appear here")}</p>
            </div>
            <div class="resume-contact">${contactItems.length ? contactItems.map((item) => `<span>${h.escapeHtml(item)}</span>`).join("") : "<span>Email, phone, location, and links will appear here.</span>"}</div>
          </header>
          <section>
            <h4>Professional Summary</h4>
            <p>${h.escapeHtml(content.summary || "Add a short summary so the top of the resume explains your focus.")}</p>
          </section>
          <section>
            <h4>Core Skills</h4>
            <p>${h.escapeHtml(skills.length ? skills.join(" | ") : "Add skills to shape the keyword line.")}</p>
          </section>
          <section>
            <h4>Professional Experience</h4>
            ${
              experiences.length
                ? experiences
                    .map(
                      (item) => `
                        <article class="resume-preview-item">
                          <div>
                            <strong>${h.escapeHtml(item.role || "Role title")}</strong>
                            <span>${h.escapeHtml([item.company, item.location, item.employmentType].filter(Boolean).join(" | ") || "Company | Location")}</span>
                          </div>
                          <small>${h.escapeHtml(item.startDate || "Start")} - ${h.escapeHtml(item.isCurrent ? "Present" : item.endDate || "End")}</small>
                          <p>${h.escapeHtml(item.highlights || "Add impact-focused highlights for this role.")}</p>
                        </article>
                      `
                    )
                    .join("")
                : "<p>Add at least one role to shape the main body.</p>"
            }
          </section>
          <section>
            <h4>Education</h4>
            ${
              education.length
                ? education
                    .map(
                      (item) => `
                        <article class="resume-preview-item compact-preview">
                          <div>
                            <strong>${h.escapeHtml([item.degree, item.field].filter(Boolean).join(", ") || "Degree details")}</strong>
                            <span>${h.escapeHtml(item.school || "School name")}</span>
                          </div>
                          <small>${h.escapeHtml(item.startDate || "Start")} - ${h.escapeHtml(item.endDate || "End")}</small>
                        </article>
                      `
                    )
                    .join("")
                : "<p>Education details will appear here.</p>"
            }
          </section>
        </div>
      </aside>
    `;
  };

  const renderResume = () => {
    const rs = state.resume;
    const payload = rs.payload;
    const content = payload.content_json;
    const errors = rs.validationErrors;
    const fileLabel = rs.selectedFile ? `${rs.selectedFile.name} - ${h.formatFileSize(rs.selectedFile.size)}` : "No file selected";

    if (rs.loading) {
      return `<section class="panel"><div class="loading-row">Checking for a saved draft...</div></section>`;
    }

    return `
      <section class="page-head">
        <div>
          <div class="eyebrow">Resume</div>
          <h1>${h.escapeHtml(payload.title || "Resume editor")}</h1>
        </div>
        <div class="inline-actions">
          <span class="save-indicator ${hasResumeUnsavedChanges() ? "dirty" : "clean"}">${hasResumeUnsavedChanges() ? "Unsaved changes" : "All changes saved"}</span>
          <button class="primary-btn" data-resume-action="save" type="button" ${rs.isSaving ? "disabled" : ""}>${rs.isSaving ? "Saving..." : "Save Draft"}</button>
        </div>
      </section>

      ${rs.generationContext ? `<div class="banner banner-neutral">Target role selected: ${h.escapeHtml(rs.generationContext.title || "Saved job target")}.</div>` : ""}
      ${rs.loadStatus ? `<div class="inline-note">${h.escapeHtml(rs.loadStatus)}</div>` : ""}
      ${rs.status ? `<div class="inline-note">${h.escapeHtml(rs.status)}</div>` : ""}

      <section class="resume-workbench">
        <div class="editor-stack" data-resume-panel>
          <section class="panel">
            <div class="upload-row">
              <div>
                <div class="eyebrow">Upload and parse</div>
                <strong>${h.escapeHtml(fileLabel)}</strong>
                <p>${h.escapeHtml(rs.uploadStatus || rs.parseStatus || "PDF, DOC, DOCX, and TXT files are supported.")}</p>
              </div>
              <div class="inline-actions">
                <button class="secondary-btn" data-resume-action="choose-file" type="button">${h.icon("upload")} Choose File</button>
                <button class="primary-btn" data-resume-action="upload" type="button" ${rs.isUploading || !rs.selectedFile ? "disabled" : ""}>${rs.isUploading ? "Uploading..." : "Upload Resume"}</button>
                ${
                  rs.lastUploadId
                    ? `<button class="secondary-btn" data-resume-action="apply-parsed" type="button" ${rs.isApplyingParsed ? "disabled" : ""}>${rs.isApplyingParsed ? "Applying..." : "Apply Parsed"}</button>`
                    : ""
                }
              </div>
            </div>
            ${rs.parseStatus ? `<p class="status-line">${h.escapeHtml(rs.parseStatus)}</p>` : ""}
          </section>

          <section class="panel">
            ${sectionHeader("profile", "Profile basics", "Resume setup")}
            ${
              rs.sectionVisibility.profile
                ? `<div class="form-grid two">
                    ${field({ label: "Resume title", value: payload.title, path: "title", placeholder: "Product Manager Resume", error: errors.title })}
                    ${field({ label: "Full name", value: content.name, path: "content.name", placeholder: "Full name", error: errors.name })}
                    ${field({ label: "Headline", value: content.headline, path: "content.headline", placeholder: "Product manager | SaaS | Growth" })}
                  </div>`
                : ""
            }
          </section>

          <section class="panel">
            ${sectionHeader("contact", "Contact", "Resume setup")}
            ${
              rs.sectionVisibility.contact
                ? `<div class="form-grid two">
                    ${field({ label: "Email", value: content.contact_details.email, path: "contact.email", placeholder: "name@example.com", error: errors.email })}
                    ${field({ label: "Phone", value: content.contact_details.phone, path: "contact.phone", placeholder: "+1 555 0100" })}
                    ${field({ label: "Location", value: content.contact_details.location, path: "contact.location", placeholder: "New York, NY" })}
                    ${field({ label: "Website", value: content.contact_details.website, path: "contact.website", placeholder: "portfolio.com", error: errors.website })}
                    ${field({ label: "LinkedIn", value: content.contact_details.linkedin, path: "contact.linkedin", placeholder: "linkedin.com/in/name", error: errors.linkedin })}
                  </div>`
                : ""
            }
          </section>

          <section class="panel">
            ${sectionHeader("summary", "Professional summary", "Resume content")}
            ${rs.sectionVisibility.summary ? textarea({ label: "Summary", value: content.summary, path: "content.summary", rows: 5, placeholder: "Write a concise summary of your focus, scope, and impact.", error: errors.body }) : ""}
          </section>

          <section class="panel">
            ${sectionHeader("skills", "Core skills", "Resume content")}
            ${rs.sectionVisibility.skills ? textarea({ label: "Skills", value: content.skills.join(", "), path: "content.skills", rows: 3, placeholder: "Product strategy, Roadmapping, Analytics" }) : ""}
          </section>

          <section class="panel">
            ${sectionHeader("experience", "Work history", "Resume content", `<button class="icon-btn light" data-resume-action="add-experience" type="button" title="Add experience">${h.icon("plus")}</button>`)}
            ${rs.sectionVisibility.experience ? `<div class="stack">${content.experience.map(renderExperienceItem).join("")}</div>${errors.experienceDates ? `<small class="field-hint error">${h.escapeHtml(errors.experienceDates)}</small>` : ""}` : ""}
          </section>

          <section class="panel">
            ${sectionHeader("education", "Education", "Resume content", `<button class="icon-btn light" data-resume-action="add-education" type="button" title="Add education">${h.icon("plus")}</button>`)}
            ${rs.sectionVisibility.education ? `<div class="stack">${content.education.map(renderEducationItem).join("")}</div>${errors.educationDates ? `<small class="field-hint error">${h.escapeHtml(errors.educationDates)}</small>` : ""}` : ""}
          </section>
        </div>
        ${renderResumePreview()}
      </section>
    `;
  };

  const renderJobCard = (item) => {
    const isSelected = item.id === state.job.selectedRecentJobId;
    return `
      <article
        aria-label="Load ${h.escapeAttr(item.job_title || "saved target role")}"
        class="job-card ${isSelected ? "selected" : ""}"
        data-job-action="load-recent"
        data-id="${h.escapeAttr(item.id)}"
        role="button"
        tabindex="0"
        title="Click to display this target role"
      >
        <div>
          <strong>${h.escapeHtml(item.job_title || "Untitled target")}</strong>
          <small>${h.escapeHtml(item.source_type === "manual" ? "Manual" : "Link")} | ${h.escapeHtml(h.formatSavedAt(item.savedAt))}</small>
          <p>${h.escapeHtml(item.job_link ? h.truncate(item.job_link, 54) : S.jobs.getPreviewText(item.raw_text))}</p>
        </div>
        <div class="inline-actions tight">
          <button class="mini-btn" data-job-action="generate-recent" data-id="${h.escapeAttr(item.id)}" type="button">Generate</button>
          <button class="mini-btn danger" data-job-action="delete-recent" data-id="${h.escapeAttr(item.id)}" type="button" ${state.job.deletingJobId === item.id ? "disabled" : ""}>${state.job.deletingJobId === item.id ? "Deleting" : "Delete"}</button>
        </div>
      </article>
    `;
  };

  const renderJob = () => {
    const js = state.job;
    const form = js.form;
    const hasLink = form.job_link.trim().length > 0;
    const isLinkValid = !hasLink || h.isLikelyJobLink(form.job_link);

    return `
      <section class="page-head">
        <div>
          <div class="eyebrow">Target role</div>
          <h1>${h.escapeHtml(S.jobs.getTargetLabel(form))}</h1>
        </div>
        <button class="secondary-btn" data-job-action="refresh-recent" type="button">Refresh list</button>
      </section>

      <section class="split-grid wide-left">
        <div class="panel" data-job-panel>
          <div class="section-head">
            <div>
              <div class="eyebrow">Target role form</div>
              <h2>Input mode and role details</h2>
            </div>
            <div class="segmented">
              <button class="${form.source_type === "manual" ? "active" : ""}" data-job-source="manual" type="button">Paste Description</button>
              <button class="${form.source_type === "link" ? "active" : ""}" data-job-source="link" type="button">Use Link</button>
            </div>
          </div>
          <div class="form-grid">
            <label class="field-group">
              <span>Job title *</span>
              <input class="field" data-job-field="job_title" value="${h.escapeAttr(form.job_title)}" placeholder="Senior Product Manager" />
            </label>
            ${
              form.source_type === "link"
                ? `<label class="field-group">
                    <span>Job link *</span>
                    <input class="field ${hasLink && !isLinkValid ? "field-error" : ""}" data-job-field="job_link" value="${h.escapeAttr(form.job_link)}" placeholder="https://company.com/jobs/senior-product-manager" />
                    ${hasLink && !isLinkValid ? '<small class="field-hint error">Use a full URL starting with http:// or https://.</small>' : ""}
                  </label>`
                : ""
            }
            <label class="field-group">
              <span>${form.source_type === "manual" ? "Job description *" : "Pasted description"}</span>
              <textarea class="field tall" data-job-field="raw_text" placeholder="${form.source_type === "manual" ? "Paste the full job description here." : "Optional but useful for richer context."}">${h.escapeHtml(form.raw_text)}</textarea>
            </label>
          </div>
          <div class="inline-actions">
            <button class="primary-btn" data-job-action="generate" type="button" ${js.isSaving ? "disabled" : ""}>${js.isSaving ? "Saving..." : "Generate Resume"}</button>
            <button class="secondary-btn" data-job-action="save" type="button" ${js.isSaving ? "disabled" : ""}>Save for Later</button>
            <button class="secondary-btn" data-job-action="clear" type="button">Clear</button>
          </div>
          ${js.message ? `<div class="banner banner-${js.messageTone}">${h.escapeHtml(js.message)}</div>` : ""}
        </div>

        <aside class="panel">
          <div class="section-head">
            <div>
              <div class="eyebrow">Recent job targets</div>
              <h2>Latest saved 5</h2>
            </div>
            <span class="pill">${js.isLoadingRecentJobs ? "..." : `${js.recentJobs.length}/5`}</span>
          </div>
          ${
            js.isLoadingRecentJobs
              ? '<div class="loading-row">Loading recent target roles...</div>'
              : js.recentJobs.length
                ? `<div class="stack">${js.recentJobs.map(renderJobCard).join("")}</div>`
                : '<div class="empty-state">No saved target roles yet.</div>'
          }
        </aside>
      </section>
    `;
  };

  const getSelectedPlan = () => S.constants.stripePlans.find((plan) => plan.id === state.billing.selectedPlan) || null;
  const getSelectedMethod = () => S.constants.paymentMethods.find((method) => method.id === state.billing.selectedMethod) || null;

  const canOpenBillingStep = (stepId) => {
    if (stepId === 1) return true;
    if (stepId === 2) return Boolean(getSelectedPlan());
    if (stepId === 3) return Boolean(getSelectedPlan() && getSelectedMethod());
    return false;
  };

  const renderWizardProgress = () => `
    <div class="wizard-progress">
      ${S.constants.wizardSteps
        .map((step) => {
          const isActive = state.billing.currentStep === step.id;
          const isComplete = state.billing.currentStep > step.id;
          return `
            <button class="${isActive ? "active" : ""} ${isComplete ? "complete" : ""}" data-billing-step="${step.id}" type="button" ${canOpenBillingStep(step.id) ? "" : "disabled"}>
              <span>${step.id}</span>${h.escapeHtml(step.label)}
            </button>
          `;
        })
        .join("")}
    </div>
  `;

  const renderBilling = () => {
    const bs = state.billing;
    const selectedPlan = getSelectedPlan();
    const selectedMethod = getSelectedMethod();
    const walletOptions = bs.wallets.length ? bs.wallets : S.constants.cryptoPreviewWallets;
    const selectedWallet = walletOptions.find((wallet) => wallet.network === bs.selectedWalletNetwork) || walletOptions[0] || null;
    const isUsingPreviewWallets = !bs.wallets.length;

    return `
      <section class="page-head">
        <div>
          <div class="eyebrow">Billing</div>
          <h1>${selectedPlan ? selectedPlan.title : "Choose a price plan"}</h1>
        </div>
      </section>
      ${bs.status ? `<div class="banner banner-neutral">${h.escapeHtml(bs.status)}</div>` : ""}

      ${
        bs.currentStep === 1
          ? `<section class="panel">
              ${renderWizardProgress()}
              <div class="section-head">
                <div>
                  <div class="eyebrow">Plan</div>
                  <h2>Choose a price plan</h2>
                </div>
              </div>
              <div class="option-list">
                ${S.constants.stripePlans
                  .map(
                    (plan) => `
                      <button class="option-row ${bs.selectedPlan === plan.id ? "selected" : ""}" data-plan="${plan.id}" type="button">
                        <span>
                          <small>${h.escapeHtml(plan.label)}</small>
                          <strong>${h.escapeHtml(plan.title)}</strong>
                          <em>${h.escapeHtml(plan.summary)}</em>
                        </span>
                        <span class="price">${h.escapeHtml(plan.price)} <small>${h.escapeHtml(plan.cadence)}</small></span>
                      </button>
                    `
                  )
                  .join("")}
              </div>
              <div class="inline-actions end">
                <button class="primary-btn" data-billing-next="2" type="button" ${selectedPlan ? "" : "disabled"}>Continue to Payment Method ${h.icon("arrowRight")}</button>
              </div>
            </section>`
          : ""
      }

      ${
        bs.currentStep === 2 && selectedPlan
          ? `<section class="panel">
              ${renderWizardProgress()}
              <div class="section-head">
                <div>
                  <div class="eyebrow">Method</div>
                  <h2>Choose a payment method</h2>
                </div>
              </div>
              <div class="option-list">
                ${S.constants.paymentMethods
                  .map(
                    (method) => `
                      <button class="option-row ${bs.selectedMethod === method.id ? "selected" : ""}" data-method="${method.id}" type="button">
                        <span>
                          <small>${h.escapeHtml(method.eyebrow)}</small>
                          <strong>${h.escapeHtml(method.title)}</strong>
                          <em>${h.escapeHtml(method.description)}</em>
                        </span>
                        <span class="pill">${h.escapeHtml(method.badge)}</span>
                      </button>
                    `
                  )
                  .join("")}
              </div>
              <div class="inline-actions split">
                <button class="secondary-btn" data-billing-next="1" type="button">Back to Plan</button>
                <button class="primary-btn" data-billing-next="3" type="button">Continue to Payment ${h.icon("arrowRight")}</button>
              </div>
            </section>`
          : ""
      }

      ${
        bs.currentStep === 3 && selectedPlan && bs.selectedMethod === "stripe"
          ? `<section class="panel">
              ${renderWizardProgress()}
              <div class="payment-box">
                <div>
                  <div class="eyebrow">Stripe checkout</div>
                  <h2>Pay with card in a hosted flow</h2>
                  <p>${h.escapeHtml(selectedPlan.summary)}</p>
                  <strong>${h.escapeHtml(selectedPlan.price)} <small>${h.escapeHtml(selectedPlan.cadence)}</small></strong>
                </div>
                <button class="primary-btn" data-billing-action="stripe" type="button" ${bs.activePlan ? "disabled" : ""}>${bs.activePlan ? "Opening Stripe..." : "Open Stripe Checkout"} ${h.icon("arrowRight")}</button>
              </div>
              <div class="inline-actions"><button class="secondary-btn" data-billing-next="2" type="button">Back to Method</button></div>
            </section>`
          : ""
      }

      ${
        bs.currentStep === 3 && selectedPlan && bs.selectedMethod === "crypto"
          ? `<section class="panel dark-payment">
              ${renderWizardProgress()}
              <div class="section-head">
                <div>
                  <div class="eyebrow">Crypto payment</div>
                  <h2>Choose crypto, then follow the wallet flow</h2>
                </div>
                <span class="pill">${bs.isLoadingCrypto ? "Refreshing" : isUsingPreviewWallets ? "Preview" : "Live"}</span>
              </div>
              ${
                selectedWallet
                  ? `<div class="wallet-layout">
                      <div class="wallet-qr">
                        <img alt="${h.escapeAttr(selectedWallet.network)} wallet qr" src="${h.escapeAttr(selectedWallet.qr_code_data_url)}" />
                        <span>Scan QR</span>
                      </div>
                      <div class="wallet-detail">
                        <div class="wallet-tabs">
                          ${walletOptions
                            .map(
                              (wallet) => `
                                <button class="${wallet.network === selectedWallet.network ? "active" : ""}" data-wallet="${h.escapeAttr(wallet.network)}" type="button">${h.escapeHtml(wallet.network)}</button>
                              `
                            )
                            .join("")}
                        </div>
                        <h3>${h.escapeHtml(selectedWallet.network)}</h3>
                        <div class="warning-box">Send funds only on the selected network. ${isUsingPreviewWallets ? "Preview values are shown until live wallet data is available." : ""}</div>
                        <div class="address-box">
                          <span>${h.escapeHtml(selectedWallet.address)}</span>
                          <button class="secondary-btn" data-copy-wallet="${h.escapeAttr(selectedWallet.network)}" type="button">${h.icon("copy")} ${bs.copiedNetwork === selectedWallet.network ? "Copied" : "Copy"}</button>
                        </div>
                      </div>
                    </div>`
                  : '<div class="empty-state">Crypto payment details are not available right now.</div>'
              }
              <div class="inline-actions"><button class="secondary-btn" data-billing-next="2" type="button">Back to Method</button></div>
            </section>`
          : ""
      }
    `;
  };

  const render = () => {
    if (!state.user) return renderLogin();

    let content = "";
    if (state.activeView === "dashboard") content = renderDashboard();
    if (state.activeView === "resume") content = renderResume();
    if (state.activeView === "job") content = renderJob();
    if (state.activeView === "billing") content = renderBilling();

    appRoot.innerHTML = renderShell(content);
    bindShellEvents();
    bindActiveViewEvents();
  };

  const bindLoginEvents = () => {
    const submit = async () => {
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;
      const msg = document.getElementById("loginMessage");

      if (!email || !password) {
        msg.textContent = "Email and password are required.";
        return;
      }

      msg.textContent = "Signing in...";

      try {
        await window.desktopApi.signIn({ email, password });
        await loadAuthenticatedState();
      } catch (error) {
        msg.textContent = h.getApiErrorMessage(error, "Sign in failed. Check your email and password.");
      }
    };

    document.getElementById("signinBtn").onclick = submit;
    document.getElementById("password").onkeydown = (event) => {
      if (event.key === "Enter") submit();
    };
    document.getElementById("signupBtn").onclick = () => window.desktopApi.signUpRedirect();
    document.getElementById("loginReloadBtn").onclick = () => window.desktopApi.reloadWindow();
  };

  const bindShellEvents = () => {
    document.getElementById("chromeBackBtn").onclick = navigateBack;
    document.getElementById("chromeReloadBtn").onclick = () => window.desktopApi.reloadWindow();
    const logout = async () => {
      await window.desktopApi.logout();
      state.user = null;
      state.trial = null;
      state.viewHistory = [];
      state.activeView = "dashboard";
      renderLogin("Logged out successfully.");
    };

    document.querySelectorAll("[data-logout]").forEach((button) => {
      button.onclick = logout;
    });

    document.querySelectorAll("[data-view]").forEach((button) => {
      button.onclick = () => navigateTo(button.dataset.view);
    });
  };

  const bindActiveViewEvents = () => {
    if (state.activeView === "dashboard") bindDashboardEvents();
    if (state.activeView === "resume") bindResumeEvents();
    if (state.activeView === "job") bindJobEvents();
    if (state.activeView === "billing") bindBillingEvents();
  };

  const bindDashboardEvents = () => {
    const refreshButton = document.querySelector("[data-action='refresh-trial']");
    if (!refreshButton) return;
    refreshButton.onclick = async () => {
      await refreshTrial();
      setBanner("Access status refreshed.", "success");
      render();
    };
  };

  const ensureResumeLoaded = async () => {
    const rs = state.resume;
    if (rs.loaded || rs.loading) return;

    rs.loading = true;
    rs.loadStatus = "Checking for a saved draft...";
    render();

    try {
      const resumes = await api.listResumes();
      const draft = resumes.find((item) => item.is_draft) || resumes[0];

      if (!draft) {
        rs.loadStatus = "No saved draft found.";
        return;
      }

      const detail = await api.getResumeDetail(draft.id);
      const nextPayload = S.resume.resumeToPayload(detail);
      rs.resumeId = detail.id;
      rs.payload = nextPayload;
      rs.lastSavedSnapshot = JSON.stringify(nextPayload);
      rs.loadStatus = `Loaded saved draft #${detail.id}.`;
    } catch (error) {
      rs.loadStatus = h.getApiErrorMessage(error, "We couldn't load your saved draft right now.");
    } finally {
      rs.loaded = true;
      rs.loading = false;
      render();
    }
  };

  const setResumeValue = (path, value) => {
    const payload = state.resume.payload;
    const content = payload.content_json;

    if (path === "title") payload.title = value;
    if (path === "content.name") content.name = value;
    if (path === "content.headline") content.headline = value;
    if (path === "content.summary") content.summary = value;
    if (path === "content.skills") content.skills = S.resume.parseSkillsInput(value);
    if (path === "contact.email") content.contact_details.email = value;
    if (path === "contact.phone") content.contact_details.phone = value;
    if (path === "contact.location") content.contact_details.location = value;
    if (path === "contact.website") content.contact_details.website = value;
    if (path === "contact.linkedin") content.contact_details.linkedin = value;
  };

  const bindResumeEvents = () => {
    ensureResumeLoaded();

    const panel = document.querySelector("[data-resume-panel]");
    if (panel) {
      panel.oninput = (event) => {
        const target = event.target;
        if (target.dataset.resumeField) setResumeValue(target.dataset.resumeField, target.value);
        if (target.dataset.expIndex) {
          const item = state.resume.payload.content_json.experience[Number(target.dataset.expIndex)];
          if (item) item[target.dataset.expField] = target.value;
        }
        if (target.dataset.eduIndex) {
          const item = state.resume.payload.content_json.education[Number(target.dataset.eduIndex)];
          if (item) item[target.dataset.eduField] = target.value;
        }
        scheduleResumeLiveRefresh();
      };

      panel.onchange = (event) => {
        const target = event.target;
        if (target.dataset.expField === "isCurrent") {
          const item = state.resume.payload.content_json.experience[Number(target.dataset.expIndex)];
          if (item) {
            item.isCurrent = target.checked;
            if (target.checked) item.endDate = "";
            render();
          }
        }
      };
    }

    document.querySelectorAll("[data-resume-action]").forEach((button) => {
      button.onclick = () => handleResumeAction(button);
    });
  };

  const moveItem = (items, index, direction) => {
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= items.length) return;
    const [item] = items.splice(index, 1);
    items.splice(nextIndex, 0, item);
  };

  const handleResumeAction = async (button) => {
    const action = button.dataset.resumeAction;
    const rs = state.resume;
    const content = rs.payload.content_json;

    if (action === "toggle-section") {
      const section = button.dataset.section;
      rs.sectionVisibility[section] = !rs.sectionVisibility[section];
      render();
      return;
    }

    if (action === "add-experience") content.experience.push(S.resume.createExperienceItem());
    if (action === "remove-experience" && content.experience.length > 1) content.experience.splice(Number(button.dataset.index), 1);
    if (action === "move-experience") moveItem(content.experience, Number(button.dataset.index), button.dataset.direction);
    if (action === "add-education") content.education.push(S.resume.createEducationItem());
    if (action === "remove-education" && content.education.length > 1) content.education.splice(Number(button.dataset.index), 1);
    if (action === "move-education") moveItem(content.education, Number(button.dataset.index), button.dataset.direction);

    if (["add-experience", "remove-experience", "move-experience", "add-education", "remove-education", "move-education"].includes(action)) {
      render();
      return;
    }

    if (action === "save") await saveResume();
    if (action === "choose-file") await chooseResumeFile();
    if (action === "upload") await uploadResumeFile();
    if (action === "apply-parsed") await applyParsedResume();
  };

  const saveResume = async () => {
    const rs = state.resume;
    rs.status = "";
    rs.validationErrors = S.resume.validateManualResumePayload(rs.payload);

    if (Object.keys(rs.validationErrors).length) {
      rs.status = "Please fix the highlighted fields before saving.";
      render();
      return null;
    }

    rs.isSaving = true;
    render();

    try {
      if (rs.resumeId) {
        // The backend keeps body content and draft metadata on separate endpoints,
        // so desktop follows the same two-step save path as the web editor.
        const { resume, nextPayload } = await api.autosaveResumeDraft(rs.resumeId, rs.payload);
        const updatedResume = await api.updateResumeDraftMeta(rs.resumeId, nextPayload);
        const savedPayload = {
          ...nextPayload,
          title: updatedResume?.title || resume?.title || nextPayload.title,
          source_type: updatedResume?.source_type || resume?.source_type || nextPayload.source_type,
          is_draft: updatedResume?.is_draft ?? resume?.is_draft ?? nextPayload.is_draft,
        };
        rs.payload = savedPayload;
        rs.lastSavedSnapshot = JSON.stringify(savedPayload);
        rs.status = "Draft updated successfully.";
      } else {
        const { resume, nextPayload } = await api.createResumeDraft(rs.payload);
        const savedPayload = S.resume.resumeToPayload(resume?.id ? resume : nextPayload);
        rs.resumeId = resume.id;
        rs.payload = savedPayload;
        rs.lastSavedSnapshot = JSON.stringify(savedPayload);
        rs.status = "Draft saved successfully.";
      }

      rs.validationErrors = {};
      return rs.resumeId;
    } catch (error) {
      rs.status = h.getApiErrorMessage(error, "We couldn't save the draft right now.");
      return null;
    } finally {
      rs.isSaving = false;
      render();
    }
  };

  const chooseResumeFile = async () => {
    try {
      const file = await window.desktopApi.chooseResumeFile();
      if (!file) return;

      const fileError = S.resume.getResumeFileError(file);
      if (fileError) {
        state.resume.selectedFile = null;
        state.resume.uploadStatus = fileError;
      } else {
        state.resume.selectedFile = file;
        state.resume.uploadStatus = `${file.name} is ready to upload.`;
        state.resume.parseStatus = "";
      }
    } catch (error) {
      state.resume.uploadStatus = h.getApiErrorMessage(error, "Choose a PDF, DOC, DOCX, or TXT file.");
    } finally {
      render();
    }
  };

  const uploadResumeFile = async () => {
    const rs = state.resume;
    if (!rs.selectedFile) {
      rs.uploadStatus = "Choose a PDF, DOC, DOCX, or TXT file first.";
      render();
      return;
    }

    rs.isUploading = true;
    rs.uploadStatus = "";
    rs.parseStatus = "";
    render();

    try {
      let nextResumeId = rs.resumeId;
      let workingPayload = rs.payload;
      const baseTitle = rs.payload.title.trim() || rs.selectedFile.name.replace(/\.[^.]+$/, "");

      if (!nextResumeId) {
        // Uploads are attached to a resume record, so create a lightweight draft first
        // when the user starts from a file instead of manual fields.
        const uploadDraftPayload = {
          ...rs.payload,
          title: baseTitle,
          source_type: "upload",
        };
        const { resume, nextPayload } = await api.createResumeDraft(uploadDraftPayload);
        nextResumeId = resume.id;
        workingPayload = nextPayload;
        rs.resumeId = nextResumeId;
      }

      const uploadData = await window.desktopApi.uploadResumeFile(nextResumeId, rs.selectedFile.path);
      const uploadedRecord = uploadData.upload || uploadData;
      const uploadId = uploadedRecord?.id;
      const uploadedPayload = {
        ...workingPayload,
        title: workingPayload.title || baseTitle,
        source_type: "upload",
      };

      rs.uploadedFileName = rs.selectedFile.name;
      rs.payload = uploadedPayload;
      rs.lastSavedSnapshot = JSON.stringify(uploadedPayload);
      rs.uploadStatus = uploadId ? `Resume file uploaded successfully. Upload #${uploadId} is ready for parsing.` : "Resume file uploaded successfully.";
      rs.selectedFile = null;
      rs.lastUploadId = uploadId || null;

      if (uploadId) {
        rs.isParsing = true;
        rs.parseStatus = "Parsing uploaded resume...";
        render();

        const parseData = await api.parseResumeUpload(uploadId);
        const parsedRecord = parseData.upload || parseData;
        const parsedContent = parsedRecord?.parsed_content_json || parseData.parsed_content;

        if (parsedContent) {
          rs.payload = {
            ...uploadedPayload,
            content_json: S.resume.normalizeResumeContent(parsedContent),
            source_type: "upload",
          };
          rs.parseStatus = "Parsed content filled the manual fields. Review it, then save the draft.";
        } else {
          rs.parseStatus = "Uploaded and parsed, but no structured resume content was returned.";
        }
      }
    } catch (error) {
      rs.uploadStatus = h.getApiErrorMessage(error, "Upload failed right now.");
    } finally {
      rs.isUploading = false;
      rs.isParsing = false;
      render();
    }
  };

  const applyParsedResume = async () => {
    const rs = state.resume;
    if (!rs.lastUploadId) return;

    rs.isApplyingParsed = true;
    render();

    try {
      const data = await api.applyParsedResumeUpload(rs.lastUploadId, true);
      const resume = data.resume || data;
      if (resume?.id) {
        rs.resumeId = resume.id;
        rs.payload = S.resume.resumeToPayload(resume);
        rs.lastSavedSnapshot = JSON.stringify(rs.payload);
      }
      rs.status = "Parsed content applied to the saved draft.";
      rs.lastUploadId = null;
    } catch (error) {
      rs.status = h.getApiErrorMessage(error, "Parsed content could not be applied right now.");
    } finally {
      rs.isApplyingParsed = false;
      render();
    }
  };

  const ensureRecentJobsLoaded = async () => {
    const js = state.job;
    if (js.isLoadingRecentJobs || js.recentLoaded) return;

    js.isLoadingRecentJobs = true;
    render();

    try {
      const items = await api.listJobDescriptions();
      js.recentJobs = items.map(S.jobs.normalizeRecentJob).slice(0, S.constants.MAX_RECENT_JOBS);
      js.selectedRecentJobId = js.recentJobs[0]?.id || null;
    } catch (error) {
      js.message = h.getApiErrorMessage(error, "We couldn't load saved target roles right now.");
      js.messageTone = "error";
    } finally {
      js.recentLoaded = true;
      js.isLoadingRecentJobs = false;
      render();
    }
  };

  const bindJobEvents = () => {
    ensureRecentJobsLoaded();

    const panel = document.querySelector("[data-job-panel]");
    if (panel) {
      panel.oninput = (event) => {
        const fieldName = event.target.dataset.jobField;
        if (!fieldName) return;
        state.job.form[fieldName] = event.target.value;
        state.job.message = "";
      };
    }

    document.querySelectorAll("[data-job-source]").forEach((button) => {
      button.onclick = () => {
        state.job.form.source_type = button.dataset.jobSource;
        state.job.message = "";
        render();
      };
    });

    document.querySelectorAll("[data-job-action]").forEach((button) => {
      button.onclick = (event) => {
        event.stopPropagation();
        handleJobAction(button);
      };

      if (button.getAttribute("role") === "button") {
        button.onkeydown = (event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          handleJobAction(button);
        };
      }
    });
  };

  const getSelectedRecentJob = () => state.job.recentJobs.find((item) => String(item.id) === String(state.job.selectedRecentJobId)) || null;

  const validateJobForm = (intent = "save") => {
    const form = state.job.form;
    const actionLabel = intent === "generate" ? "generate" : "save";
    const hasTitle = form.job_title.trim().length > 0;
    const hasDescription = form.raw_text.trim().length > 0;
    const hasLink = form.job_link.trim().length > 0;

    if (form.source_type === "manual" && (!hasTitle || !hasDescription)) {
      return `Add a job title and job description before you ${actionLabel}.`;
    }
    if (form.source_type === "link" && (!hasTitle || !hasLink)) {
      return `Add a job title and job link before you ${actionLabel}.`;
    }
    if (hasLink && !h.isLikelyJobLink(form.job_link)) {
      return "Use a complete job link starting with http:// or https:// before you continue.";
    }
    return "";
  };

  const persistTarget = async (intent = "save") => {
    const js = state.job;
    const validationMessage = validateJobForm(intent);

    if (validationMessage) {
      js.message = validationMessage;
      js.messageTone = "warning";
      render();
      return null;
    }

    js.isSaving = true;
    render();

    try {
      const payload = {
        job_title: js.form.job_title.trim(),
        source_type: js.form.source_type,
        job_link: js.form.job_link.trim(),
        raw_text: js.form.raw_text.trim(),
      };
      const selectedJob = getSelectedRecentJob();
      // Recent targets are edited in place when selected, matching the web page's load-and-update behavior.
      const savedJobResponse = selectedJob ? await api.updateJobDescription(selectedJob.id, payload) : await api.createJobDescription(payload);
      const savedJob = S.jobs.normalizeRecentJob(savedJobResponse);

      js.recentJobs = [savedJob, ...js.recentJobs.filter((item) => String(item.id) !== String(savedJob.id))].slice(0, S.constants.MAX_RECENT_JOBS);
      js.selectedRecentJobId = savedJob.id;
      js.message = intent === "generate" ? "Job target saved. Opening the resume workspace." : selectedJob ? "Job target updated." : "Job target saved for later.";
      js.messageTone = "success";
      return savedJob;
    } catch (error) {
      js.message = h.getApiErrorMessage(error, "Failed to save.");
      js.messageTone = "error";
      return null;
    } finally {
      js.isSaving = false;
      render();
    }
  };

  const clearJobForm = () => {
    state.job.form = { ...S.jobs.EMPTY_JOB_FORM };
    state.job.selectedRecentJobId = null;
    state.job.message = "";
    state.job.messageTone = "neutral";
  };

  const loadRecentJob = (item) => {
    state.job.form = {
      job_title: item.job_title || "",
      source_type: item.source_type || "manual",
      job_link: item.job_link || "",
      raw_text: item.raw_text || "",
    };
    state.job.selectedRecentJobId = item.id;
    state.job.message = "";
    state.job.messageTone = "neutral";
  };

  const handleJobAction = async (button) => {
    const action = button.dataset.jobAction;
    const js = state.job;

    if (action === "refresh-recent") {
      js.recentJobs = [];
      js.recentLoaded = false;
      await ensureRecentJobsLoaded();
      return;
    }

    if (action === "clear") {
      clearJobForm();
      render();
      return;
    }

    if (action === "save") {
      await persistTarget("save");
      return;
    }

    if (action === "generate") {
      const savedJob = await persistTarget("generate");
      if (savedJob) {
        state.resume.generationContext = {
          jobDescriptionId: savedJob.id,
          title: savedJob.job_title || S.jobs.getTargetLabel(savedJob),
        };
        navigateTo("resume");
      }
      return;
    }

    const id = button.dataset.id;
    const item = js.recentJobs.find((job) => String(job.id) === String(id));
    if (!item) return;

    if (action === "load-recent") {
      loadRecentJob(item);
      render();
    }

    if (action === "generate-recent") {
      js.selectedRecentJobId = item.id;
      state.resume.generationContext = {
        jobDescriptionId: item.id,
        title: item.job_title || S.jobs.getTargetLabel(item),
      };
      navigateTo("resume");
    }

    if (action === "delete-recent") {
      js.deletingJobId = item.id;
      render();

      try {
        await api.deleteJobDescription(item.id);
        js.recentJobs = js.recentJobs.filter((job) => String(job.id) !== String(item.id));
        if (String(js.selectedRecentJobId) === String(item.id)) clearJobForm();
        js.message = "Job target deleted.";
        js.messageTone = "success";
      } catch (error) {
        js.message = h.getApiErrorMessage(error, "Failed to delete target role.");
        js.messageTone = "error";
      } finally {
        js.deletingJobId = null;
        render();
      }
    }
  };

  const bindBillingEvents = () => {
    document.querySelectorAll("[data-billing-step]").forEach((button) => {
      button.onclick = () => goBillingStep(Number(button.dataset.billingStep));
    });
    document.querySelectorAll("[data-billing-next]").forEach((button) => {
      button.onclick = () => goBillingStep(Number(button.dataset.billingNext));
    });
    document.querySelectorAll("[data-plan]").forEach((button) => {
      button.onclick = () => {
        state.billing.selectedPlan = button.dataset.plan;
        state.billing.status = "";
        render();
      };
    });
    document.querySelectorAll("[data-method]").forEach((button) => {
      button.onclick = () => {
        state.billing.selectedMethod = button.dataset.method;
        state.billing.status = "";
        render();
      };
    });
    document.querySelectorAll("[data-wallet]").forEach((button) => {
      button.onclick = () => {
        state.billing.selectedWalletNetwork = button.dataset.wallet;
        render();
      };
    });

    const stripeButton = document.querySelector("[data-billing-action='stripe']");
    if (stripeButton) stripeButton.onclick = startStripeCheckout;

    document.querySelectorAll("[data-copy-wallet]").forEach((button) => {
      button.onclick = () => copyWalletAddress(button.dataset.copyWallet);
    });

    if (state.billing.currentStep === 3 && state.billing.selectedMethod === "crypto") {
      ensureCryptoLoaded();
    }
  };

  const goBillingStep = (stepId) => {
    if (!canOpenBillingStep(stepId)) return;
    state.billing.currentStep = stepId;
    state.billing.status = "";
    render();
  };

  const startStripeCheckout = async () => {
    const plan = getSelectedPlan();
    if (!plan) return;

    state.billing.activePlan = plan.id;
    state.billing.status = "";
    render();

    try {
      const data = await api.startStripeCheckout(plan.id);
      const checkoutUrl = data.checkout_url || data.url;
      if (!checkoutUrl) throw new Error("Checkout URL was not returned.");
      await window.desktopApi.openExternal(checkoutUrl);
      state.billing.status = "Stripe checkout opened in your browser.";
    } catch (error) {
      state.billing.status = h.getApiErrorMessage(error, "We couldn't start checkout right now. Please try again in a moment.");
    } finally {
      state.billing.activePlan = "";
      render();
    }
  };

  const ensureCryptoLoaded = async () => {
    const bs = state.billing;
    if (bs.cryptoLoaded || bs.isLoadingCrypto) return;

    bs.isLoadingCrypto = true;
    render();

    try {
      const data = await api.loadCryptoPaymentInfo();
      bs.wallets = data.wallets || [];
      bs.selectedWalletNetwork = bs.wallets[0]?.network || S.constants.cryptoPreviewWallets[0]?.network || "";
      if (!bs.wallets.length) {
        bs.status = "Live crypto details are not ready yet, so preview address and QR are shown for the UI.";
      }
    } catch (error) {
      bs.status = h.getApiErrorMessage(error, "We couldn't load crypto payment details right now. Please try again in a moment.");
      bs.selectedWalletNetwork = S.constants.cryptoPreviewWallets[0]?.network || "";
    } finally {
      bs.cryptoLoaded = true;
      bs.isLoadingCrypto = false;
      render();
    }
  };

  const copyWalletAddress = async (network) => {
    const walletOptions = state.billing.wallets.length ? state.billing.wallets : S.constants.cryptoPreviewWallets;
    const wallet = walletOptions.find((item) => item.network === network);
    if (!wallet) return;

    try {
      await window.desktopApi.copyText(wallet.address);
      state.billing.copiedNetwork = network;
      state.billing.status = `${network} wallet address copied.`;
      render();
      window.setTimeout(() => {
        if (state.billing.copiedNetwork === network) {
          state.billing.copiedNetwork = "";
          render();
        }
      }, 1800);
    } catch {
      state.billing.status = "Copy is not available right now. Please select and copy the address manually.";
      render();
    }
  };

  const refreshTrial = async () => {
    try {
      state.trial = await api.loadTrial();
    } catch {
      state.trial = null;
    }
  };

  const loadAuthenticatedState = async () => {
    try {
      const [me, trial] = await Promise.all([window.desktopApi.me(), api.loadTrial().catch(() => null)]);
      state.user = me.user || me;
      state.trial = trial;
      state.activeView = "dashboard";
      state.viewHistory = [];
      render();
    } catch (error) {
      await window.desktopApi.logout();
      state.user = null;
      state.trial = null;
      renderLogin(h.getApiErrorMessage(error, "Session expired. Please sign in again."));
    }
  };

  const bootstrap = async () => {
    const token = await window.desktopApi.getToken();
    if (!token?.access_token && !token?.access && !token?.token) {
      renderLogin();
      return;
    }

    await loadAuthenticatedState();
  };

  bootstrap();
})();
