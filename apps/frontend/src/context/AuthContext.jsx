import { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api/client";

const AuthContext = createContext(null);
const DEV_LOGIN_STORAGE_KEY = "resume_builder_dev_login_user";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const login = async (email, password) => {
    const { data } = await api.post("/api/v1/auth/login/", { email, password });
    localStorage.removeItem(DEV_LOGIN_STORAGE_KEY);
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);
    // await loadMe();
    console.log("login me :", data)
    setUser(data.user);
  };

  const signup = async (payload) => api.post("/api/v1/auth/signup/", payload);


  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem(DEV_LOGIN_STORAGE_KEY);
    setUser(null);
  };

  const loadMe = async () => {
    try {
      const { data } = await api.get("/api/v1/auth/me/");
      console.log("me data: ", data);
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

  return <AuthContext.Provider value={{ user, login, signup, logout }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
