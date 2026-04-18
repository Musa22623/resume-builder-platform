import axios from "axios";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000").replace(/\/+$/, "");

const api = axios.create({
  baseURL: apiBaseUrl,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => {
    const payload = response.data;

    if (payload && typeof payload === "object" && payload.success === true && "data" in payload) {
      response.data = payload.data;
      response.message = payload.message || "";
    }

    return response;
  },
  (error) => {
    const payload = error?.response?.data;

    if (payload && typeof payload === "object" && payload.success === false && payload.error) {
      error.response.data = {
        ...payload.error,
        detail: payload.error.message,
      };
    }

    return Promise.reject(error);
  },
);

export default api;
