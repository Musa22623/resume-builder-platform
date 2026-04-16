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
    <div>
      <h2>Job Description</h2>
      <select onChange={(e) => setForm({ ...form, source_type: e.target.value })}>
        <option value="manual">Manual</option>
        <option value="link">Job Link</option>
      </select>
      <input placeholder="Job link" onChange={(e) => setForm({ ...form, job_link: e.target.value })} />
      <textarea placeholder="Paste job description" onChange={(e) => setForm({ ...form, raw_text: e.target.value })} />
      <button onClick={submit}>Save</button>
      <p>{message}</p>
    </div>
  );
};

export default JobInputPage;
