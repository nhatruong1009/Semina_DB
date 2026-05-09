// AuthContext.js
import React, { createContext, useState } from 'react';
import { authAPI } from './api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Initialize state from localStorage
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [accessToken, setAccessToken] = useState(localStorage.getItem('token'));

  // Login: persist user and tokens
  const login = (userData, token, refreshToken) => {
    setUser(userData);
    setAccessToken(token);

    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', token);
    localStorage.setItem('refreshToken', refreshToken);
  };

  // Refresh: request new access token using refresh token
  const refresh = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    const savedUser = localStorage.getItem('user');

    if (!refreshToken || !savedUser) return logout();

    const parsedUser = JSON.parse(savedUser);
    const res = await authAPI.refresh(parsedUser.id, refreshToken);

    setAccessToken(res.data.token);
    localStorage.setItem('token', res.data.token);

    // If backend rotates refresh tokens, update it here too:
    if (res.data.refreshToken) {
      localStorage.setItem('refreshToken', res.data.refreshToken);
    }
  };

  // Logout: invalidate refresh token server-side and clear local state
  const logout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    const savedUser = localStorage.getItem('user');

    if (refreshToken && savedUser) {
      const parsedUser = JSON.parse(savedUser);
      await authAPI.logout(parsedUser.id, refreshToken);
    }

    setUser(null);
    setAccessToken(null);

    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
  };

  return (
    <AuthContext.Provider value={{ user, accessToken, login, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
