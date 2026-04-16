import { useState } from "react";
import api from "../services/api/client";

const ResumeEditorPage = () => {
  const [payload, setPayload] = useState({
    title: "",
    source_type: "manual",
    content_json: { name: "", summary: "", skills: [] },
    is_draft: true,
  });
  const [resumeId, setResumeId] = useState(null);

  const saveResume = async () => {
    const { data } = await api.post("/api/resumes/items/", payload);
    setResumeId(data.id);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/80 bg-white/85 p-8 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">Resume editor</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900">Build the base draft before generation.</h1>
          </div>
          <div className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Draft mode</div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.3fr_0.7fr]">
        <aside className="rounded-[2rem] border border-white/80 bg-white/90 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Sections</p>
          <div className="mt-4 grid gap-3">
            <div className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white">Basics</div>
            <div className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600">Summary</div>
            <div className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600">Skills</div>
            <div className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600">Experience</div>
          </div>
        </aside>

        <div className="rounded-[2rem] border border-white/80 bg-white/90 p-8 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <div className="grid gap-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Resume title</label>
              <input
                className="rb-field"
                placeholder="Resume title"
                onChange={(e) => setPayload({ ...payload, title: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Professional summary</label>
              <textarea
                className="rb-field min-h-56"
                placeholder="Professional summary"
                onChange={(e) =>
                  setPayload({
                    ...payload,
                    content_json: { ...payload.content_json, summary: e.target.value },
                  })
                }
              />
            </div>
            <button className="rb-btn-primary w-full" onClick={saveResume} type="button">
              Save Draft
            </button>
            {resumeId ? <p className="text-sm text-slate-500">Saved resume #{resumeId}</p> : null}
          </div>
        </div>
      </section>
    </div>
  );
};

export default ResumeEditorPage;
