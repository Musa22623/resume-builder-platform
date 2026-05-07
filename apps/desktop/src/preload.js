const { contextBridge, ipcRenderer } = require("electron");

const request = (method, endpoint, body) => ipcRenderer.invoke("api:request", { method, endpoint, body });

contextBridge.exposeInMainWorld("desktopApi", {
  signIn: (payload) => ipcRenderer.invoke("auth:signin", payload),
  signUpRedirect: () => ipcRenderer.invoke("auth:signup_redirect"),
  getToken: () => ipcRenderer.invoke("auth:get_token"),
  logout: () => ipcRenderer.invoke("auth:logout"),
  me: () => ipcRenderer.invoke("auth:me"),
  request,
  get: (endpoint) => request("get", endpoint),
  post: (endpoint, body) => request("post", endpoint, body),
  patch: (endpoint, body) => request("patch", endpoint, body),
  put: (endpoint, body) => request("put", endpoint, body),
  delete: (endpoint) => request("delete", endpoint),
  chooseResumeFile: () => ipcRenderer.invoke("file:choose_resume"),
  uploadResumeFile: (resumeId, filePath) => ipcRenderer.invoke("file:upload_resume", { resumeId, filePath }),
  openExternal: (url) => ipcRenderer.invoke("shell:open_external", url),
  copyText: (text) => ipcRenderer.invoke("clipboard:write_text", text),
  reloadWindow: () => ipcRenderer.invoke("app:reload"),
});
