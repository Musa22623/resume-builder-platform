import { useState } from "react";
import api from "../services/api/client";

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
      <section className="rounded-[2rem] border border-white/80 bg-white/85 p-8 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">Job input</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900">Add the role you want to target.</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-500">
          Save a pasted job description or a job post link. The backend logic stays the same; this screen simply makes the choice clearer.
        </p>
      </section>

      <section className="rounded-[2rem] border border-white/80 bg-white/90 p-8 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
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
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Source type</label>
              <select
                className="rb-field"
                onChange={(e) => setForm({ ...form, source_type: e.target.value })}
                value={form.source_type}
              >
                <option value="manual">Manual</option>
                <option value="link">Job Link</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Job link</label>
              <input
                className="rb-field"
                placeholder="Job link"
                onChange={(e) => setForm({ ...form, job_link: e.target.value })}
                value={form.job_link}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Job description</label>
              <textarea
                className="rb-field min-h-52"
                placeholder="Paste job description"
                onChange={(e) => setForm({ ...form, raw_text: e.target.value })}
                value={form.raw_text}
              />
            </div>
            <button className="rb-btn-primary w-full" onClick={submit} type="button">
              Save
            </button>
            <p className="text-sm text-slate-500">{message}</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default JobInputPage;
