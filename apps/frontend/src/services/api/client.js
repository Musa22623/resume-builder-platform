import axios from "axios";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000").replace(/\/+$/, "");

const api = axios.create({
  baseURL: apiBaseUrl,
});

let refreshRequest = null;

const clearStoredTokens = () => {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
};

const shouldAttachAccessToken = (url = "") => {
  if (!url.includes("/api/v1/auth/")) return true;
  return url.includes("/api/v1/auth/me/");
};

const refreshAccessToken = async () => {
  const refreshToken = localStorage.getItem("refresh_token");

  if (!refreshToken) {
    throw new Error("Missing refresh token");
  }

  if (!refreshRequest) {
    refreshRequest = axios
      .post(`${apiBaseUrl}/api/v1/auth/refresh/`, { "refresh_token": refreshToken })
      .then((response) => {
        const payload = response.data?.data || response.data;
        const accessToken = payload?.access_token;
        const refreshToken = payload?.refresh_token;

        if (!accessToken) {
          throw new Error("Refresh response did not include an access token");
        }

        localStorage.setItem("access_token", accessToken);
        if (refreshToken) {
          localStorage.setItem("refresh_token", refreshToken);
        }
        return accessToken;
      })
      .finally(() => {
        refreshRequest = null;
      });
  }

  return refreshRequest;
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token && shouldAttachAccessToken(config.url || "")) {
    config.headers.Authorization = `Bearer ${token}`;
  } else if (config.headers?.Authorization) {
    delete config.headers.Authorization;
  }
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
  async (error) => {
    const originalRequest = error.config;
    const status = error?.response?.status;
    const requestUrl = originalRequest?.url || "";
    const isAuthRequest = requestUrl.includes("/api/v1/auth/");
    const canRefreshRequest = !isAuthRequest || requestUrl.includes("/api/v1/auth/me/");
    const payload = error?.response?.data;

    if (payload && typeof payload === "object" && payload.success === false && payload.error) {
      error.response.data = {
        ...payload.error,
        detail: payload.error.message,
      };
    }

    if (status === 401 && canRefreshRequest && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const accessToken = await refreshAccessToken();
        originalRequest.headers = {
          ...originalRequest.headers,
          Authorization: `Bearer ${accessToken}`,
        };
        return api(originalRequest);
      } catch (refreshError) {
        clearStoredTokens();
        window.dispatchEvent(new Event("auth:session-expired"));
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default api;
