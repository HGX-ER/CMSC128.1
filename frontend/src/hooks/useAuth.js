// frontend/src/hooks/useAuth.js
import { useState, useMemo } from 'react';
import api from '../lib/api';

export function useAuth() {
  const [user, setUser] = useState(null);
  const isAuthenticated = !!user;

  // STAFF login → POST /login
  const login = async (username, password) => {
    try {
      const { data } = await api.post('/login', { username, password });
      if (!data.success) return { success: false, error: data.message || 'Invalid credentials' };
      setUser(data.user);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.response?.data?.message || 'Login failed' };
    }
  };

  // PATIENT login via queue number → GET /patient/status/:queue
  const loginWithQueueNumber = async (queueNumber) => {
    try {
      await api.get(`/patient/status/${encodeURIComponent(queueNumber)}`);
      setUser({ username: queueNumber, role: 'patient', queueNumber });
      return { success: true };
    } catch {
      return { success: false, error: 'Queue number not found' };
    }
  };

  const logout = () => setUser(null);

  return useMemo(
    () => ({ isAuthenticated, user, login, loginWithQueueNumber, logout }),
    [isAuthenticated, user]
  );
}
