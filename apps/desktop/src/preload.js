const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopApi", {
  signIn: (payload) => ipcRenderer.invoke("auth:signin", payload),
  signUpRedirect: () => ipcRenderer.invoke("auth:signup_redirect"),
  getToken: () => ipcRenderer.invoke("auth:get_token"),
  logout: () => ipcRenderer.invoke("auth:logout"),
  me: () => ipcRenderer.invoke("auth:me"),
  get: (endpoint) => ipcRenderer.invoke("api:get", endpoint),
  post: (endpoint, body) => ipcRenderer.invoke("api:post", { endpoint, body }),
  patch: (endpoint, body) => ipcRenderer.invoke("api:patch", { endpoint, body }),
  reloadWindow: () => ipcRenderer.invoke("app:reload"),
});
