import { useState } from "react";
import FieldGroup from "../components/ui/FieldGroup";
import api from "../services/api/client";
import PageIntro from "../components/ui/PageIntro";
import Panel from "../components/ui/Panel";

const JobInputPage = () => {
  const [form, setForm] = useState({ source_type: "manual", job_link: "", raw_text: "" });
  const [message, setMessage] = useState("");

  const submit = async () => {
    try {
      await api.post("/api/jobs/descriptions/", form);
      setMessage("Job description saved.");
    } catch (e) {
      setMessage(e.response?.data?.detail || "Failed to save.");
    }
  };

  return (
    <div className="space-y-6">
      <PageIntro
        description="Save a pasted job description or a job post link. The backend logic stays the same; this screen simply makes the choice clearer."
        eyebrow="Job input"
        title="Add the role you want to target."
      />

      <Panel>
        <div className="grid gap-6 lg:grid-cols-[0.36fr_0.64fr]">
          <div className="space-y-3">
            <button
              className={`w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
                form.source_type === "manual" ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-700"
              }`}
              onClick={() => setForm({ ...form, source_type: "manual" })}
              type="button"
            >
              Paste description
            </button>
            <button
              className={`w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
                form.source_type === "link" ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-700"
              }`}
              onClick={() => setForm({ ...form, source_type: "link" })}
              type="button"
            >
              Use job link
            </button>
          </div>

          <div className="space-y-4 rounded-[1.75rem] bg-slate-50 p-5">
            <FieldGroup label="Source type">
              <select
                className="rb-field"
                onChange={(e) => setForm({ ...form, source_type: e.target.value })}
                value={form.source_type}
              >
                <option value="manual">Manual</option>
                <option value="link">Job Link</option>
              </select>
            </FieldGroup>
            <FieldGroup label="Job link">
              <input
                className="rb-field"
                placeholder="Job link"
                onChange={(e) => setForm({ ...form, job_link: e.target.value })}
                value={form.job_link}
              />
            </FieldGroup>
            <FieldGroup label="Job description">
              <textarea
                className="rb-field min-h-52"
                placeholder="Paste job description"
                onChange={(e) => setForm({ ...form, raw_text: e.target.value })}
                value={form.raw_text}
              />
            </FieldGroup>
            <button className="rb-btn-primary w-full" onClick={submit} type="button">
              Save
            </button>
            <p className="text-sm text-slate-500">{message}</p>
          </div>
        </div>
      </Panel>
    </div>
  );
};

export default JobInputPage;
