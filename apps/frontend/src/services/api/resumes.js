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
  const { data } = await api.post("/api/v1/resumes/items/", nextPayload);
  return { data, nextPayload };
};

export const listResumes = async () => {
  const { data } = await api.get("/api/v1/resumes/items/");
  return data.items || [];
};

export const getResumeDetail = async (resumeId) => {
  const { data } = await api.get(`/api/v1/resumes/items/${resumeId}/`);
  return data.resume || data;
};

export const autosaveResumeDraft = async (resumeId, payload) => {
  const nextPayload = prepareResumeDraftPayload(payload);
  const { data } = await api.post(`/api/v1/resumes/items/${resumeId}/autosave/`, {
    "content_json": nextPayload.content_json,
  });
  return { data, nextPayload };
};

export const updateResumeDraftMeta = async (resumeId, payload) => {
  const { data } = await api.patch(`/api/v1/resumes/items/${resumeId}/`, {
    "title": payload.title,
    "is_draft": payload.is_draft,
  });
  return data.resume || data;
};

export const listResumeVersions = async (resumeId) => {
  const { data } = await api.get(`/api/v1/resumes/items/${resumeId}/versions/`);
  return data.items || [];
};

export const getResumeVersionDetail = async (resumeId, versionId) => {
  const { data } = await api.get(`/api/v1/resumes/items/${resumeId}/versions/${versionId}/`);
  return data.version || data;
};

export const createResumeVersion = async (resumeId, contentJson) => {
  const { data } = await api.post(`/api/v1/resumes/items/${resumeId}/create_version/`, {
    "content_json": contentJson,
  });
  return data.version || data;
};

export const restoreResumeVersion = async (resumeId, versionId) => {
  const { data } = await api.post(`/api/v1/resumes/items/${resumeId}/restore_version/`, {
    "version_id": versionId,
  });
  return data;
};

export const uploadResumeFile = async (resumeId, file) => {
  const formData = new FormData();
  formData.append("resume", String(resumeId));
  formData.append("file", file);

  const { data } = await api.post("/api/v1/resumes/uploads/", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return data;
};

export const parseResumeUpload = async (uploadId) => {
  const { data } = await api.post(`/api/v1/resumes/uploads/${uploadId}/parse/`);
  return data;
};

export const applyParsedResumeUpload = async (uploadId, createVersion = true) => {
  const { data } = await api.post(`/api/v1/resumes/uploads/${uploadId}/apply-parsed/`, {
    "create_version": createVersion,
  });
  return data;
};
