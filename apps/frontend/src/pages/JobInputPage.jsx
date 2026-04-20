import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import FieldGroup from "../components/ui/FieldGroup";
import api from "../services/api/client";
import PageIntro from "../components/ui/PageIntro";
import Panel from "../components/ui/Panel";
import { getApiErrorMessage } from "../lib/apiError";

const EMPTY_FORM = {
  job_title: "",
  source_type: "manual",
  job_link: "",
  raw_text: "",
};

const RECENT_JOBS_STORAGE_KEY = "resume_builder_recent_job_targets";
const RECENT_JOBS_API_URL = "";
const MAX_RECENT_JOBS = 5;

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

const getRecentJobsFromStorage = () => {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(RECENT_JOBS_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENT_JOBS) : [];
  } catch {
    return [];
  }
};

const normalizeRecentJob = (item) => ({
  id: item?.id || `job-${Date.now()}`,
  job_title: item?.job_title || "",
  source_type: item?.source_type || "manual",
  job_link: item?.job_link || "",
  raw_text: item?.raw_text || "",
  savedAt: item?.savedAt || item?.saved_at || new Date().toISOString(),
});

const getRecentJobs = async () => {
  if (RECENT_JOBS_API_URL) {
    const { data } = await api.get(RECENT_JOBS_API_URL);
    const items = Array.isArray(data) ? data : data?.results || [];
    return items.map(normalizeRecentJob).slice(0, MAX_RECENT_JOBS);
  }

  return getRecentJobsFromStorage().map(normalizeRecentJob);
};

const RequiredLabel = ({ children }) => (
  <span>
    {children} <span className="text-rose-500">*</span>
  </span>
);

const RecentJobCard = ({ item, isSelected, onLoad }) => (
  <div
    className={`rounded-[1.5rem] border p-4 transition duration-200 ${
      isSelected ? "border-teal-300 bg-teal-50/80" : "border-slate-200 bg-white"
    }`}
  >
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-900">{item.job_title || "Untitled target"}</p>
        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">
          {item.source_type === "manual" ? "Manual" : "Link"} | {formatSavedAt(new Date(item.savedAt))}
        </p>
        <p className="hidden sr-only">
          {item.source_type === "manual" ? "Manual" : "Link"} • {formatSavedAt(new Date(item.savedAt))}
        </p>
      </div>
      <button className="rb-btn-subtle px-3 py-2 text-xs" onClick={onLoad} type="button">
        Load
      </button>
    </div>
    <p className="mt-3 text-sm leading-7 text-slate-500">{item.job_link ? truncate(item.job_link, 54) : getPreviewText(item.raw_text)}</p>
  </div>
);

const JobInputPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState("neutral");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingRecentJobs, setIsLoadingRecentJobs] = useState(true);
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
        setIsLoadingRecentJobs(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (RECENT_JOBS_API_URL) return;
    window.localStorage.setItem(RECENT_JOBS_STORAGE_KEY, JSON.stringify(recentJobs));
  }, [recentJobs]);

  const titleText = form.job_title.trim();
  const descriptionText = form.raw_text.trim();
  const linkText = form.job_link.trim();
  const hasTitle = titleText.length > 0;
  const hasDescription = descriptionText.length > 0;
  const hasLink = linkText.length > 0;
  const isLinkValid = !hasLink || isLikelyJobLink(linkText);
  const canSave = hasTitle && (form.source_type === "manual" ? hasDescription : hasLink);
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

  const pageBadge = useMemo(() => {
    if (selectedSavedSignature && currentFormSignature === selectedSavedSignature) return "Saved";
    if (hasTitle || hasDescription || hasLink) return canSave ? "Draft ready" : "Needs attention";
    return "No target yet";
  }, [canSave, currentFormSignature, hasDescription, hasLink, hasTitle, selectedSavedSignature]);

  const handleFieldChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (message) {
      setMessage("");
      setMessageTone("neutral");
    }
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
      return false;
    }

    setIsSaving(true);

    try {
      await api.post("/api/jobs/descriptions/", {
        source_type: form.source_type,
        job_link: form.job_link,
        raw_text: form.raw_text,
      });

      const savedJob = {
        id: selectedRecentJobId || `job-${Date.now()}`,
        job_title: titleText,
        source_type: form.source_type,
        job_link: linkText,
        raw_text: descriptionText,
        savedAt: new Date().toISOString(),
      };

      setRecentJobs((current) => {
        const nextItems = [savedJob, ...current.filter((item) => item.id !== savedJob.id)];
        return nextItems.slice(0, MAX_RECENT_JOBS);
      });
      setSelectedRecentJobId(savedJob.id);
      setMessage(
        intent === "generate"
          ? "Job target saved. Opening the resume flow so you can continue into generation."
          : "Job target saved for later.",
      );
      setMessageTone("success");
      return true;
    } catch (error) {
      setMessage(getApiErrorMessage(error, "Failed to save."));
      setMessageTone("error");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveForLater = async () => {
    await persistTarget({ intent: "save" });
  };

  const handleGenerateResume = async () => {
    const didSave = await persistTarget({ intent: "generate" });
    if (!didSave) return;

    navigate("/resume", {
      state: {
        fromJobTarget: true,
        generationIntent: true,
        jobTargetTitle: titleText,
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

  return (
    <div className="space-y-6">
      <PageIntro
        badge={pageBadge}
        description="Add the target role and move straight into the resume generation flow. This step captures the job context that will shape summary and experience wording."
        eyebrow="Target role"
        title="Add your target role."
      />

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <Panel className="p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">Target Role Form</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">Choose the input mode and start a tailored resume from this role.</h2>
                <p className="mt-3 text-sm leading-7 text-slate-500">
                  Keep this step lightweight: add the role title, capture the link or description, then generate or save it for later.
                </p>
              </div>
            </div>

            <div className="mt-6 inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1.5">
              <button
                aria-pressed={form.source_type === "manual"}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  form.source_type === "manual"
                    ? "bg-slate-900 text-white shadow-[0_10px_24px_rgba(15,23,42,0.18)]"
                    : "text-slate-500 hover:bg-white hover:text-slate-700"
                }`}
                onClick={() => handleFieldChange("source_type", "manual")}
                type="button"
              >
                Paste Job Description
              </button>
              <button
                aria-pressed={form.source_type === "link"}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  form.source_type === "link"
                    ? "bg-slate-900 text-white shadow-[0_10px_24px_rgba(15,23,42,0.18)]"
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

              {form.source_type === "link" ? (
                <FieldGroup
                  hint="Use the public job post URL. If the next step needs richer context, you can also paste the description below."
                  label={<RequiredLabel>Job link</RequiredLabel>}
                >
                  <input
                    className="rb-field"
                    placeholder="https://company.com/jobs/senior-product-manager"
                    onChange={(event) => handleFieldChange("job_link", event.target.value)}
                    value={form.job_link}
                  />
                  {hasLink && !isLinkValid ? (
                    <p className="mt-2 text-xs leading-6 text-amber-600">Use a full URL starting with `http://` or `https://`.</p>
                  ) : null}
                </FieldGroup>
              ) : null}

              <FieldGroup
                hint={
                  form.source_type === "manual"
                    ? "Paste the full job description or the most relevant parts of the posting."
                    : "Optional but helpful. Paste the posting text too if you want a richer review context later."
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
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                className="rb-btn-primary w-full justify-center sm:w-auto sm:min-w-48"
                disabled={isSaving}
                onClick={handleGenerateResume}
                type="button"
              >
                {isSaving ? "Saving..." : "Generate Resume"}
              </button>
              <button className="rb-btn-secondary w-full justify-center sm:w-auto" onClick={handleSaveForLater} type="button">
                Save for Later
              </button>
              <button className="rb-btn-secondary w-full justify-center sm:w-auto" onClick={clearForm} type="button">
                Clear
              </button>
            </div>

            {message ? (
              <div
                className={`mt-4 rounded-[1.5rem] border px-4 py-3 text-sm leading-7 ${
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
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">Recent job targets</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">Latest saved 5 target roles</h2>
              </div>
              <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600">
                {isLoadingRecentJobs ? "..." : `${recentJobs.length}/5`}
              </div>
            </div>

            {isLoadingRecentJobs ? (
              <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-5 text-sm leading-7 text-slate-500">
                Loading recent target roles...
              </div>
            ) : recentJobs.length ? (
              <div className="mt-6 space-y-3">
                {recentJobs.map((item) => (
                  <RecentJobCard
                    isSelected={item.id === selectedRecentJobId}
                    item={item}
                    key={item.id}
                    onLoad={() => loadRecentJob(item)}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm leading-7 text-slate-500">
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
