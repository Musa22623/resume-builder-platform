import { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api/client";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const login = async (username, password) => {
    const { data } = await api.post("/api/auth/signin/", { username, password });
    localStorage.setItem("access_token", data.access);
    localStorage.setItem("refresh_token", data.refresh);
    await loadMe();
  };

  const signup = async (payload) => api.post("/api/auth/signup/", payload);

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
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
    if (localStorage.getItem("access_token")) loadMe();
  }, []);

  return <AuthContext.Provider value={{ user, login, signup, logout }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
