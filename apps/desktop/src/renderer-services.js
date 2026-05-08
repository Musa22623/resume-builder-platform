(() => {
  const root = (window.RBD = window.RBD || {});
  const h = root.helpers;

  const UPLOAD_ACCEPT = ".pdf,.doc,.docx,.txt";
  const UPLOAD_EXTENSIONS = UPLOAD_ACCEPT.split(",");
  const MAX_RECENT_JOBS = 5;

  const createExperienceItem = () => ({
    role: "",
    company: "",
    employmentType: "",
    location: "",
    startDate: "",
    endDate: "",
    isCurrent: false,
    highlights: "",
  });

  const createEducationItem = () => ({
    school: "",
    degree: "",
    field: "",
    startDate: "",
    endDate: "",
  });

  const normalizeExperienceItem = (item = {}) => ({
    role: item.role || "",
    company: item.company || "",
    employmentType: item.employmentType || item.employment_type || "",
    location: item.location || "",
    startDate: item.startDate || item.start_date || "",
    endDate: item.endDate || item.end_date || "",
    isCurrent: Boolean(item.isCurrent || item.is_current),
    highlights: Array.isArray(item.highlights) ? item.highlights.join("\n") : item.highlights || "",
  });

  const normalizeEducationItem = (item = {}) => ({
    school: item.school || "",
    degree: item.degree || "",
    field: item.field || "",
    startDate: item.startDate || item.start_date || "",
    endDate: item.endDate || item.end_date || "",
  });

  const normalizeResumeContent = (content = {}) => ({
    name: content.name || content.basics?.name || "",
    headline: content.headline || content.basics?.headline || "",
    summary: content.summary || content.basics?.summary || "",
    skills: Array.isArray(content.skills) ? content.skills.map((item) => (typeof item === "string" ? item : item?.name)).filter(Boolean) : [],
    contact_details: {
      email: content.contact_details?.email || content.basics?.email || "",
      phone: content.contact_details?.phone || content.basics?.phone || "",
      location: content.contact_details?.location || content.basics?.location || "",
      website: content.contact_details?.website || content.basics?.website || "",
      linkedin: content.contact_details?.linkedin || content.basics?.linkedin || "",
    },
    experience: Array.isArray(content.experience) && content.experience.length ? content.experience.map(normalizeExperienceItem) : [createExperienceItem()],
    education: Array.isArray(content.education) && content.education.length ? content.education.map(normalizeEducationItem) : [createEducationItem()],
    companies: Array.isArray(content.companies) ? content.companies : [],
    dates: Array.isArray(content.dates) ? content.dates : [],
  });

  const createEmptyPayload = () => ({
    title: "",
    source_type: "manual",
    content_json: {
      name: "",
      headline: "",
      summary: "",
      skills: [],
      contact_details: {
        email: "",
        phone: "",
        location: "",
        website: "",
        linkedin: "",
      },
      experience: [createExperienceItem()],
      education: [createEducationItem()],
      companies: [],
      dates: [],
    },
    is_draft: true,
  });

  const resumeToPayload = (resume) => ({
    title: resume?.title || "",
    source_type: resume?.source_type || "manual",
    content_json: normalizeResumeContent(resume?.content_json || {}),
    is_draft: resume?.is_draft ?? true,
  });

  const parseSkillsInput = (value) =>
    String(value || "")
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean);

  const prepareResumeDraftPayload = (payload) => ({
    ...payload,
    content_json: {
      ...payload.content_json,
      // These protected fields mirror the web client and give downstream AI checks
      // stable factual anchors without asking the user to maintain hidden metadata.
      companies: payload.content_json.experience.map((item) => item.company).filter(Boolean),
      dates: [
        ...payload.content_json.experience.flatMap((item) => [item.startDate, item.endDate || (item.isCurrent ? "Present" : "")]),
        ...payload.content_json.education.flatMap((item) => [item.startDate, item.endDate]),
      ].filter(Boolean),
    },
  });

  const validateManualResumePayload = (payload) => {
    const errors = {};
    const content = payload.content_json;
    const contacts = content.contact_details;
    const hasBodyContent =
      content.summary.trim() ||
      content.skills.length ||
      content.experience.some((item) => item.role || item.company || item.highlights) ||
      content.education.some((item) => item.school || item.degree || item.field);

    if (!payload.title.trim()) errors.title = "Add a resume title before saving.";
    if (!content.name.trim()) errors.name = "Add your full name.";
    if (!contacts.email.trim()) {
      errors.email = "Add an email address.";
    } else if (!h.isLikelyEmail(contacts.email.trim())) {
      errors.email = "Use a standard email format like name@example.com.";
    }
    if (contacts.website.trim() && !h.isLikelyLink(contacts.website.trim())) errors.website = "Use a complete website URL or domain.";
    if (contacts.linkedin.trim() && !h.isLikelyLink(contacts.linkedin.trim())) errors.linkedin = "Use your public LinkedIn URL or profile path.";
    if (!hasBodyContent) errors.body = "Add at least one content section: summary, skills, work history, or education.";

    const invalidExperienceDate = content.experience.find((item) => !h.isMonthYearLike(item.startDate) || (!item.isCurrent && !h.isMonthYearLike(item.endDate)));
    if (invalidExperienceDate) errors.experienceDates = "Fix work history dates before saving.";

    const invalidEducationDate = content.education.find((item) => !h.isMonthYearLike(item.startDate) || !h.isMonthYearLike(item.endDate));
    if (invalidEducationDate) errors.educationDates = "Fix education dates before saving.";

    return errors;
  };

  const getResumeFileError = (file) => {
    if (!file) return "";
    const fileName = file.name.toLowerCase();
    const isAllowed = UPLOAD_EXTENSIONS.some((extension) => fileName.endsWith(extension));
    return isAllowed ? "" : "Choose a PDF, DOC, DOCX, or TXT file.";
  };

  const EMPTY_JOB_FORM = {
    job_title: "",
    source_type: "manual",
    job_link: "",
    raw_text: "",
  };

  const getPreviewText = (value) => {
    const firstLine = String(value || "")
      .split("\n")
      .map((line) => line.trim())
      .find(Boolean);

    return firstLine ? h.truncate(firstLine, 88) : "No description preview yet";
  };

  const getHostnameLabel = (value) => {
    try {
      return new URL(value).hostname.replace(/^www\./i, "");
    } catch {
      return "External job post";
    }
  };

  const getTargetLabel = ({ job_title, source_type, job_link, raw_text }) => {
    if (job_title?.trim()) return h.truncate(job_title.trim(), 78);
    if (raw_text?.trim()) return getPreviewText(raw_text);
    if (source_type === "link" && job_link?.trim()) return `Job link from ${getHostnameLabel(job_link.trim())}`;
    return "No target drafted yet";
  };

  const normalizeRecentJob = (item) => ({
    id: item?.id || `job-${Date.now()}`,
    job_title: item?.job_title || "",
    source_type: item?.source_type || "manual",
    job_link: item?.job_link || "",
    raw_text: item?.raw_text || "",
    savedAt: item?.savedAt || item?.updated_at || item?.created_at || item?.saved_at || new Date().toISOString(),
    parse_status: item?.parse_status || "",
  });

  const stripePlans = [
    {
      id: "monthly",
      label: "Monthly",
      title: "Monthly access",
      price: "$19",
      cadence: "per month",
      summary: "Best if you want full access now and prefer a smaller recurring payment.",
      accent: "Most flexible",
      perks: ["Hosted Stripe checkout", "Fast activation after payment", "Good for short job-search cycles"],
    },
    {
      id: "yearly",
      label: "Yearly",
      title: "Yearly access",
      price: "$190",
      cadence: "per year",
      summary: "Best value for longer search cycles, repeat tailoring, and ongoing resume refreshes.",
      accent: "Best value",
      perks: ["Hosted Stripe checkout", "Lower effective monthly cost", "Ideal for sustained hiring cycles"],
    },
  ];

  const paymentMethods = [
    {
      id: "stripe",
      eyebrow: "Card",
      title: "Stripe",
      description: "Use a familiar hosted checkout for monthly or yearly access.",
      badge: "Recommended",
    },
    {
      id: "crypto",
      eyebrow: "Wallet",
      title: "Crypto",
      description: "Pay directly from a wallet with QR and copyable address details.",
      badge: "Direct pay",
    },
  ];

  const wizardSteps = [
    { id: 1, label: "Plan", title: "Choose a price plan" },
    { id: 2, label: "Method", title: "Choose a payment method" },
    { id: 3, label: "Pay", title: "Open the payment window" },
  ];

  const cryptoPreviewWallets = [
    {
      network: "USDT (ERC-20)",
      address: "0xFC4A23D5097FcC3eD5b5c50e1D3282C3895CeF3",
      qr_code_data_url: h.buildPreviewQrDataUrl("ERC20"),
    },
    {
      network: "USDT (TRC-20)",
      address: "TQ7hKx8DkcbWcQwNn6w8b8x7S1Qf1f8vP2",
      qr_code_data_url: h.buildPreviewQrDataUrl("TRC20"),
    },
  ];

  const api = {
    listResumes: async () => {
      const data = await window.desktopApi.get("/api/v1/resumes/items/");
      return data.items || [];
    },
    getResumeDetail: async (resumeId) => {
      const data = await window.desktopApi.get(`/api/v1/resumes/items/${resumeId}/`);
      return data.resume || data;
    },
    createResumeDraft: async (payload) => {
      const nextPayload = prepareResumeDraftPayload(payload);
      const data = await window.desktopApi.post("/api/v1/resumes/items/", nextPayload);
      return { data, nextPayload, resume: data.resume || data };
    },
    autosaveResumeDraft: async (resumeId, payload) => {
      const nextPayload = prepareResumeDraftPayload(payload);
      const data = await window.desktopApi.post(`/api/v1/resumes/items/${resumeId}/autosave/`, {
        content_json: nextPayload.content_json,
      });
      return { data, nextPayload, resume: data.resume || data };
    },
    updateResumeDraftMeta: async (resumeId, payload) => {
      const data = await window.desktopApi.patch(`/api/v1/resumes/items/${resumeId}/`, {
        title: payload.title,
        is_draft: payload.is_draft,
      });
      return data.resume || data;
    },
    parseResumeUpload: async (uploadId) => window.desktopApi.post(`/api/v1/resumes/uploads/${uploadId}/parse/`),
    applyParsedResumeUpload: async (uploadId, createVersion = true) =>
      window.desktopApi.post(`/api/v1/resumes/uploads/${uploadId}/apply-parsed/`, {
        create_version: createVersion,
      }),
    listJobDescriptions: async () => {
      const data = await window.desktopApi.get("/api/v1/jobs/descriptions/");
      return data.items || [];
    },
    createJobDescription: async (payload) => {
      const data = await window.desktopApi.post("/api/v1/jobs/descriptions/", payload);
      return data.job_description || data;
    },
    updateJobDescription: async (descriptionId, payload) => {
      const data = await window.desktopApi.patch(`/api/v1/jobs/descriptions/${descriptionId}/`, payload);
      return data.job_description || data;
    },
    deleteJobDescription: async (descriptionId) => window.desktopApi.delete(`/api/v1/jobs/descriptions/${descriptionId}/`),
    loadTrial: async () => window.desktopApi.get("/api/v1/billing/trial/me/"),
    startStripeCheckout: async (planType) => window.desktopApi.post("/api/billing/stripe/checkout-session/", { plan_type: planType }),
    loadCryptoPaymentInfo: async () => window.desktopApi.get("/api/billing/crypto/payment-info/"),
  };

  root.services = {
    api,
    constants: {
      cryptoPreviewWallets,
      MAX_RECENT_JOBS,
      paymentMethods,
      stripePlans,
      UPLOAD_ACCEPT,
      wizardSteps,
    },
    jobs: {
      EMPTY_JOB_FORM,
      getPreviewText,
      getTargetLabel,
      normalizeRecentJob,
    },
    resume: {
      createEducationItem,
      createEmptyPayload,
      createExperienceItem,
      getResumeFileError,
      normalizeResumeContent,
      parseSkillsInput,
      prepareResumeDraftPayload,
      resumeToPayload,
      validateManualResumePayload,
    },
  };
})();
