import { useState, useCallback } from 'react';
import { DEMO_USERS } from '../types/auth';

export function useAuth() {
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    user: null
  });

  const login = useCallback(async (username, password) => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const userRecord = DEMO_USERS[username.toLowerCase()];
    
    if (!userRecord || userRecord.password !== password) {
      return { success: false, error: 'Invalid username or password' };
    }

    setAuthState({
      isAuthenticated: true,
      user: userRecord.user
    });

    return { success: true };
  }, []);

  const loginWithQueueNumber = useCallback(async (queueNumber, patients) => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Find patient with matching queue number
    const patient = patients.find(p => p.id === queueNumber && p.isActive);
    
    if (!patient) {
      return { success: false, error: 'Queue number not found or inactive' };
    }

    // Create a temporary user for the patient
    const patientUser = {
      id: patient.id,
      username: patient.id,
      role: 'patient',
      name: patient.name || 'Patient',
      queueNumber: patient.id
    };

    setAuthState({
      isAuthenticated: true,
      user: patientUser
    });

    return { success: true };
  }, []);

  const logout = useCallback(() => {
    setAuthState({
      isAuthenticated: false,
      user: null
    });
  }, []);

  const hasRole = useCallback((role) => {
    return authState.user?.role === role;
  }, [authState.user]);

  const canAccessRole = useCallback((systemRole) => {
    if (!authState.user) return false;

    const rolePermissions = {
      patient: ['kiosk'],
      nurse: ['triage', 'registration'],
      doctor: ['doctor'],
      ed_manager: ['manager', 'dashboard']
    };

    return rolePermissions[authState.user.role]?.includes(systemRole) || false;
  }, [authState.user]);

  return {
    ...authState,
    login,
    loginWithQueueNumber,
    logout,
    hasRole,
    canAccessRole
  };
}