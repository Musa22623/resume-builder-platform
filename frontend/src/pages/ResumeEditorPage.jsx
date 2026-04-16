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
    <div>
      <h2>Resume Editor</h2>
      <input placeholder="Resume title" onChange={(e) => setPayload({ ...payload, title: e.target.value })} />
      <textarea
        placeholder="Professional summary"
        onChange={(e) =>
          setPayload({
            ...payload,
            content_json: { ...payload.content_json, summary: e.target.value },
          })
        }
      />
      <button onClick={saveResume}>Save Draft</button>
      {resumeId && <p>Saved resume #{resumeId}</p>}
    </div>
  );
};

export default ResumeEditorPage;
