import { useMemo, useState } from "react";
import PageIntro from "../components/ui/PageIntro";
import Panel from "../components/ui/Panel";
import { getApiErrorMessage } from "../lib/apiError";
import { createResumeDraft, uploadResumeFile } from "../services/api/resumes";

const UPLOAD_ACCEPT = ".pdf,.doc,.docx,.txt";

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

const StatusIcon = ({ children, tone = "default" }) => {
  const tones = {
    default: "bg-slate-100 text-slate-700",
    success: "bg-teal-50 text-teal-700",
    soft: "bg-cyan-50 text-cyan-700",
    warm: "bg-amber-50 text-amber-700",
  };

  return (
    <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${tones[tone] || tones.default}`}>
      {children}
    </span>
  );
};

const ResumeStatusCard = ({ icon, label, note, value, isReady, tone }) => (
  <div className="rounded-[1.35rem] border border-white/80 bg-white/90 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
    <div className="flex items-start justify-between gap-3">
      <StatusIcon tone={tone}>{icon}</StatusIcon>
      <span
        className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
          isReady ? "bg-teal-50 text-teal-700" : "bg-slate-100 text-slate-500"
        }`}
      >
        {isReady ? "Ready" : "Pending"}
      </span>
    </div>
    <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">{label}</p>
    <p className="mt-1.5 text-sm font-semibold text-slate-900">{value}</p>
    <p className="mt-1.5 text-xs leading-6 text-slate-500">{note}</p>
  </div>
);

const AddActionButton = ({ label, onClick }) => (
  <button
    aria-label={label}
    className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition duration-200 hover:-translate-y-0.5 hover:border-teal-200 hover:bg-teal-50 hover:text-teal-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-100"
    onClick={onClick}
    title={label}
    type="button"
  >
    <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  </button>
);

const RemoveActionButton = ({ label, onClick }) => (
  <button
    aria-label={label}
    className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-transparent bg-white text-slate-400 transition duration-200 hover:-translate-y-0.5 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-100"
    onClick={onClick}
    title={label}
    type="button"
  >
    <svg aria-hidden="true" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M5 12h14" />
    </svg>
  </button>
);

const MoveActionButton = ({ direction, label, onClick, disabled = false }) => (
  <button
    aria-label={label}
    className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border bg-white transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200 ${
      disabled
        ? "cursor-not-allowed border-slate-100 text-slate-300"
        : "border-slate-200 text-slate-500 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
    }`}
    disabled={disabled}
    onClick={onClick}
    title={label}
    type="button"
  >
    <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      {direction === "up" ? <path d="m6 14 6-6 6 6" /> : <path d="m6 10 6 6 6-6" />}
    </svg>
  </button>
);

const FieldHint = ({ message, tone = "neutral" }) => {
  const tones = {
    neutral: "text-slate-500",
    warning: "text-amber-600",
  };

  return <p className={`mt-2 text-xs leading-5 ${tones[tone] || tones.neutral}`}>{message}</p>;
};

const SectionToggleButton = ({ isOpen, label, onClick }) => (
  <button
    aria-expanded={isOpen}
    aria-label={`${isOpen ? "Collapse" : "Expand"} ${label}`}
    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 transition duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
    onClick={onClick}
    type="button"
  >
    <span>{isOpen ? "Collapse" : "Expand"}</span>
    <svg
      aria-hidden="true"
      className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  </button>
);

const estimateExperienceWeight = (item) => {
  const bulletCount = item.highlights ? item.highlights.split("\n").filter(Boolean).length : 1;
  const hasLongCopy = item.highlights.length > 220 ? 1 : 0;
  return 5 + bulletCount * 2 + hasLongCopy;
};

const estimateEducationWeight = (item) => {
  const detailCount = [item.school, item.degree, item.field, item.startDate, item.endDate].filter(Boolean).length;
  return 3 + Math.ceil(detailCount / 2);
};

const parseSkillsInput = (value) =>
  value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);

const isLikelyEmail = (value) => /\S+@\S+\.\S+/.test(value);

const isLikelyLink = (value) => /^(https?:\/\/|www\.)/i.test(value) || /^[\w-]+\.[a-z]{2,}/i.test(value);

const isMonthYearLike = (value) => {
  if (!value.trim()) return true;
  return /^(?:[A-Za-z]{3,9}\s+\d{4}|\d{1,2}\/\d{4}|\d{4})$/.test(value.trim());
};

const ResumeEditorPage = () => {
  const [payload, setPayload] = useState({
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
  const [resumeId, setResumeId] = useState(null);
  const [status, setStatus] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [uploadStatus, setUploadStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [sectionVisibility, setSectionVisibility] = useState({
    profile: true,
    contact: true,
    summary: true,
    skills: true,
    experience: true,
    education: true,
  });
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState(() => JSON.stringify({
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
  }));

  const saveResume = async () => {
    setStatus("");
    setIsSaving(true);

    try {
      // Keep protected company/date fields alongside the editable sections for downstream AI safety rules.
      const { data, nextPayload } = await createResumeDraft(payload);
      setResumeId(data.id);
      setStatus("Draft saved successfully.");
      setPayload(nextPayload);
      setLastSavedSnapshot(JSON.stringify(nextPayload));
    } catch {
      setStatus("We couldn't save the draft right now.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadStatus("Choose a PDF, DOC, DOCX, or TXT file first.");
      return;
    }

    setUploadStatus("");
    setIsUploading(true);

    try {
      let nextResumeId = resumeId;
      const baseTitle = payload.title.trim() || selectedFile.name.replace(/\.[^.]+$/, "");

      if (!nextResumeId) {
        const uploadDraftPayload = {
          ...payload,
          title: baseTitle,
          source_type: "upload",
        };
        const { data, nextPayload } = await createResumeDraft(uploadDraftPayload);
        nextResumeId = data.id;
        setResumeId(data.id);
        setPayload(nextPayload);
        setLastSavedSnapshot(JSON.stringify(nextPayload));
      }

      await uploadResumeFile(nextResumeId, selectedFile);
      const uploadedPayload = {
        ...payload,
        title: payload.title || baseTitle,
        source_type: "upload",
      };
      setUploadedFileName(selectedFile.name);
      setPayload((current) => ({
        ...current,
        title: current.title || baseTitle,
        source_type: "upload",
      }));
      setLastSavedSnapshot(JSON.stringify(uploadedPayload));
      setUploadStatus("Resume file uploaded successfully.");
      setSelectedFile(null);
    } catch (error) {
      setUploadStatus(getApiErrorMessage(error, "Upload failed right now."));
    } finally {
      setIsUploading(false);
    }
  };

  const previewSkills = useMemo(
    () => payload.content_json.skills.filter((item) => item.trim().length > 0),
    [payload.content_json.skills],
  );

  const previewExperience = useMemo(
    () => payload.content_json.experience.filter((item) => item.role || item.company || item.highlights),
    [payload.content_json.experience],
  );

  const previewEducation = useMemo(
    () => payload.content_json.education.filter((item) => item.school || item.degree || item.field),
    [payload.content_json.education],
  );

  const previewContactItems = useMemo(
    () => Object.values(payload.content_json.contact_details).filter(Boolean),
    [payload.content_json.contact_details],
  );

  const previewContactLine = previewContactItems.join(" | ");

  const pageOneExperienceBudget = useMemo(() => {
    const summaryWeight = Math.ceil((payload.content_json.summary || "").length / 220);
    const skillsWeight = previewSkills.length ? Math.ceil(previewSkills.length / 5) : 1;
    return Math.max(8, 16 - summaryWeight - skillsWeight);
  }, [payload.content_json.summary, previewSkills]);

  const { pageOneExperience, pageTwoExperience } = useMemo(() => {
    let used = 0;
    const firstPage = [];
    const secondPage = [];

    previewExperience.forEach((item) => {
      const weight = estimateExperienceWeight(item);
      const canFitOnFirstPage = secondPage.length === 0 && used + weight <= pageOneExperienceBudget;

      if (canFitOnFirstPage) {
        firstPage.push(item);
        used += weight;
        return;
      }

      secondPage.push(item);
    });

    return { pageOneExperience: firstPage, pageTwoExperience: secondPage };
  }, [pageOneExperienceBudget, previewExperience]);

  const overflowPages = useMemo(() => {
    const pageBudget = 16;
    const pages = [];
    let currentPage = { experience: [], education: [] };
    let currentWeight = 0;

    const pushPage = () => {
      if (currentPage.experience.length || currentPage.education.length) {
        pages.push(currentPage);
      }
      currentPage = { experience: [], education: [] };
      currentWeight = 0;
    };

    pageTwoExperience.forEach((item) => {
      const weight = estimateExperienceWeight(item);

      if (currentWeight + weight > pageBudget && (currentPage.experience.length || currentPage.education.length)) {
        pushPage();
      }

      currentPage.experience.push(item);
      currentWeight += weight;
    });

    previewEducation.forEach((item) => {
      const weight = estimateEducationWeight(item);

      if (currentWeight + weight > pageBudget && (currentPage.experience.length || currentPage.education.length)) {
        pushPage();
      }

      currentPage.education.push(item);
      currentWeight += weight;
    });

    pushPage();
    return pages;
  }, [pageTwoExperience, previewEducation]);

  const experienceCount = payload.content_json.experience.filter((item) => item.role || item.company).length;
  const educationCount = payload.content_json.education.filter((item) => item.school || item.degree).length;
  const hasResumeTitle = Boolean(payload.title.trim());
  const hasProfile = Boolean(payload.content_json.name.trim() && payload.content_json.headline.trim());
  const hasContact = previewContactItems.length >= 2;
  const hasSummary = payload.content_json.summary.trim().length >= 40;
  const hasSkills = previewSkills.length > 0;
  const hasExperience = experienceCount > 0;
  const hasEducation = educationCount > 0;
  const completionSteps = [hasResumeTitle, hasProfile, hasContact, hasSummary, hasSkills, hasExperience, hasEducation];
  const completedSections = completionSteps.filter(Boolean).length;
  const completionPercent = Math.round((completedSections / completionSteps.length) * 100);
  const progressLabel =
    completionPercent === 100
      ? "Ready for the next step"
      : completionPercent >= 70
        ? `${completedSections} of ${completionSteps.length} core blocks are in place`
        : `Build out the essentials (${completedSections}/${completionSteps.length})`;

  const updateContentField = (field, value) => {
    setPayload((current) => ({
      ...current,
      content_json: { ...current.content_json, [field]: value },
    }));
  };

  const updateContactField = (field, value) => {
    setPayload((current) => ({
      ...current,
      content_json: {
        ...current.content_json,
        contact_details: {
          ...current.content_json.contact_details,
          [field]: value,
        },
      },
    }));
  };

  const updateCollectionItem = (field, index, key, value) => {
    setPayload((current) => ({
      ...current,
      content_json: {
        ...current.content_json,
        [field]: current.content_json[field].map((item, itemIndex) =>
          itemIndex === index ? { ...item, [key]: value } : item,
        ),
      },
    }));
  };

  const addCollectionItem = (field, factory) => {
    setPayload((current) => ({
      ...current,
      content_json: {
        ...current.content_json,
        [field]: [...current.content_json[field], factory()],
      },
    }));
  };

  const removeCollectionItem = (field, index) => {
    setPayload((current) => {
      const nextItems = current.content_json[field].filter((_, itemIndex) => itemIndex !== index);

      return {
        ...current,
        content_json: {
          ...current.content_json,
          [field]: nextItems.length ? nextItems : [field === "experience" ? createExperienceItem() : createEducationItem()],
        },
      };
    });
  };

  const moveCollectionItem = (field, index, direction) => {
    setPayload((current) => {
      const items = [...current.content_json[field]];
      const nextIndex = direction === "up" ? index - 1 : index + 1;

      if (nextIndex < 0 || nextIndex >= items.length) {
        return current;
      }

      [items[index], items[nextIndex]] = [items[nextIndex], items[index]];

      return {
        ...current,
        content_json: {
          ...current.content_json,
          [field]: items,
        },
      };
    });
  };

  const currentSnapshot = JSON.stringify(payload);
  const hasUnsavedChanges = currentSnapshot !== lastSavedSnapshot;
  const emailValue = payload.content_json.contact_details.email.trim();
  const websiteValue = payload.content_json.contact_details.website.trim();
  const linkedinValue = payload.content_json.contact_details.linkedin.trim();
  const contactWarnings = {
    email: emailValue && !isLikelyEmail(emailValue),
    website: websiteValue && !isLikelyLink(websiteValue),
    linkedin: linkedinValue && !isLikelyLink(linkedinValue),
  };
  const toggleSection = (section) => {
    setSectionVisibility((current) => ({
      ...current,
      [section]: !current[section],
    }));
  };

  return (
    <div className="space-y-6">
      <PageIntro
        badge={payload.source_type === "upload" ? "Upload attached" : "Manual entry"}
        description="The MVP now supports source resume upload as well as the existing manual builder. Upload stores the source file, while the manual form keeps the editable profile data clean and reviewable."
        eyebrow="Resume editor"
        title="Capture resume data with upload or guided manual entry."
      />

      <Panel>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">Upload</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">Attach an existing resume file</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500">
              MVP upload stores the source resume file for later parsing and review. Manual entry remains available below for direct editing.
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">PDF, DOC, DOCX, TXT</span>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_auto]">
          <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50/80 p-5">
            <label className="mb-2 block text-sm font-semibold text-slate-700">Source resume file</label>
            <input
              accept={UPLOAD_ACCEPT}
              className="rb-field file:mr-4 file:rounded-xl file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              type="file"
            />
            <p className="mt-2 text-sm text-slate-500">
              {uploadedFileName
                ? `Latest uploaded file: ${uploadedFileName}`
                : "Choose one source file if you want to keep the original resume on record before manual edits."}
            </p>
          </div>
          <button
            className="rb-btn-primary h-fit w-full justify-center lg:w-auto lg:min-w-48"
            disabled={isUploading}
            onClick={handleUpload}
            type="button"
          >
            {isUploading ? "Uploading..." : "Upload Resume"}
          </button>
        </div>

        {uploadStatus ? <p className="mt-4 text-sm font-medium text-slate-500">{uploadStatus}</p> : null}
      </Panel>

      <section className="space-y-6">
        <div className="rounded-[2rem] border border-white/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.95),rgba(240,253,250,0.8))] p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">Build progress</p>
                  <p className="mt-2 text-lg font-semibold tracking-tight text-slate-900">{progressLabel}</p>
                </div>
                <p className="text-2xl font-semibold tracking-tight text-slate-900">{completionPercent}%</p>
              </div>
              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#0f172a_0%,#0f766e_55%,#14b8a6_100%)] transition-all duration-300"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2 2xl:grid-cols-4">
            <ResumeStatusCard
              icon={
                <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Z" />
                  <path d="M4 20a8 8 0 0 1 16 0" />
                </svg>
              }
              isReady={hasProfile}
              label="Profile"
              note={hasProfile ? "Name and headline are set." : "Add your name and headline."}
              tone="soft"
              value={hasProfile ? "Identity is in place" : "Needs core details"}
            />
            <ResumeStatusCard
              icon={
                <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M4 7h16" />
                  <path d="M4 12h10" />
                  <path d="M4 17h8" />
                </svg>
              }
              isReady={hasSkills}
              label="Skills"
              note={hasSkills ? "Keywords will carry into the preview." : "Add the skills recruiters should scan for."}
              tone="success"
              value={hasSkills ? `${previewSkills.length} skills added` : "No skills yet"}
            />
            <ResumeStatusCard
              icon={
                <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M8 6h8" />
                  <path d="M6 10h12" />
                  <path d="M7 18h10" />
                  <path d="M9 2h6v4H9z" />
                </svg>
              }
              isReady={hasExperience}
              label="Work history"
              note={hasExperience ? "Roles are shaping the document." : "Add at least one role with bullets."}
              tone="default"
              value={hasExperience ? `${experienceCount} role${experienceCount === 1 ? "" : "s"} drafted` : "No roles yet"}
            />
            <ResumeStatusCard
              icon={
                <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M4 6 12 2l8 4-8 4-8-4Z" />
                  <path d="m4 10 8 4 8-4" />
                  <path d="m4 14 8 4 8-4" />
                </svg>
              }
              isReady={hasEducation}
              label="Education"
              note={hasEducation ? "Academic details are in place." : "Add school, degree, and dates."}
              tone="warm"
              value={hasEducation ? `${educationCount} education entr${educationCount === 1 ? "y" : "ies"}` : "No entries yet"}
            />
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(460px,1.08fr)] 2xl:grid-cols-[minmax(0,0.86fr)_minmax(560px,1.14fr)]">
          <div className="space-y-6">
            <section className="rounded-[2rem] border border-white/80 bg-white/90 p-8 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">Profile</p>
                  <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">Resume identity</h2>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">Top section</span>
                  <SectionToggleButton isOpen={sectionVisibility.profile} label="profile" onClick={() => toggleSection("profile")} />
                </div>
              </div>

              {sectionVisibility.profile ? (
                <>
                  <div className="mt-6 grid gap-5 lg:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">Resume title</label>
                      <input
                        className="rb-field"
                        placeholder="Senior Product Resume"
                        onChange={(e) => setPayload((current) => ({ ...current, title: e.target.value }))}
                        value={payload.title}
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">Full name</label>
                      <input
                        className="rb-field"
                        placeholder="Jordan Lee"
                        onChange={(e) => updateContentField("name", e.target.value)}
                        value={payload.content_json.name}
                      />
                    </div>
                  </div>

                  <div className="mt-5">
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Headline</label>
                    <input
                      className="rb-field"
                      placeholder="Product Manager focused on B2B workflow tools"
                      onChange={(e) => updateContentField("headline", e.target.value)}
                      value={payload.content_json.headline}
                    />
                  </div>
                </>
              ) : (
                <p className="mt-5 text-sm leading-7 text-slate-500">Keep your title, name, and headline together so the top of the resume stays crisp.</p>
              )}
            </section>

            <section className="rounded-[2rem] border border-white/80 bg-white/90 p-8 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">Contact</p>
                  <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">Personal details</h2>
                </div>
                <SectionToggleButton isOpen={sectionVisibility.contact} label="contact details" onClick={() => toggleSection("contact")} />
              </div>

              {sectionVisibility.contact ? (
                <>
                  <div className="mt-6 grid gap-5 lg:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">Email</label>
                      <input
                        className="rb-field"
                        onChange={(e) => updateContactField("email", e.target.value)}
                        placeholder="name@email.com"
                        value={payload.content_json.contact_details.email}
                      />
                      {contactWarnings.email ? <FieldHint message="Use a standard email format like name@example.com." tone="warning" /> : null}
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">Phone</label>
                      <input
                        className="rb-field"
                        onChange={(e) => updateContactField("phone", e.target.value)}
                        placeholder="+1 555 123 4567"
                        value={payload.content_json.contact_details.phone}
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">Location</label>
                      <input
                        className="rb-field"
                        onChange={(e) => updateContactField("location", e.target.value)}
                        placeholder="San Francisco, CA"
                        value={payload.content_json.contact_details.location}
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">Website</label>
                      <input
                        className="rb-field"
                        onChange={(e) => updateContactField("website", e.target.value)}
                        placeholder="portfolio.com"
                        value={payload.content_json.contact_details.website}
                      />
                      {contactWarnings.website ? <FieldHint message="A portfolio link works best with a domain or full URL." tone="warning" /> : null}
                    </div>
                  </div>

                  <div className="mt-5">
                    <label className="mb-2 block text-sm font-semibold text-slate-700">LinkedIn</label>
                    <input
                      className="rb-field"
                      onChange={(e) => updateContactField("linkedin", e.target.value)}
                      placeholder="linkedin.com/in/your-name"
                      value={payload.content_json.contact_details.linkedin}
                    />
                    {contactWarnings.linkedin ? <FieldHint message="Use your public LinkedIn URL or profile path." tone="warning" /> : null}
                  </div>
                </>
              ) : (
                <p className="mt-5 text-sm leading-7 text-slate-500">Keep the essentials here so someone can contact you without scanning the whole page.</p>
              )}
            </section>

            <section className="rounded-[2rem] border border-white/80 bg-white/90 p-8 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">Summary</p>
                  <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">Professional summary</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-500">
                    Keep this as the short narrative recruiters should understand before they read your experience.
                  </p>
                </div>
                <SectionToggleButton isOpen={sectionVisibility.summary} label="summary" onClick={() => toggleSection("summary")} />
              </div>

              {sectionVisibility.summary ? (
                <textarea
                  className="rb-field mt-6 min-h-52"
                  onChange={(e) => updateContentField("summary", e.target.value)}
                  placeholder="Describe your focus, years of experience, strengths, and the kind of roles you are targeting."
                  value={payload.content_json.summary}
                />
              ) : (
                <p className="mt-5 text-sm leading-7 text-slate-500">A strong summary quickly frames who you are and what kind of role this resume is for.</p>
              )}
            </section>

            <section className="rounded-[2rem] border border-white/80 bg-white/90 p-8 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">Skills</p>
                  <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">Keywords and strengths</h2>
                </div>
                <SectionToggleButton isOpen={sectionVisibility.skills} label="skills" onClick={() => toggleSection("skills")} />
              </div>

              {sectionVisibility.skills ? (
                <>
                  <textarea
                    className="rb-field mt-6 min-h-40"
                    onChange={(e) => updateContentField("skills", parseSkillsInput(e.target.value))}
                    placeholder={"Product strategy\nStakeholder management\nSQL\nRoadmap planning"}
                    value={payload.content_json.skills.join("\n")}
                  />
                  <p className="mt-2 text-sm text-slate-500">Use one skill per line, or separate items with commas. They will appear as grouped keywords in the preview.</p>
                </>
              ) : (
                <p className="mt-5 text-sm leading-7 text-slate-500">This section works best as a clean list of tools, platforms, and strengths recruiters can scan quickly.</p>
              )}
            </section>

            <section className="rounded-[2rem] border border-white/80 bg-white/90 p-8 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">Experience</p>
                  <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">Work history</h2>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">
                    Focus on the exact details that belong on a resume page: title, employer, work setup, dates, and concise impact bullets.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <AddActionButton label="Add role" onClick={() => addCollectionItem("experience", createExperienceItem)} />
                  <SectionToggleButton isOpen={sectionVisibility.experience} label="work history" onClick={() => toggleSection("experience")} />
                </div>
              </div>

              {sectionVisibility.experience ? (
                <div className="mt-6 space-y-5">
                  {payload.content_json.experience.map((item, index) => (
                    <div className="rounded-[1.7rem] border border-slate-200 bg-slate-50/70 p-5" key={`experience-${index}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">Experience {index + 1}</p>
                          <p className="mt-1 text-sm text-slate-500">Add role details and achievement-focused highlights.</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <MoveActionButton
                            direction="up"
                            disabled={index === 0}
                            label={`Move experience ${index + 1} up`}
                            onClick={() => moveCollectionItem("experience", index, "up")}
                          />
                          <MoveActionButton
                            direction="down"
                            disabled={index === payload.content_json.experience.length - 1}
                            label={`Move experience ${index + 1} down`}
                            onClick={() => moveCollectionItem("experience", index, "down")}
                          />
                          <RemoveActionButton label={`Remove experience ${index + 1}`} onClick={() => removeCollectionItem("experience", index)} />
                        </div>
                      </div>

                      <div className="mt-5 grid gap-4 lg:grid-cols-3">
                        <input
                          className="rb-field"
                          onChange={(e) => updateCollectionItem("experience", index, "role", e.target.value)}
                          placeholder="Role title"
                          value={item.role}
                        />
                        <input
                          className="rb-field"
                          onChange={(e) => updateCollectionItem("experience", index, "company", e.target.value)}
                          placeholder="Company name"
                          value={item.company}
                        />
                        <input
                          className="rb-field"
                          onChange={(e) => updateCollectionItem("experience", index, "employmentType", e.target.value)}
                          placeholder="Employment type"
                          value={item.employmentType}
                        />
                        <input
                          className="rb-field lg:col-span-1"
                          onChange={(e) => updateCollectionItem("experience", index, "location", e.target.value)}
                          placeholder="City, region, or remote"
                          value={item.location}
                        />
                        <input
                          className="rb-field"
                          onChange={(e) => updateCollectionItem("experience", index, "startDate", e.target.value)}
                          placeholder="Start month / year"
                          value={item.startDate}
                        />
                        <input
                          className="rb-field"
                          disabled={item.isCurrent}
                          onChange={(e) => updateCollectionItem("experience", index, "endDate", e.target.value)}
                          placeholder={item.isCurrent ? "Present" : "End month / year"}
                          value={item.isCurrent ? "" : item.endDate}
                        />
                        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 lg:col-span-3">
                          <input
                            checked={item.isCurrent}
                            className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                            onChange={(e) => updateCollectionItem("experience", index, "isCurrent", e.target.checked)}
                            type="checkbox"
                          />
                          <span className="text-sm font-medium text-slate-700">This is my current role</span>
                        </div>
                      </div>
                      {!isMonthYearLike(item.startDate) ? <FieldHint message="Use Jan 2024, 01/2024, or just 2024." tone="warning" /> : null}
                      {!item.isCurrent && !isMonthYearLike(item.endDate) ? <FieldHint message="End date works best as Jan 2025, 01/2025, or 2025." tone="warning" /> : null}

                      <textarea
                        className="rb-field mt-4 min-h-36"
                        onChange={(e) => updateCollectionItem("experience", index, "highlights", e.target.value)}
                        placeholder="Write one achievement per line. Focus on ownership, scope, measurable results, and tools when relevant."
                        value={item.highlights}
                      />
                      <p className="mt-3 text-sm text-slate-500">Tip: one line per bullet gives the preview a cleaner PDF-style resume layout.</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-5 text-sm leading-7 text-slate-500">Keep recent roles first and make each entry easy to skim for ownership, scope, and measurable impact.</p>
              )}
            </section>

            <section className="rounded-[2rem] border border-white/80 bg-white/90 p-8 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">Education</p>
                  <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">Academic background</h2>
                </div>
                <div className="flex items-center gap-3">
                  <AddActionButton label="Add school" onClick={() => addCollectionItem("education", createEducationItem)} />
                  <SectionToggleButton isOpen={sectionVisibility.education} label="education" onClick={() => toggleSection("education")} />
                </div>
              </div>

              {sectionVisibility.education ? (
                <div className="mt-6 space-y-5">
                  {payload.content_json.education.map((item, index) => (
                    <div className="rounded-[1.7rem] border border-slate-200 bg-slate-50/70 p-5" key={`education-${index}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">Education {index + 1}</p>
                          <p className="mt-1 text-sm text-slate-500">School, degree, field, and dates.</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <MoveActionButton
                            direction="up"
                            disabled={index === 0}
                            label={`Move education ${index + 1} up`}
                            onClick={() => moveCollectionItem("education", index, "up")}
                          />
                          <MoveActionButton
                            direction="down"
                            disabled={index === payload.content_json.education.length - 1}
                            label={`Move education ${index + 1} down`}
                            onClick={() => moveCollectionItem("education", index, "down")}
                          />
                          <RemoveActionButton label={`Remove education ${index + 1}`} onClick={() => removeCollectionItem("education", index)} />
                        </div>
                      </div>

                      <div className="mt-5 grid gap-4 lg:grid-cols-2">
                        <input
                          className="rb-field"
                          onChange={(e) => updateCollectionItem("education", index, "school", e.target.value)}
                          placeholder="School"
                          value={item.school}
                        />
                        <input
                          className="rb-field"
                          onChange={(e) => updateCollectionItem("education", index, "degree", e.target.value)}
                          placeholder="Degree"
                          value={item.degree}
                        />
                        <input
                          className="rb-field"
                          onChange={(e) => updateCollectionItem("education", index, "field", e.target.value)}
                          placeholder="Field of study"
                          value={item.field}
                        />
                        <input
                          className="rb-field"
                          onChange={(e) => updateCollectionItem("education", index, "startDate", e.target.value)}
                          placeholder="Start date"
                          value={item.startDate}
                        />
                        <input
                          className="rb-field lg:col-span-2"
                          onChange={(e) => updateCollectionItem("education", index, "endDate", e.target.value)}
                          placeholder="End date"
                          value={item.endDate}
                        />
                      </div>
                      {!isMonthYearLike(item.startDate) ? <FieldHint message="Use Jan 2021, 01/2021, or 2021 for education dates." tone="warning" /> : null}
                      {!isMonthYearLike(item.endDate) ? <FieldHint message="Keep the end date in the same month/year style for consistency." tone="warning" /> : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-5 text-sm leading-7 text-slate-500">Include the degrees or programs that actually strengthen the story this resume should tell.</p>
              )}
            </section>

            <section className="rounded-[2rem] border border-white/80 bg-white/90 p-8 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-3">
                  <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    {resumeId ? `Saved resume #${resumeId}` : "This draft has not been saved yet."}
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 ring-1 ring-slate-200">
                    <span className={`inline-flex h-2.5 w-2.5 rounded-full ${hasUnsavedChanges ? "bg-amber-500" : "bg-teal-500"}`} />
                    {hasUnsavedChanges ? "Unsaved changes" : "All changes saved"}
                  </div>
                </div>
                <button
                  className="rb-btn-primary w-full justify-center sm:w-auto sm:min-w-52"
                  disabled={isSaving}
                  onClick={saveResume}
                  type="button"
                >
                  {isSaving ? "Saving..." : "Save Draft"}
                </button>
              </div>

              {status ? <p className="mt-4 text-sm font-medium text-slate-500">{status}</p> : null}
            </section>
          </div>

          <div className="self-start rounded-[2rem] border border-slate-200 bg-[#eef1f4] p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Document preview</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
                  {payload.title || "Untitled resume draft"}
                </h2>
              </div>
              <span className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-600">PDF view</span>
            </div>

            <div className="mt-6 rounded-none border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-600">
              Source type: <span className="font-semibold text-slate-900">{payload.source_type}</span>
              {uploadedFileName ? <span className="ml-2 text-slate-500">- {uploadedFileName}</span> : null}
            </div>

            <div className="mt-8 space-y-8">
              <div>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Page 1</p>
                <div className="rb-resume-page mx-auto rounded-none">
                  <div className="flex items-start justify-between gap-8 border-b border-slate-300 pb-6">
                    <div className="min-w-0 flex-1">
                      <p className="rb-resume-name">
                        {payload.content_json.name || "Your full name"}
                      </p>
                      <p className="rb-resume-roleline mt-3">
                        {payload.content_json.headline || "Your headline will appear here"}
                      </p>
                    </div>
                    <div className="min-w-[220px] text-right">
                      {previewContactItems.length ? (
                        previewContactItems.map((item) => (
                          <p className="rb-resume-contact" key={item}>
                            {item}
                          </p>
                        ))
                      ) : (
                        <p className="rb-resume-contact">Email, phone, location, and links will appear here.</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-8 space-y-8">
                    <section>
                      <p className="rb-resume-section-title">Professional Summary</p>
                      <p className="rb-resume-body mt-4">
                        {payload.content_json.summary || "Add a short summary so the top of the resume immediately explains your focus."}
                      </p>
                    </section>

                    <section>
                      <p className="rb-resume-section-title">Core Skills</p>
                      <p className="rb-resume-body mt-4">
                        {previewSkills.length ? previewSkills.join(" | ") : "Add skills to shape the keyword line recruiters will scan first."}
                      </p>
                    </section>

                    <section>
                      <p className="rb-resume-section-title">Professional Experience</p>
                      <div className="mt-5 space-y-6">
                        {pageOneExperience.length ? (
                          pageOneExperience.map((item, index) => (
                            <div key={`preview-page-one-experience-${index}`}>
                              <div className="flex items-start justify-between gap-6">
                                <div>
                                  <p className="rb-resume-item-title">{item.role || "Role title"}</p>
                                  <p className="rb-resume-item-meta mt-1">
                                    {[item.company, item.location, item.employmentType].filter(Boolean).join(" | ") || "Company | Location"}
                                  </p>
                                </div>
                                <p className="rb-resume-item-date text-right">
                                  {item.startDate || "Start"} - {item.isCurrent ? "Present" : item.endDate || "End"}
                                </p>
                              </div>
                              <div className="rb-resume-body mt-4 space-y-2">
                                {item.highlights ? (
                                  item.highlights
                                    .split("\n")
                                    .filter(Boolean)
                                    .map((line, lineIndex) => (
                                      <p key={`${line}-${lineIndex}`} className="pl-4 -indent-4">
                                        - {line}
                                      </p>
                                    ))
                                ) : (
                                  <p className="text-slate-500">Add impact-focused highlights for this role.</p>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-[14px] leading-7 text-slate-500">Add at least one role to start shaping the main body of the resume.</p>
                        )}
                      </div>
                    </section>
                  </div>
                </div>
              </div>

              {overflowPages.length ? (
                overflowPages.map((page, pageIndex) => (
                  <div key={`overflow-page-${pageIndex}`}>
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Page {pageIndex + 2}</p>
                    <div className="rb-resume-page mx-auto rounded-none">
                      <div className="space-y-8">
                        {page.experience.length ? (
                          <section>
                            <p className="rb-resume-section-title">Additional Experience</p>
                            <div className="mt-5 space-y-6">
                              {page.experience.map((item, index) => (
                                <div key={`preview-page-${pageIndex + 2}-experience-${index}`}>
                                  <div className="flex items-start justify-between gap-6">
                                    <div>
                                      <p className="rb-resume-item-title">{item.role || "Role title"}</p>
                                      <p className="rb-resume-item-meta mt-1">
                                        {[item.company, item.location, item.employmentType].filter(Boolean).join(" | ") || "Company | Location"}
                                      </p>
                                    </div>
                                    <p className="rb-resume-item-date text-right">
                                      {item.startDate || "Start"} - {item.isCurrent ? "Present" : item.endDate || "End"}
                                    </p>
                                  </div>
                                  <div className="rb-resume-body mt-4 space-y-2">
                                    {item.highlights ? (
                                      item.highlights
                                        .split("\n")
                                        .filter(Boolean)
                                        .map((line, lineIndex) => (
                                          <p key={`${line}-${lineIndex}`} className="pl-4 -indent-4">
                                            - {line}
                                          </p>
                                        ))
                                    ) : (
                                      <p className="text-slate-500">Add impact-focused highlights for this role.</p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </section>
                        ) : null}

                        {page.education.length ? (
                          <section>
                            <p className="rb-resume-section-title">Education</p>
                            <div className="mt-5 space-y-5">
                              {page.education.map((item, index) => (
                                <div key={`preview-page-${pageIndex + 2}-education-${index}`}>
                                  <div className="flex items-start justify-between gap-6">
                                    <div>
                                      <p className="rb-resume-item-title">
                                        {[item.degree, item.field].filter(Boolean).join(", ") || "Degree details"}
                                      </p>
                                      <p className="rb-resume-item-meta mt-1">{item.school || "School name"}</p>
                                    </div>
                                    <p className="rb-resume-item-date text-right">
                                      {item.startDate || "Start"} - {item.endDate || "End"}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </section>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))
              ) : previewEducation.length ? (
                <div>
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Page 2</p>
                  <div className="rb-resume-page mx-auto rounded-none">
                    <section>
                      <p className="rb-resume-section-title">Education</p>
                      <div className="mt-5 space-y-5">
                        {previewEducation.map((item, index) => (
                          <div key={`preview-education-${index}`}>
                            <div className="flex items-start justify-between gap-6">
                              <div>
                                <p className="rb-resume-item-title">{[item.degree, item.field].filter(Boolean).join(", ") || "Degree details"}</p>
                                <p className="rb-resume-item-meta mt-1">{item.school || "School name"}</p>
                              </div>
                              <p className="rb-resume-item-date text-right">
                                {item.startDate || "Start"} - {item.endDate || "End"}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ResumeEditorPage;
