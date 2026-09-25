import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [qr, setQr] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const data = await authService.getMe();
      setUser(data.user);
      setQr(data.qr);
      return data;
    } catch (err) {
      setUser(null);
      setQr(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (credentials) => {
    const data = await authService.login(credentials);
    if (data.token) {
      localStorage.setItem('resqtag_token', data.token);
    }
    await refreshUser();
    return data;
  };

  const register = async (userData) => {
    const data = await authService.register(userData);
    if (data.token) {
      localStorage.setItem('resqtag_token', data.token);
    }
    await refreshUser();
    return data;
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      localStorage.removeItem('resqtag_token');
      setUser(null);
      setQr(null);
    }
  };

  const value = {
    user,
    qr,
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    login,
    register,
    logout,
    refreshUser,
    setQr
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
