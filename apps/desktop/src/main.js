const { app, BrowserWindow, ipcMain, shell, Menu } = require("electron");
const path = require("path");
const Store = require("electron-store");
const axios = require("axios");

const store = new Store();

require("dotenv").config();

const API_BASE_URL = process.env.FRONTEND_API_BASE_URL || "http://localhost:8000";
const WEB_SIGNUP_URL = process.env.FRONTEND_URL ||"http://localhost:5173/signup";
console.log("API_BASE_URL:", API_BASE_URL);
function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 780,
    minWidth: 1080,
    minHeight: 680,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });
  win.loadFile(path.join(__dirname, "renderer.html"));
  return win;
}

function buildAppMenu() {
  return null;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

function normalizeAuthTokens(payload) {
  const source = payload?.data ?? payload ?? {};
  const accessToken = source.access_token ?? source.access ?? source.token ?? null;
  const refreshToken = source.refresh_token ?? source.refresh ?? null;

  if (!accessToken) {
    return null;
  }

  return {
    ...source,
    access_token: accessToken,
    refresh_token: refreshToken,
  };
}

function getAccessToken() {
  const tokens = store.get("tokens", null);
  if (!tokens) return null;
  return tokens.access_token ?? tokens.access ?? tokens.token ?? null;
}

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

ipcMain.handle("auth:signin", async (_, payload) => {
  const { data } = await api.post("/api/v1/auth/login/", payload);
  const tokens = normalizeAuthTokens(data);

  if (!tokens) {
    throw new Error("Login response did not include an access token.");
  }

  store.set("tokens", tokens);
  return { success: true, token: tokens.access_token };
});

ipcMain.handle("auth:signup_redirect", async () => {
  await shell.openExternal(WEB_SIGNUP_URL);
  return { success: true };
});

ipcMain.handle("auth:get_token", () => store.get("tokens", null));
ipcMain.handle("auth:logout", () => {
  store.delete("tokens");
  return { success: true };
});

ipcMain.handle("auth:me", async () => {
  const { data } = await api.get("/api/v1/auth/me/");
  console.log("User data:", data);
  return data;
});

ipcMain.handle("api:get", async (_, endpoint) => {
  const { data } = await api.get(endpoint);
  return data;
});

ipcMain.handle("api:post", async (_, payload) => {
  const { endpoint, body } = payload;
  const { data } = await api.post(endpoint, body);
  return data;
});

ipcMain.handle("api:patch", async (_, payload) => {
  const { endpoint, body } = payload;
  const { data } = await api.patch(endpoint, body);
  return data;
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
