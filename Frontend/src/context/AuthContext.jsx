/**
 * #25: AuthContext — Manages authentication state (token, role, userData)
 * Extracted from StoreContext to reduce re-renders on auth-only changes.
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const URl = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState('');
  const [role, setRole] = useState(localStorage.getItem('role') || 'customer');
  const [userData, setUserData] = useState(
    JSON.parse(localStorage.getItem('userData')) || null
  );

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('userData');
    localStorage.removeItem('refreshToken');
    setToken('');
    setRole('customer');
    setUserData(null);
  }, []);

  const isTokenExpired = useCallback((tokenString) => {
    if (!tokenString) return true;
    try {
      const base64Url = tokenString.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
      );
      const decoded = JSON.parse(jsonPayload);
      if (!decoded.exp) return false;
      return decoded.exp * 1000 < Date.now() + 30000;
    } catch (e) {
      return true;
    }
  }, []);

  const refreshSession = useCallback(async () => {
    const rt = localStorage.getItem('refreshToken');
    if (!rt) return false;
    try {
      const res = await axios.post(URl + '/api/user/refresh', { refreshToken: rt });
      if (res.data.success) {
        setToken(res.data.token);
        localStorage.setItem('token', res.data.token);
        if (res.data.refreshToken) localStorage.setItem('refreshToken', res.data.refreshToken);
        return res.data.token;
      }
      logout();
      return false;
    } catch {
      logout();
      return false;
    }
  }, [logout]);

  // Axios request interceptor — auto-refresh expired token
  useEffect(() => {
    const id = axios.interceptors.request.use(async (config) => {
      // Prevent infinite recursion loop on token refresh requests
      if (config.url && config.url.includes('/api/user/refresh')) {
        return config;
      }
      let activeToken = localStorage.getItem('token');
      if (activeToken && isTokenExpired(activeToken)) {
        const refreshed = await refreshSession();
        if (refreshed) config.headers.token = refreshed;
      } else if (activeToken) {
        config.headers.token = activeToken;
      }
      return config;
    }, (err) => Promise.reject(err));
    return () => axios.interceptors.request.eject(id);
  }, [isTokenExpired, refreshSession]);

  // Restore session on page load
  useEffect(() => {
    const stored = localStorage.getItem('token');
    if (stored) setToken(stored);
  }, []);

  return (
    <AuthContext.Provider value={{ token, setToken, role, setRole, userData, setUserData, logout, URl }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
