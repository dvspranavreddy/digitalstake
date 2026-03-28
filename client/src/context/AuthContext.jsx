import { createContext, useContext, useState, useEffect } from 'react';
import { authService, subscriptionService } from '../services/endpoints';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);

  const fetchSubscriptionStatus = async () => {
    try {
      const res = await subscriptionService.getStatus();
      setHasActiveSubscription(res.data?.status === 'active');
    } catch {
      setHasActiveSubscription(false);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const { data } = await authService.getProfile();
          setUser(data);
          await fetchSubscriptionStatus();
        } catch {
          logout();
        }
      }
      setLoading(false);
    };
    initAuth();
  }, [token]);

  const login = async (credentials) => {
    const { data } = await authService.login(credentials);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    await fetchSubscriptionStatus();
    return data;
  };

  const register = async (userData) => {
    const { data } = await authService.register(userData);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    setHasActiveSubscription(false);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setHasActiveSubscription(false);
  };

  const updateUser = (updatedFields) => {
    const newUser = { ...user, ...updatedFields };
    setUser(newUser);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  const refreshSubscription = fetchSubscriptionStatus;
  const isAdmin = user?.role === 'admin';
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateUser, isAdmin, isAuthenticated, hasActiveSubscription, refreshSubscription }}>
      {children}
    </AuthContext.Provider>
  );
};

