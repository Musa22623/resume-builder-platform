const { app, BrowserWindow, clipboard, dialog, ipcMain, Menu, shell } = require("electron");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const FormData = require("form-data");
const mime = require("mime-types");
const Store = require("electron-store");

require("dotenv").config();

const store = new Store();

const API_BASE_URL = process.env.FRONTEND_API_BASE_URL || "http://localhost:8000";
const WEB_SIGNUP_URL = process.env.FRONTEND_URL || "http://localhost:5173/signup";
const RESUME_UPLOAD_EXTENSIONS = new Set([".pdf", ".doc", ".docx", ".txt"]);

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1080,
    minHeight: 700,
    backgroundColor: "#f4f6f8",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
      sandbox: false,
    },
  });

  win.loadFile(path.join(__dirname, "renderer.html"));
  return win;
}

function buildAppMenu() {
  return Menu.buildFromTemplate([
    {
      label: "Resume Builder",
      submenu: [
        { role: "reload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
      label: "Edit",
      submenu: [{ role: "undo" }, { role: "redo" }, { type: "separator" }, { role: "cut" }, { role: "copy" }, { role: "paste" }],
    },
  ]);
}

function unwrapApiPayload(payload) {
  if (payload && typeof payload === "object" && payload.success === true && Object.prototype.hasOwnProperty.call(payload, "data")) {
    return payload.data || {};
  }

  return payload;
}

function normalizeAuthTokens(payload) {
  const source = payload?.data ?? payload ?? {};
  const accessToken = source.access_token ?? source.access ?? source.token ?? null;
  const refreshToken = source.refresh_token ?? source.refresh ?? null;

  if (!accessToken) return null;

  return {
    ...source,
    access_token: accessToken,
    refresh_token: refreshToken,
  };
}

function getStoredTokens() {
  return store.get("tokens", null);
}

function getAccessToken() {
  const tokens = getStoredTokens();
  return tokens?.access_token ?? tokens?.access ?? tokens?.token ?? null;
}

function getRefreshToken() {
  const tokens = getStoredTokens();
  return tokens?.refresh_token ?? tokens?.refresh ?? null;
}

function storeTokens(tokens) {
  store.set("tokens", tokens);
}

function clearTokens() {
  store.delete("tokens");
}

function normalizeApiError(error, fallbackMessage = "We couldn't complete the request right now.") {
  const payload = error?.response?.data;
  const normalizedPayload = payload?.success === false && payload?.error ? payload.error : payload;

  if (typeof normalizedPayload === "string") return normalizedPayload;
  if (typeof normalizedPayload?.message === "string") return normalizedPayload.message;
  if (typeof normalizedPayload?.detail === "string") return normalizedPayload.detail;

  if (normalizedPayload && typeof normalizedPayload === "object") {
    const entry = Object.entries(normalizedPayload).find(([, value]) => value);
    if (entry) {
      const [field, value] = entry;
      const firstValue = Array.isArray(value) ? value[0] : value;
      if (typeof firstValue === "string") {
        return `${field.replace(/_/g, " ")}: ${firstValue}`;
      }
    }
  }

  return error?.message || fallbackMessage;
}

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error("Missing refresh token.");

  const response = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh/`, { refresh_token: refreshToken }, { timeout: 15000 });
  const tokens = normalizeAuthTokens(unwrapApiPayload(response.data));

  if (!tokens?.access_token) {
    throw new Error("Refresh response did not include an access token.");
  }

  const existingTokens = getStoredTokens() || {};
  const nextTokens = {
    ...existingTokens,
    ...tokens,
    refresh_token: tokens.refresh_token || refreshToken,
  };

  storeTokens(nextTokens);
  return nextTokens.access_token;
}

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    };
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    // The web client unwraps the platform response envelope; the desktop client must do the same
    // so every renderer view receives the same shape the React pages already expect.
    response.data = unwrapApiPayload(response.data);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const requestUrl = originalRequest?.url || "";
    const isRefreshRequest = requestUrl.includes("/api/v1/auth/refresh/");
    const isLoginRequest = requestUrl.includes("/api/v1/auth/login/");

    if (error?.response?.status === 401 && originalRequest && !originalRequest._retry && !isRefreshRequest && !isLoginRequest && getRefreshToken()) {
      originalRequest._retry = true;

      try {
        const accessToken = await refreshAccessToken();
        originalRequest.headers = {
          ...originalRequest.headers,
          Authorization: `Bearer ${accessToken}`,
        };
        return api(originalRequest);
      } catch (refreshError) {
        clearTokens();
        throw refreshError;
      }
    }

    throw error;
  }
);

function ensureApiEndpoint(endpoint) {
  if (typeof endpoint !== "string" || !endpoint.startsWith("/api/") || endpoint.includes("://")) {
    throw new Error("Invalid API endpoint.");
  }
  return endpoint;
}

async function invokeApiRequest({ method = "get", endpoint, body = null }) {
  const normalizedMethod = String(method).toLowerCase();
  const safeEndpoint = ensureApiEndpoint(endpoint);
  const allowedMethods = new Set(["get", "post", "patch", "put", "delete"]);

  if (!allowedMethods.has(normalizedMethod)) {
    throw new Error("Unsupported API method.");
  }

  try {
    const response = await api.request({
      method: normalizedMethod,
      url: safeEndpoint,
      data: body,
    });
    return response.data;
  } catch (error) {
    throw new Error(normalizeApiError(error));
  }
}

function ensureResumeFilePath(filePath) {
  if (typeof filePath !== "string" || !filePath.trim()) {
    throw new Error("Choose a resume file first.");
  }

  const resolvedPath = path.resolve(filePath);
  const extension = path.extname(resolvedPath).toLowerCase();

  if (!RESUME_UPLOAD_EXTENSIONS.has(extension)) {
    throw new Error("Choose a PDF, DOC, DOCX, or TXT file.");
  }

  if (!fs.existsSync(resolvedPath)) {
    throw new Error("The selected resume file could not be found.");
  }

  return resolvedPath;
}

ipcMain.handle("auth:signin", async (_, payload) => {
  try {
    const { data } = await api.post("/api/v1/auth/login/", payload);
    const tokens = normalizeAuthTokens(data);

    if (!tokens) {
      throw new Error("Login response did not include an access token.");
    }

    storeTokens(tokens);
    return { success: true, user: tokens.user || null };
  } catch (error) {
    throw new Error(normalizeApiError(error, "Sign in failed."));
  }
});

ipcMain.handle("auth:signup_redirect", async () => {
  await shell.openExternal(WEB_SIGNUP_URL);
  return { success: true };
});

ipcMain.handle("auth:get_token", () => getStoredTokens());

ipcMain.handle("auth:logout", () => {
  clearTokens();
  return { success: true };
});

ipcMain.handle("auth:me", async () => invokeApiRequest({ method: "get", endpoint: "/api/v1/auth/me/" }));

ipcMain.handle("api:request", async (_, payload) => invokeApiRequest(payload || {}));

ipcMain.handle("file:choose_resume", async () => {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  const result = await dialog.showOpenDialog(focusedWindow, {
    title: "Choose resume file",
    properties: ["openFile"],
    filters: [
      { name: "Resume files", extensions: ["pdf", "doc", "docx", "txt"] },
      { name: "All files", extensions: ["*"] },
    ],
  });

  if (result.canceled || !result.filePaths?.[0]) return null;

  const resolvedPath = ensureResumeFilePath(result.filePaths[0]);
  const stats = fs.statSync(resolvedPath);

  return {
    path: resolvedPath,
    name: path.basename(resolvedPath),
    size: stats.size,
  };
});

ipcMain.handle("file:upload_resume", async (_, payload = {}) => {
  const resumeId = payload.resumeId;
  const filePath = ensureResumeFilePath(payload.filePath);

  if (!resumeId) {
    throw new Error("Save or create a resume draft before uploading.");
  }

  const form = new FormData();
  form.append("resume", String(resumeId));
  form.append("file", fs.createReadStream(filePath), {
    filename: path.basename(filePath),
    contentType: mime.lookup(filePath) || "application/octet-stream",
  });

  try {
    const response = await api.post("/api/v1/resumes/uploads/", form, {
      headers: form.getHeaders(),
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });
    return response.data;
  } catch (error) {
    throw new Error(normalizeApiError(error, "Upload failed right now."));
  }
});

ipcMain.handle("shell:open_external", async (_, url) => {
  if (typeof url !== "string" || !/^https?:\/\//i.test(url)) {
    throw new Error("Invalid external URL.");
  }

  await shell.openExternal(url);
  return { success: true };
});

ipcMain.handle("clipboard:write_text", (_, text) => {
  clipboard.writeText(String(text || ""));
  return { success: true };
});

ipcMain.handle("app:reload", () => {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  focusedWindow?.reload();
  return { success: true };
});

app.whenReady().then(() => {
  createWindow();
  Menu.setApplicationMenu(buildAppMenu());
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
