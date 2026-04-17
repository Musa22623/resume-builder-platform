import api from "./client";

export const prepareResumeDraftPayload = (payload) => ({
  ...payload,
  content_json: {
    ...payload.content_json,
    companies: payload.content_json.experience.map((item) => item.company).filter(Boolean),
    dates: [
      ...payload.content_json.experience.flatMap((item) => [item.startDate, item.endDate || (item.isCurrent ? "Present" : "")]),
      ...payload.content_json.education.flatMap((item) => [item.startDate, item.endDate]),
    ].filter(Boolean),
  },
});

export const createResumeDraft = async (payload) => {
  const nextPayload = prepareResumeDraftPayload(payload);
  const { data } = await api.post("/api/resumes/items/", nextPayload);
  return { data, nextPayload };
};

export const uploadResumeFile = async (resumeId, file) => {
  const formData = new FormData();
  formData.append("resume", String(resumeId));
  formData.append("file", file);

  const { data } = await api.post("/api/resumes/uploads/", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return data;
};
