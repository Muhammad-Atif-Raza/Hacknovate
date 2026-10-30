import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(authService.getCurrentUser());
  const [token, setToken] = useState(authService.getToken());
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);

  const isAuthenticated = !!token && !!user;
  const isAdmin = user?.role === 'admin';
  const isStudent = user?.role === 'student';

  const fetchNotifications = async () => {
    if (!isAuthenticated) return;
    try {
      const data = await authService.getNotifications();
      setNotifications(data || []);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = authService.getToken();
      if (storedToken) {
        try {
          const freshUser = await authService.getMe();
          setUser(freshUser);
          localStorage.setItem('cph_user', JSON.stringify(freshUser));
          await fetchNotifications();
        } catch (err) {
          console.warn('Session expired or invalid token');
          authService.logout();
          setUser(null);
          setToken(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  // Poll notifications every 30 seconds
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const login = async (email, password) => {
    const data = await authService.login(email, password);
    setToken(data.access_token);
    setUser(data.user);
    await fetchNotifications();
    return data.user;
  };

  const register = async (userData) => {
    const data = await authService.register(userData);
    setToken(data.access_token);
    setUser(data.user);
    await fetchNotifications();
    return data.user;
  };

  const logout = () => {
    authService.logout();
    setToken(null);
    setUser(null);
    setNotifications([]);
  };

  const refreshUser = async () => {
    try {
      const fresh = await authService.getMe();
      setUser(fresh);
      localStorage.setItem('cph_user', JSON.stringify(fresh));
    } catch (err) {
      console.error(err);
    }
  };

  const markNotificationRead = async (notifId) => {
    try {
      await authService.markNotificationRead(notifId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      await authService.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated,
        isAdmin,
        isStudent,
        notifications,
        unreadCount,
        login,
        register,
        logout,
        refreshUser,
        fetchNotifications,
        markNotificationRead,
        markAllNotificationsRead,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
