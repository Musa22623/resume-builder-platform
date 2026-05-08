import api from "./client";

export const listJobDescriptions = async () => {
  const { data } = await api.get("/api/v1/jobs/descriptions/");
  return data.items || [];
};

export const createJobDescription = async (payload) => {
  const { data } = await api.post("/api/v1/jobs/descriptions/", {
    "job_title": payload.job_title,
    "source_type": payload.source_type,
    "job_link": payload.job_link,
    "raw_text": payload.raw_text,
  });
  return data.job_description || data;
};

export const updateJobDescription = async (descriptionId, payload) => {
  const { data } = await api.patch(`/api/v1/jobs/descriptions/${descriptionId}/`, {
    "job_title": payload.job_title,
    "source_type": payload.source_type,
    "job_link": payload.job_link,
    "raw_text": payload.raw_text,
  });
  return data.job_description || data;
};

export const deleteJobDescription = async (descriptionId) => {
  await api.delete(`/api/v1/jobs/descriptions/${descriptionId}/`);
};
