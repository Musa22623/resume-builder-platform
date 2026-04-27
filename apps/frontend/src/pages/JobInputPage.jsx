import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import FieldGroup from "../components/ui/FieldGroup";
import Panel from "../components/ui/Panel";
import PageTitleBar from "../components/ui/PageTitleBar";
import { getApiErrorMessage } from "../lib/apiError";
import { createJobDescription, deleteJobDescription, listJobDescriptions, updateJobDescription } from "../services/api/jobs";

const EMPTY_FORM = {
  job_title: "",
  source_type: "manual",
  job_link: "",
  raw_text: "",
};

const MAX_RECENT_JOBS = 5;
const SAMPLE_JOB_DESCRIPTION = `Senior Product Manager

We are looking for a product manager to lead roadmap planning for a B2B workflow platform. You will partner with design, engineering, customer success, and sales to identify customer needs, prioritize initiatives, define success metrics, and launch improvements that reduce manual work for operations teams.

Responsibilities:
- Own product discovery, roadmap planning, and delivery for workflow automation features.
- Translate customer research and analytics into clear product requirements.
- Partner with engineering to ship reliable, measurable improvements.
- Define success metrics and communicate progress to stakeholders.
- Improve onboarding, activation, and retention through data-informed decisions.

Requirements:
- 5+ years of product management experience in SaaS or B2B platforms.
- Strong communication, prioritization, and stakeholder management skills.
- Experience with analytics, experimentation, SQL, or dashboard tools.
- Ability to write clear requirements and connect product work to business outcomes.`;

const KEYWORD_STOP_WORDS = new Set([
  "about",
  "across",
  "also",
  "and",
  "are",
  "for",
  "from",
  "into",
  "our",
  "that",
  "the",
  "this",
  "through",
  "with",
  "will",
  "work",
  "you",
  "your",
]);

const truncate = (value, maxLength = 72) => {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1)}...`;
};

const isLikelyJobLink = (value) => /^https?:\/\/\S+$/i.test(value.trim());

const getHostnameLabel = (value) => {
  try {
    return new URL(value).hostname.replace(/^www\./i, "");
  } catch {
    return "External job post";
  }
};

const getPreviewText = (value) => {
  const firstLine = value
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);

  return firstLine ? truncate(firstLine, 88) : "No description preview yet";
};

const countWords = (value) => value.trim().split(/\s+/).filter(Boolean).length;

const extractKeywords = (value, limit = 8) => {
  const counts = value
    .toLowerCase()
    .replace(/[^a-z0-9+\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !KEYWORD_STOP_WORDS.has(word))
    .reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {});

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([word]) => word);
};

const getTargetLabel = ({ job_title, source_type, job_link, raw_text }) => {
  if (job_title.trim()) {
    return truncate(job_title.trim(), 78);
  }

  if (raw_text.trim()) {
    return getPreviewText(raw_text);
  }

  if (source_type === "link" && job_link.trim()) {
    return `Job link from ${getHostnameLabel(job_link.trim())}`;
  }

  return "No target drafted yet";
};

const formatSavedAt = (value) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);

const normalizeRecentJob = (item) => ({
  id: item?.id || `job-${Date.now()}`,
  job_title: item?.job_title || "",
  source_type: item?.source_type || "manual",
  job_link: item?.job_link || "",
  raw_text: item?.raw_text || "",
  savedAt: item?.savedAt || item?.updated_at || item?.created_at || item?.saved_at || new Date().toISOString(),
  parse_status: item?.parse_status || "",
});

const getRecentJobs = async () => {
  const items = await listJobDescriptions();
  return items.map(normalizeRecentJob).slice(0, MAX_RECENT_JOBS);
};

const RequiredLabel = ({ children }) => (
  <span>
    {children} <span className="text-rose-500">*</span>
  </span>
);

const RecentJobCard = ({ item, isDeleting, isSelected, onDelete, onGenerate, onSelect }) => {
  const handleCardKeyDown = (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onSelect();
  };

  const runButtonAction = (event, action) => {
    event.stopPropagation();
    action();
  };

  return (
  <div
    aria-label={`Load ${item.job_title || "saved target role"}`}
    className={`cursor-pointer rounded-lg border p-4 transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-100 ${
      isSelected ? "border-teal-400 bg-teal-50/80" : "border-slate-200 bg-white hover:border-teal-200 hover:bg-teal-50/50"
    }`}
    onClick={onSelect}
    onKeyDown={handleCardKeyDown}
    role="button"
    tabIndex={0}
    title="Click to display this target role"
  >
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-950">{item.job_title || "Untitled target"}</p>
        <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-400">
          {item.source_type === "manual" ? "Manual" : "Link"} | {formatSavedAt(new Date(item.savedAt))}
        </p>
        <p className="hidden sr-only">
          {item.source_type === "manual" ? "Manual" : "Link"} saved {formatSavedAt(new Date(item.savedAt))}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button className="rb-btn-dark px-3 py-2 text-xs" onClick={(event) => runButtonAction(event, onGenerate)} type="button">
          Generate
        </button>
        <button
          className="rounded-lg border border-rose-100 bg-white px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isDeleting}
          onClick={(event) => runButtonAction(event, onDelete)}
          type="button"
        >
          {isDeleting ? "Deleting" : "Delete"}
        </button>
      </div>
    </div>
    <p className="mt-3 text-sm leading-6 text-slate-500">{item.job_link ? truncate(item.job_link, 54) : getPreviewText(item.raw_text)}</p>
  </div>
  );
};

const JobInputPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState("neutral");
  const [isSaving, setIsSaving] = useState(false);
  const [activeIntent, setActiveIntent] = useState("");
  const [isLoadingRecentJobs, setIsLoadingRecentJobs] = useState(true);
  const [deletingJobId, setDeletingJobId] = useState(null);
  const [recentJobs, setRecentJobs] = useState([]);
  const [selectedRecentJobId, setSelectedRecentJobId] = useState(null);

  useEffect(() => {
    let isMounted = true;

    getRecentJobs()
      .then((storedJobs) => {
        if (!isMounted) return;
        setRecentJobs(storedJobs);
        if (storedJobs[0]?.id) {
          setSelectedRecentJobId(storedJobs[0].id);
        }
        setIsLoadingRecentJobs(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setRecentJobs([]);
        setMessage("We couldn't load saved target roles right now.");
        setMessageTone("error");
        setIsLoadingRecentJobs(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const titleText = form.job_title.trim();
  const descriptionText = form.raw_text.trim();
  const linkText = form.job_link.trim();
  const hasTitle = titleText.length > 0;
  const hasDescription = descriptionText.length > 0;
  const hasLink = linkText.length > 0;
  const isLinkValid = !hasLink || isLikelyJobLink(linkText);
  const canSave = hasTitle && (form.source_type === "manual" ? hasDescription : hasLink);
  const descriptionWordCount = countWords(descriptionText);
  const detectedKeywords = useMemo(() => extractKeywords(descriptionText), [descriptionText]);
  const hasUsefulDescription = descriptionWordCount >= 80;
  const isGenerating = isSaving && activeIntent === "generate";
  const isSavingDraft = isSaving && activeIntent === "save";
  const selectedRecentJob = recentJobs.find((item) => item.id === selectedRecentJobId) || null;
  const currentFormSignature = JSON.stringify({
    job_title: titleText,
    source_type: form.source_type,
    job_link: linkText,
    raw_text: descriptionText,
  });
  const selectedSavedSignature = selectedRecentJob
    ? JSON.stringify({
        job_title: (selectedRecentJob.job_title || "").trim(),
        source_type: selectedRecentJob.source_type || "manual",
        job_link: (selectedRecentJob.job_link || "").trim(),
        raw_text: (selectedRecentJob.raw_text || "").trim(),
      })
    : null;

  const handleFieldChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (message) {
      setMessage("");
      setMessageTone("neutral");
    }
  };

  const handleUseSampleDescription = () => {
    setForm({
      job_title: "Senior Product Manager",
      source_type: "manual",
      job_link: "",
      raw_text: SAMPLE_JOB_DESCRIPTION,
    });
    setSelectedRecentJobId(null);
    setMessage("Sample job description loaded. Review it, then generate a tailored resume.");
    setMessageTone("success");
  };

  const getValidationMessage = (intent = "save") => {
    const actionLabel = intent === "generate" ? "generate" : "save";

    if (form.source_type === "manual") {
      return `Add a job title and job description before you ${actionLabel}.`;
    }

    if (!hasLink) {
      return `Add a job title and job link before you ${actionLabel}.`;
    }

    return "Use a complete job link starting with http:// or https:// before you continue.";
  };

  const persistTarget = async ({ intent = "save" } = {}) => {
    if (!canSave || !isLinkValid) {
      setMessage(getValidationMessage(intent));
      setMessageTone("warning");
      return null;
    }

    setIsSaving(true);
    setActiveIntent(intent);

    try {
      const payload = {
        job_title: titleText,
        source_type: form.source_type,
        job_link: linkText,
        raw_text: descriptionText,
      };
      const savedJobResponse = selectedRecentJobId
        ? await updateJobDescription(selectedRecentJobId, payload)
        : await createJobDescription(payload);
      const savedJob = normalizeRecentJob(savedJobResponse);

      setRecentJobs((current) => {
        const nextItems = [savedJob, ...current.filter((item) => item.id !== savedJob.id)];
        return nextItems.slice(0, MAX_RECENT_JOBS);
      });
      setSelectedRecentJobId(savedJob.id);
      setMessage(
        intent === "generate"
          ? "Job target saved. Opening Resume Builder with this target highlighted."
          : selectedRecentJobId
            ? "Job target updated."
            : "Job target saved for later.",
      );
      setMessageTone("success");
      return savedJob;
    } catch (error) {
      setMessage(getApiErrorMessage(error, "Failed to save."));
      setMessageTone("error");
      return null;
    } finally {
      setIsSaving(false);
      setActiveIntent("");
    }
  };

  const handleSaveForLater = async () => {
    await persistTarget({ intent: "save" });
  };

  const handleGenerateResume = async () => {
    const savedJob = await persistTarget({ intent: "generate" });
    if (!savedJob) return;

    navigate("/resume", {
      state: {
        fromJobTarget: true,
        generationIntent: true,
        jobDescriptionId: savedJob.id,
        jobTargetTitle: savedJob.job_title || titleText,
      },
    });
  };

  const handleGenerateFromRecentJob = (item) => {
    setSelectedRecentJobId(item.id);
    navigate("/resume", {
      state: {
        fromJobTarget: true,
        generationIntent: true,
        jobDescriptionId: item.id,
        jobTargetTitle: item.job_title || getTargetLabel(item),
      },
    });
  };

  const clearForm = () => {
    setForm({ ...EMPTY_FORM });
    setMessage("");
    setMessageTone("neutral");
    setSelectedRecentJobId(null);
  };

  const loadRecentJob = (item) => {
    setForm({
      job_title: item.job_title || "",
      source_type: item.source_type || "manual",
      job_link: item.job_link || "",
      raw_text: item.raw_text || "",
    });
    setSelectedRecentJobId(item.id);
    setMessage("");
    setMessageTone("neutral");
  };

  const handleDeleteRecentJob = async (item) => {
    setDeletingJobId(item.id);
    setMessage("");
    setMessageTone("neutral");

    try {
      await deleteJobDescription(item.id);
      setRecentJobs((current) => current.filter((job) => job.id !== item.id));
      if (selectedRecentJobId === item.id) {
        clearForm();
      }
      setMessage("Job target deleted.");
      setMessageTone("success");
    } catch (error) {
      setMessage(getApiErrorMessage(error, "Failed to delete target role."));
      setMessageTone("error");
    } finally {
      setDeletingJobId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageTitleBar
        actions={
          <button
            className="rb-btn-primary h-11 justify-center px-5"
            disabled={isSaving}
            onClick={handleGenerateResume}
            type="button"
          >
            {isGenerating ? "Generating AI draft..." : "Generate Tailored Resume (AI)"}
          </button>
        }
        subtitle="Paste a job description or URL. AI uses it to tailor your resume summary, bullets, and keywords."
        title="Target Role"
      />
      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <Panel className="p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">AI target input</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">Tell AI which job your resume should win.</h2>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Paste the job description and we extract key skills, requirements, and keyword signals before sending you to Resume Builder.
                </p>
              </div>
              <button className="rb-btn-secondary w-full justify-center lg:w-auto" onClick={handleUseSampleDescription} type="button">
                Use sample job description
              </button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {["Matches your resume to job keywords", "Rewrites bullets for ATS", "Highlights relevant experience"].map((item) => (
                <div className="rounded-lg border border-teal-100 bg-teal-50/70 px-3 py-2 text-sm font-semibold text-teal-800" key={item}>
                  <span className="mr-2">✓</span>
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-6 inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
              <button
                aria-pressed={form.source_type === "manual"}
                className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
                  form.source_type === "manual"
                    ? "bg-slate-900 text-white shadow-[0_10px_24px_rgba(15,23,42,0.16)]"
                    : "text-slate-500 hover:bg-white hover:text-slate-700"
                }`}
                onClick={() => handleFieldChange("source_type", "manual")}
                type="button"
              >
                Paste Job Description
              </button>
              <button
                aria-pressed={form.source_type === "link"}
                className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
                  form.source_type === "link"
                    ? "bg-slate-900 text-white shadow-[0_10px_24px_rgba(15,23,42,0.16)]"
                    : "text-slate-500 hover:bg-white hover:text-slate-700"
                }`}
                onClick={() => handleFieldChange("source_type", "link")}
                type="button"
              >
                Use Job Link
              </button>
            </div>

            <div className="mt-6 space-y-5">
              <FieldGroup
                hint="Use a clear role name so this target is easy to find again from the recent saved list."
                label={<RequiredLabel>Job title</RequiredLabel>}
              >
                <input
                  className="rb-field"
                  placeholder="Senior Product Manager"
                  onChange={(event) => handleFieldChange("job_title", event.target.value)}
                  value={form.job_title}
                />
              </FieldGroup>

              <FieldGroup
                hint={
                  form.source_type === "link"
                    ? "Paste the public job post URL. If automatic parsing fails, paste the description below as a fallback."
                    : "Optional. Add the job URL too if you want the source saved with this target."
                }
                label={form.source_type === "link" ? <RequiredLabel>Job URL</RequiredLabel> : "Job URL (optional)"}
              >
                <input
                  className="rb-field"
                  placeholder="https://company.com/jobs/senior-product-manager"
                  onChange={(event) => handleFieldChange("job_link", event.target.value)}
                  value={form.job_link}
                />
                {hasLink && isLinkValid ? (
                  <p className="mt-2 text-xs font-semibold leading-6 text-teal-700">✓ URL ready for parsing. Paste text below for a stronger fallback.</p>
                ) : hasLink ? (
                  <p className="mt-2 text-xs leading-6 text-amber-600">Use a full URL starting with http:// or https://.</p>
                ) : null}
              </FieldGroup>

              <FieldGroup
                hint={
                  form.source_type === "manual"
                    ? "Paste job description. We extract key skills and requirements for keyword matching."
                    : "Optional fallback. If URL parsing misses details, pasted text gives AI stronger context."
                }
                label={form.source_type === "manual" ? <RequiredLabel>Job description</RequiredLabel> : "Pasted description (optional)"}
              >
                <textarea
                  className="rb-field min-h-72"
                  placeholder={
                    form.source_type === "manual"
                      ? "Paste the full job description here."
                      : "Paste the most relevant parts of the posting if you want stronger context."
                  }
                  onChange={(event) => handleFieldChange("raw_text", event.target.value)}
                  value={form.raw_text}
                />
              </FieldGroup>

              <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Input detected</p>
                  <p className={`mt-1 text-sm font-semibold ${descriptionWordCount ? "text-teal-700" : "text-slate-500"}`}>
                    {descriptionWordCount ? `✓ ${descriptionWordCount} words detected` : "Paste text to detect words"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Keywords</p>
                  <p className={`mt-1 text-sm font-semibold ${detectedKeywords.length ? "text-teal-700" : "text-slate-500"}`}>
                    {detectedKeywords.length ? `✓ ${detectedKeywords.length} extracted` : "Waiting for description"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Speed</p>
                  <p className="mt-1 text-sm font-semibold text-slate-700">Usually under 30 seconds</p>
                </div>
              </div>

              {detectedKeywords.length ? (
                <div className="flex flex-wrap gap-2">
                  {detectedKeywords.map((keyword) => (
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200" key={keyword}>
                      {keyword}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="sticky bottom-3 z-10 mt-6 rounded-xl border border-white/80 bg-white/95 p-3 shadow-[0_18px_40px_rgba(15,23,42,0.12)] backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
              <div className="flex flex-col gap-3 sm:flex-row">
              <button
                className="rb-btn-primary h-12 w-full justify-center text-base sm:w-auto sm:min-w-72"
                disabled={isSaving}
                onClick={handleGenerateResume}
                type="button"
              >
                {isGenerating ? "Generating AI draft..." : "Generate Tailored Resume (AI)"}
              </button>
              <button className="rb-btn-secondary w-full justify-center sm:w-auto" onClick={handleSaveForLater} type="button">
                {isSavingDraft ? "Saving..." : "Save target"}
              </button>
              <button className="rb-btn-secondary w-full justify-center sm:w-auto" onClick={clearForm} type="button">
                Clear
              </button>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Generate saves this target, opens Resume Builder automatically, and highlights this job context for tailoring.
              </p>
            </div>

            {message ? (
              <div
                className={`mt-4 rounded-lg border px-4 py-3 text-sm leading-6 ${
                  messageTone === "success"
                    ? "border-teal-200 bg-teal-50 text-teal-800"
                    : messageTone === "warning"
                      ? "border-amber-200 bg-amber-50 text-amber-800"
                      : messageTone === "error"
                        ? "border-rose-200 bg-rose-50 text-rose-800"
                        : "border-slate-200 bg-slate-50 text-slate-600"
                }`}
              >
                {message}
              </div>
            ) : null}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel className="p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">AI result preview</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
              {hasTitle ? `Tailor for ${titleText}` : "Preview what AI will create"}
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              The next screen opens Resume Builder with this job target attached, so the resume can be optimized against the role.
            </p>

            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Estimated output</p>
              <div className="mt-3 grid gap-2">
                {["Optimized summary", "Improved bullet points", "Keyword matching", "Relevant experience highlights"].map((item) => (
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800" key={item}>
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-teal-100 text-[11px] text-teal-700">✓</span>
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">ATS focus</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">Keyword-aware output</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Guardrail</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">Resume facts stay protected</p>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm font-semibold text-amber-800">Fallback ready</p>
              <p className="mt-1 text-sm leading-6 text-amber-800">
                If URL parsing fails or the posting is blocked, paste the description text and generate from that context.
              </p>
            </div>
          </Panel>

          <Panel className="p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">Last generated result preview</p>
            <h2 className="mt-3 text-xl font-semibold tracking-tight text-slate-950">
              {selectedRecentJob ? getTargetLabel(selectedRecentJob) : "No generated target selected yet"}
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              {selectedRecentJob
                ? "Load this target, generate again, or use it as the context for the next tailored resume."
                : "After you save or generate a target, the latest result preview appears here."}
            </p>
            {selectedRecentJob ? (
              <button className="rb-btn-primary mt-4 w-full justify-center" onClick={() => handleGenerateFromRecentJob(selectedRecentJob)} type="button">
                Generate from last target
              </button>
            ) : null}
          </Panel>

          <Panel className="p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">Recent job targets</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">Recent saved targets</h2>
              </div>
              <div className="rounded-md bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-600">
                {isLoadingRecentJobs ? "..." : `${recentJobs.length}/5`}
              </div>
            </div>

            {isLoadingRecentJobs ? (
              <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 px-4 py-5 text-sm leading-6 text-slate-500">
                Loading recent target roles...
              </div>
            ) : recentJobs.length ? (
              <div className="mt-6 space-y-3">
                {recentJobs.map((item) => (
                  <RecentJobCard
                    isDeleting={deletingJobId === item.id}
                    isSelected={item.id === selectedRecentJobId}
                    item={item}
                    key={item.id}
                    onDelete={() => handleDeleteRecentJob(item)}
                    onGenerate={() => handleGenerateFromRecentJob(item)}
                    onSelect={() => loadRecentJob(item)}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm leading-6 text-slate-500">
                No saved target roles yet. Once you save one, the latest five will stay visible here for quick reuse.
              </div>
            )}
          </Panel>

        </div>
      </section>
    </div>
  );
};

export default JobInputPage;
