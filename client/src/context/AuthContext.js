import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../api/axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
  const res = await authAPI.post('/auth/login', { email, password });
  localStorage.setItem('token', res.data.accessToken);
  localStorage.setItem('refreshToken', res.data.refreshToken);
  localStorage.setItem('user', JSON.stringify(res.data.user));
  setUser(res.data.user);
  return res.data.user;
};

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
