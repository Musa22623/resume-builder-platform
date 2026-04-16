import { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api/client";

const AuthContext = createContext(null);
const DEV_LOGIN_STORAGE_KEY = "resume_builder_dev_login_user";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const login = async (username, password) => {
    const { data } = await api.post("/api/auth/signin/", { username, password });
    localStorage.removeItem(DEV_LOGIN_STORAGE_KEY);
    localStorage.setItem("access_token", data.access);
    localStorage.setItem("refresh_token", data.refresh);
    await loadMe();
  };

  const signup = async (payload) => api.post("/api/auth/signup/", payload);

  const forceLogin = (mockUser) => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.setItem(DEV_LOGIN_STORAGE_KEY, JSON.stringify(mockUser));
    setUser(mockUser);
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem(DEV_LOGIN_STORAGE_KEY);
    setUser(null);
  };

  const loadMe = async () => {
    try {
      const { data } = await api.get("/api/auth/me/");
      setUser(data);
    } catch {
      logout();
    }
  };

  useEffect(() => {
    const devLoginUser = localStorage.getItem(DEV_LOGIN_STORAGE_KEY);
    if (devLoginUser) {
      try {
        setUser(JSON.parse(devLoginUser));
        return;
      } catch {
        localStorage.removeItem(DEV_LOGIN_STORAGE_KEY);
      }
    }

    if (localStorage.getItem("access_token")) loadMe();
  }, []);

  return <AuthContext.Provider value={{ user, login, signup, logout, forceLogin }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
