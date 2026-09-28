import { createContext, useContext, useState, useCallback } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('courtside_user');
    if (!raw) return null;
    const storedUser = JSON.parse(raw);
    if (storedUser.role === 'Coordinator') {
      localStorage.removeItem('courtside_token');
      localStorage.removeItem('courtside_user');
      return null;
    }
    return storedUser;
  });

  const login = useCallback(async (email, password, role) => {
    const res = await api.post('/auth/login', { email, password, role });
    localStorage.setItem('courtside_token', res.data.token);
    localStorage.setItem('courtside_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('courtside_token');
    localStorage.removeItem('courtside_user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
