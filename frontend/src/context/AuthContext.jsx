/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from "react";
import api from "../utils/api";
import { setToken, getToken, removeToken, isValidToken } from "../utils/token";

export const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialize user from token on mount only
    const token = getToken();
    if (isValidToken(token)) {
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const u = {
          role: payload.role,
          name: payload.name || payload.email || payload.employeeId || null,
          email: payload.email,
          tenantId: payload.tenantId,
          employeeId: payload.employeeId,
          id: payload.id || payload._id,
        };
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setUser(u);
      } catch (e) {
        console.error('Token parse error:', e);
        removeToken();
        setUser(null);
      }
    } else {
      removeToken();
      setUser(null);
    }
    setIsInitialized(true);
  }, []);

  async function login(email, password) {
    try {
      const res = await api.post("/auth/login", { email, password });

      const token = res.data.token;
      setToken(token);

      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      setUser(res.data.user);
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || "Invalid credentials" };
    }
  }

  async function loginHR(companyCode, email, password) {
    try {
      const res = await api.post('/auth/login-hr', { companyCode, email, password });
      const token = res.data.token;
      setToken(token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(res.data.user);
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Invalid credentials' };
    }
  }

  async function loginEmployee(companyCode, employeeId, password) {
    try {
      const res = await api.post('/auth/login-employee', { companyCode, employeeId, password });
      const token = res.data.token;
      setToken(token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(res.data.user);
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Invalid credentials' };
    }
  }

  function logout() {
    removeToken();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isInitialized, login, loginHR, loginEmployee, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
