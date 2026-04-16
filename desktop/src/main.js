const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");
const Store = require("electron-store");
const axios = require("axios");

const store = new Store();
const API_BASE_URL = process.env.FRONTEND_API_BASE_URL || "http://localhost:8000";
const WEB_SIGNUP_URL = "http://localhost:5173/signup";

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
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

function getAccessToken() {
  const tokens = store.get("tokens", null);
  if (!tokens || !tokens.access) return null;
  return tokens.access;
}

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

ipcMain.handle("auth:signin", async (_, payload) => {
  const { data } = await api.post("/api/auth/signin/", payload);
  store.set("tokens", data);
  return { success: true, token: data.access };
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
  const { data } = await api.get("/api/auth/me/");
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

app.whenReady().then(createWindow);
