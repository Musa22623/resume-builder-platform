import { useEffect, useMemo, useRef, useState } from "react";
import Panel from "../components/ui/Panel";
import PageTitleBar from "../components/ui/PageTitleBar";
import { getApiErrorMessage } from "../lib/apiError";
import {
  autosaveResumeDraft,
  createResumeDraft,
  getResumeDetail,
  listResumes,
  parseResumeUpload,
  updateResumeDraftMeta,
  uploadResumeFile,
} from "../services/api/resumes";

const UPLOAD_ACCEPT = ".pdf,.doc,.docx,.txt";
const UPLOAD_EXTENSIONS = UPLOAD_ACCEPT.split(",");
const uploadInputId = "resume-upload-input";

const formatFileSize = (size) => {
  if (!size) return "0 KB";
  if (size < 1024 * 1024) return `${Math.ceil(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const getResumeFileError = (file) => {
  if (!file) return "";

  const fileName = file.name.toLowerCase();
  const isAllowed = UPLOAD_EXTENSIONS.some((extension) => fileName.endsWith(extension));

  return isAllowed ? "" : "Choose a PDF, DOC, DOCX, or TXT file.";
};

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
  skills: Array.isArray(content.skills)
    ? content.skills.map((item) => (typeof item === "string" ? item : item?.name)).filter(Boolean)
    : [],
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
    error: "text-rose-600",
    neutral: "text-slate-500",
    warning: "text-amber-600",
  };

  return <p className={`mt-2 text-xs leading-5 ${tones[tone] || tones.neutral}`}>{message}</p>;
};

const SectionToggleButton = ({ isOpen, label, onClick }) => (
  <button
    aria-expanded={isOpen}
    aria-label={`${isOpen ? "Collapse" : "Expand"} ${label}`}
    className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
    onClick={onClick}
    title={`${isOpen ? "Collapse" : "Expand"} ${label}`}
    type="button"
  >
    <svg
      aria-hidden="true"
      className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
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
  } else if (!isLikelyEmail(contacts.email.trim())) {
    errors.email = "Use a standard email format like name@example.com.";
  }
  if (contacts.website.trim() && !isLikelyLink(contacts.website.trim())) {
    errors.website = "Use a complete website URL or domain.";
  }
  if (contacts.linkedin.trim() && !isLikelyLink(contacts.linkedin.trim())) {
    errors.linkedin = "Use your public LinkedIn URL or profile path.";
  }
  if (!hasBodyContent) {
    errors.body = "Add at least one content section: summary, skills, work history, or education.";
  }

  const invalidExperienceDate = content.experience.find(
    (item) => !isMonthYearLike(item.startDate) || (!item.isCurrent && !isMonthYearLike(item.endDate)),
  );
  if (invalidExperienceDate) {
    errors.experienceDates = "Fix work history dates before saving.";
  }

  const invalidEducationDate = content.education.find((item) => !isMonthYearLike(item.startDate) || !isMonthYearLike(item.endDate));
  if (invalidEducationDate) {
    errors.educationDates = "Fix education dates before saving.";
  }

  return errors;
};

const ResumeEditorPage = () => {
  const fileInputRef = useRef(null);
  const [payload, setPayload] = useState(createEmptyPayload);
  const [resumeId, setResumeId] = useState(null);
  const [status, setStatus] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [uploadStatus, setUploadStatus] = useState("");
  const [parseStatus, setParseStatus] = useState("");
  const [loadStatus, setLoadStatus] = useState("");
  const [validationErrors, setValidationErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingDraft, setIsLoadingDraft] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isDraggingUpload, setIsDraggingUpload] = useState(false);
  const [sectionVisibility, setSectionVisibility] = useState({
    profile: true,
    contact: true,
    summary: true,
    skills: true,
    experience: true,
    education: true,
  });
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState(() => JSON.stringify(createEmptyPayload()));

  const setUploadFile = (file) => {
    if (!file) return;

    const fileError = getResumeFileError(file);
    if (fileError) {
      setSelectedFile(null);
      setParseStatus("");
      setUploadStatus(fileError);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    setSelectedFile(file);
    setParseStatus("");
    setUploadStatus(`${file.name} is ready to upload.`);
  };

  const handleFileInputChange = (e) => {
    setUploadFile(e.target.files?.[0] || null);
  };

  const handleUploadDragOver = (e) => {
    e.preventDefault();
    setIsDraggingUpload(true);
  };

  const handleUploadDragLeave = (e) => {
    e.preventDefault();
    const nextTarget = e.relatedTarget;
    if (nextTarget instanceof Node && e.currentTarget.contains(nextTarget)) return;
    setIsDraggingUpload(false);
  };

  const handleUploadDrop = (e) => {
    e.preventDefault();
    setIsDraggingUpload(false);
    setUploadFile(e.dataTransfer.files?.[0] || null);
  };

  useEffect(() => {
    let isMounted = true;

    const loadStoredDraft = async () => {
      setIsLoadingDraft(true);
      setLoadStatus("Checking for a saved draft...");

      try {
        const resumes = await listResumes();
        const draft = resumes.find((item) => item.is_draft) || resumes[0];

        if (!draft) {
          if (isMounted) {
            setLoadStatus("No saved draft found.");
          }
          return;
        }

        const detail = await getResumeDetail(draft.id);
        const nextPayload = resumeToPayload(detail);

        if (isMounted) {
          setResumeId(detail.id);
          setPayload(nextPayload);
          setLastSavedSnapshot(JSON.stringify(nextPayload));
          setLoadStatus(`Loaded saved draft #${detail.id}.`);
        }
      } catch (error) {
        if (isMounted) {
          setLoadStatus(getApiErrorMessage(error, "We couldn't load your saved draft right now."));
        }
      } finally {
        if (isMounted) {
          setIsLoadingDraft(false);
        }
      }
    };

    loadStoredDraft();

    return () => {
      isMounted = false;
    };
  }, []);

  const saveResume = async () => {
    setStatus("");
    const nextValidationErrors = validateManualResumePayload(payload);
    setValidationErrors(nextValidationErrors);

    if (Object.keys(nextValidationErrors).length) {
      setStatus("Please fix the highlighted fields before saving.");
      return;
    }

    setIsSaving(true);

    try {
      // Keep protected company/date fields alongside the editable sections for downstream AI safety rules.
      if (resumeId) {
        const { data, nextPayload } = await autosaveResumeDraft(resumeId, payload);
        const savedResume = data.resume || data;
        const updatedResume = await updateResumeDraftMeta(resumeId, nextPayload);
        const savedPayload = {
          ...nextPayload,
          title: updatedResume?.title || savedResume?.title || nextPayload.title,
          source_type: updatedResume?.source_type || savedResume?.source_type || nextPayload.source_type,
          is_draft: updatedResume?.is_draft ?? savedResume?.is_draft ?? nextPayload.is_draft,
        };
        setPayload(savedPayload);
        setLastSavedSnapshot(JSON.stringify(savedPayload));
        setStatus("Draft updated successfully.");
        setValidationErrors({});
      } else {
        const { data, nextPayload } = await createResumeDraft(payload);
        const savedResume = data.resume || data;
        const savedPayload = resumeToPayload(savedResume?.id ? savedResume : nextPayload);
        setResumeId(savedResume.id);
        setStatus("Draft saved successfully.");
        setPayload(savedPayload);
        setLastSavedSnapshot(JSON.stringify(savedPayload));
        setValidationErrors({});
      }
    } catch (error) {
      setStatus(getApiErrorMessage(error, "We couldn't save the draft right now."));
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
    setParseStatus("");
    setIsUploading(true);

    try {
      let nextResumeId = resumeId;
      let workingPayload = payload;
      const baseTitle = payload.title.trim() || selectedFile.name.replace(/\.[^.]+$/, "");

      if (!nextResumeId) {
        const uploadDraftPayload = {
          ...payload,
          title: baseTitle,
          source_type: "upload",
        };
        const { data, nextPayload } = await createResumeDraft(uploadDraftPayload);
        const savedResume = data.resume || data;
        nextResumeId = savedResume.id;
        workingPayload = nextPayload;
        setResumeId(nextResumeId);
      }

      const uploadData = await uploadResumeFile(nextResumeId, selectedFile);
      const uploadedRecord = uploadData.upload || uploadData;
      const uploadId = uploadedRecord?.id;
      const uploadedPayload = {
        ...workingPayload,
        title: workingPayload.title || baseTitle,
        source_type: "upload",
      };
      setUploadedFileName(selectedFile.name);
      setPayload(uploadedPayload);
      setLastSavedSnapshot(JSON.stringify(uploadedPayload));
      setUploadStatus(
        uploadedRecord?.id
          ? `Resume file uploaded successfully. Upload #${uploadedRecord.id} is ready for parsing.`
          : "Resume file uploaded successfully.",
      );
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      if (uploadId) {
        setIsParsing(true);
        setParseStatus("Parsing uploaded resume...");

        try {
          const parseData = await parseResumeUpload(uploadId);
          const parsedRecord = parseData.upload || parseData;
          const parsedContent = parsedRecord?.parsed_content_json;

          if (parsedContent) {
            const parsedPayload = {
              ...uploadedPayload,
              content_json: normalizeResumeContent(parsedContent),
              source_type: "upload",
            };
            setPayload(parsedPayload);
            setParseStatus("Parsed content filled the manual fields. Review it, then save the draft.");
          } else {
            setParseStatus("Uploaded and parsed, but no structured resume content was returned.");
          }
        } catch (parseError) {
          setParseStatus(getApiErrorMessage(parseError, "Uploaded, but parsing failed right now."));
        } finally {
          setIsParsing(false);
        }
      }
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
    setValidationErrors((current) => ({ ...current, [field]: "", body: "" }));
    setPayload((current) => ({
      ...current,
      content_json: { ...current.content_json, [field]: value },
    }));
  };

  const updateContactField = (field, value) => {
    setValidationErrors((current) => ({ ...current, [field]: "" }));
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
    setValidationErrors((current) => ({
      ...current,
      body: "",
      experienceDates: field === "experience" ? "" : current.experienceDates,
      educationDates: field === "education" ? "" : current.educationDates,
    }));
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
    setValidationErrors((current) => ({ ...current, body: "" }));
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
      <PageTitleBar title="Resume Editor" />
      {loadStatus ? (
        <p className={`rounded-2xl px-4 py-3 text-sm font-medium ${isLoadingDraft ? "bg-slate-100 text-slate-600" : "bg-teal-50 text-teal-800"}`}>
          {loadStatus}
        </p>
      ) : null}
      <Panel className="p-3 sm:p-3.5">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-teal-700">Upload</p>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">PDF, DOC, DOCX, TXT</span>
            </div>
            <p className="mt-1 text-xs leading-5 text-slate-500">Select or drop one resume file, then upload it for parsing.</p>
          </div>

          <button
            className="rb-btn-primary w-full justify-center px-4 py-2.5 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70 lg:w-auto lg:min-w-36"
            disabled={isLoadingDraft || isUploading || !selectedFile}
            onClick={handleUpload}
            type="button"
          >
            {isUploading ? "Uploading..." : "Upload Resume"}
          </button>
        </div>

        <label
          className={`mt-3 flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-[1.2rem] border border-dashed px-3 py-2 text-left transition duration-200 ${
            isDraggingUpload
              ? "border-teal-400 bg-teal-50 shadow-[0_18px_45px_rgba(20,184,166,0.14)]"
              : "border-slate-300 bg-slate-50/80 hover:border-teal-300 hover:bg-teal-50/60"
          }`}
          htmlFor={uploadInputId}
          onDragLeave={handleUploadDragLeave}
          onDragOver={handleUploadDragOver}
          onDrop={handleUploadDrop}
        >
          <input
            accept={UPLOAD_ACCEPT}
            className="sr-only"
            id={uploadInputId}
            onChange={handleFileInputChange}
            ref={fileInputRef}
            type="file"
          />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-slate-900">
              {selectedFile ? selectedFile.name : "Drag and drop your resume file"}
            </span>
            <span className="mt-0.5 block truncate text-xs leading-5 text-slate-500">
              {selectedFile ? `${formatFileSize(selectedFile.size)} selected` : "or choose a file from your computer"}
            </span>
          </span>
          <span className="shrink-0 rounded-xl bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 shadow-sm ring-1 ring-slate-200">
            Select file
          </span>
        </label>

        <div className="mt-2 flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-slate-500">
            {uploadedFileName ? `Latest uploaded file: ${uploadedFileName}` : "No source file uploaded yet."}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {uploadStatus ? <p className="text-sm font-medium text-slate-600">{uploadStatus}</p> : null}
            {isParsing || parseStatus ? <p className="text-sm font-medium text-slate-600">{parseStatus}</p> : null}
          </div>
        </div>
      </Panel>

      <section className="space-y-6">
        <div className="rounded-[1.7rem] border border-white/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.95),rgba(240,253,250,0.8))] p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-teal-700">Build progress</p>
                  <p className="mt-1 text-base font-semibold tracking-tight text-slate-900">{progressLabel}</p>
                </div>
                <p className="text-xl font-semibold tracking-tight text-slate-900">{completionPercent}%</p>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#0f172a_0%,#0f766e_55%,#14b8a6_100%)] transition-all duration-300"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2 xl:justify-end">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${hasProfile ? "bg-teal-50 text-teal-700" : "bg-slate-100 text-slate-500"}`}>
                Profile
              </span>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${hasSkills ? "bg-teal-50 text-teal-700" : "bg-slate-100 text-slate-500"}`}>
                Skills
              </span>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${hasExperience ? "bg-teal-50 text-teal-700" : "bg-slate-100 text-slate-500"}`}>
                Work history
              </span>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${hasEducation ? "bg-teal-50 text-teal-700" : "bg-slate-100 text-slate-500"}`}>
                Education
              </span>
            </div>
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
                        onChange={(e) => {
                          setValidationErrors((current) => ({ ...current, title: "" }));
                          setPayload((current) => ({ ...current, title: e.target.value }));
                        }}
                        value={payload.title}
                      />
                      {validationErrors.title ? <FieldHint message={validationErrors.title} tone="error" /> : null}
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">Full name</label>
                      <input
                        className="rb-field"
                        placeholder="Jordan Lee"
                        onChange={(e) => updateContentField("name", e.target.value)}
                        value={payload.content_json.name}
                      />
                      {validationErrors.name ? <FieldHint message={validationErrors.name} tone="error" /> : null}
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
                      {validationErrors.email ? (
                        <FieldHint message={validationErrors.email} tone="error" />
                      ) : contactWarnings.email ? (
                        <FieldHint message="Use a standard email format like name@example.com." tone="warning" />
                      ) : null}
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
                      {validationErrors.website ? (
                        <FieldHint message={validationErrors.website} tone="error" />
                      ) : contactWarnings.website ? (
                        <FieldHint message="A portfolio link works best with a domain or full URL." tone="warning" />
                      ) : null}
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
                    {validationErrors.linkedin ? (
                      <FieldHint message={validationErrors.linkedin} tone="error" />
                    ) : contactWarnings.linkedin ? (
                      <FieldHint message="Use your public LinkedIn URL or profile path." tone="warning" />
                    ) : null}
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
              {sectionVisibility.summary && validationErrors.body ? <FieldHint message={validationErrors.body} tone="error" /> : null}
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
                  {validationErrors.body ? <FieldHint message={validationErrors.body} tone="error" /> : null}
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
                      {index === 0 && validationErrors.experienceDates ? <FieldHint message={validationErrors.experienceDates} tone="error" /> : null}
                      {index === 0 && validationErrors.body ? <FieldHint message={validationErrors.body} tone="error" /> : null}

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
                      {index === 0 && validationErrors.educationDates ? <FieldHint message={validationErrors.educationDates} tone="error" /> : null}
                      {index === 0 && validationErrors.body ? <FieldHint message={validationErrors.body} tone="error" /> : null}
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
                  disabled={isLoadingDraft || isSaving}
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
