// frontend/src/hooks/usePatientManagement.js

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api from '../lib/api';
import { useEventBus } from './useEventBus';

const now = () => new Date();
const minutesBetween = (a, b) => Math.floor((b.getTime() - a.getTime()) / 60000);

export function usePatientManagement() {
  const [patients, setPatients] = useState([]);
  const byId = useRef(new Map());

  const sync = (list) => {
    byId.current.clear();
    for (const p of list) byId.current.set(p.id, p);
  };

  // Load from /whiteboard endpoint with complete patient data
  const loadBoard = useCallback(async () => {
    try {
      const { data } = await api.get('/api/whiteboard');
      
      console.log('📊 Loaded whiteboard data:', data);
      
      // Filter out any queue numbers canceled locally so they won't appear in the UI
      let filteredData = data;
      try {
        const raw = localStorage.getItem('canceledQueueNumbers');
        const canceled = raw ? JSON.parse(raw) : [];
        if (Array.isArray(canceled) && canceled.length) {
          filteredData = data.filter((row) => !canceled.includes(row.queue_number));
        }
      } catch (e) {
        console.warn('Failed to read canceledQueueNumbers from localStorage', e);
      }
      
      const mapped = filteredData.map((row) => ({
        id: row.queue_number,
        encounterId: row.encounter_id,
        patientId: row.patient_id,
        
        // Patient demographics
        name: row.full_name || row.name || `Patient ${row.queue_number}`,
        age: row.age,
        sex: row.sex,
        dateOfBirth: row.dateOfBirth ? new Date(row.dateOfBirth) : null,
        insurance_info: row.insurance_info || null,
        address: row.address || null,
        
        //Use currentStage directly from backend
        currentStage: row.currentStage,
        
        // ESI and assignments
        esiLevel: row.esiLevel ?? null,
        assignedDoctor: row.assignedDoctor,
        assignedNurse: row.assignedNurse,
        
        // Timestamps
        arrivalTime: row.arrivalTime ? new Date(row.arrivalTime) : new Date(),
        triageTime: row.triageTime ? new Date(row.triageTime) : null,
        roomTime: row.roomTime ? new Date(row.roomTime) : null,
        providerStartTime: row.providerStartTime ? new Date(row.providerStartTime) : null,
        
        // Clinical data
        chiefComplaint: row.chiefComplaint,
        diagnosis: row.diagnosis,
        disposition: row.disposition,
        
        // Stage history for time tracking
        stageHistory: [{
          stage: row.currentStage,
          startTime: row.arrivalTime ? new Date(row.arrivalTime) : new Date()
        }],
        
        // Status flags
        isActive: row.isActive !== false,
        isRegistered: row.full_name && row.full_name !== 'New Patient',
      }));
      
      sync(mapped);
      setPatients(mapped);
    } catch (error) {
      console.error('❌ Error loading whiteboard:', error);
    }
  }, []);

  //  Initial load + auto-refresh every 5 seconds
  useEffect(() => { 
    loadBoard();
    
    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing whiteboard...');
      loadBoard();
    }, 5000); // Refresh every 5 seconds
    
    return () => clearInterval(interval);
  }, [loadBoard]);

  // Refresh when the server fires SSE events
  useEventBus((evt) => {
    console.log('🔔 SSE Event received:', evt?.type);
    
    if (
      evt?.type === 'encounter.created' ||
      evt?.type === 'encounter.registered' ||
      evt?.type === 'encounter.triaged' ||
      evt?.type === 'encounter.departed' ||
      evt?.type === 'patient_registered' ||
      evt?.type === 'queue_generated' ||
      evt?.type === 'stage_change' ||
      evt?.type === 'patient_roomed' ||
      evt?.type === 'provider_started' ||
      evt?.type === 'status_updated'
    ) {
      console.log('🔄 Reloading due to event:', evt?.type);
      loadBoard();
    }
  });

  const addPatient = useCallback(async () => {
    try {
      const { data } = await api.post('/api/registration/new', {});
      const queue = data.queueNumber;
      
      const newP = {
        id: queue,
        name: '',
        esiLevel: null,
        currentStage: 'kiosk',
        arrivalTime: now(),
        stageHistory: [{ stage: 'kiosk', startTime: now() }],
        isActive: true,
      };
      
      const updated = [newP, ...patients];
      sync(updated);
      setPatients(updated);
      
      // Reload to get accurate data from backend
      setTimeout(loadBoard, 300);
      
      return queue;
    } catch (e) {
      const queue = `ED${new Date().toISOString().replace(/\D/g, '').slice(2,12)}${Math.floor(Math.random()*90+10)}`;
      
      const newP = {
        id: queue,
        name: '',
        esiLevel: null,
        currentStage: 'kiosk',
        arrivalTime: now(),
        stageHistory: [{ stage: 'kiosk', startTime: now() }],
        isActive: true,
      };
      
      const updated = [newP, ...patients];
      sync(updated);
      setPatients(updated);
      return queue;
    }
  }, [patients, loadBoard]);

  const updatePatient = useCallback((id, patch) => {
    setPatients((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, ...patch } : p));
      sync(next);
      return next;
    });
    
    // Reload after update to sync with backend
    setTimeout(loadBoard, 300);
  }, [loadBoard]);

  const movePatientToStage = useCallback((id, stage) => {
    setPatients((prev) => {
      const next = prev.map((p) => {
        if (p.id !== id) return p;
        
        const hist = [...p.stageHistory];
        if (hist.length && !hist[hist.length - 1].endTime) {
          hist[hist.length - 1] = { ...hist[hist.length - 1], endTime: now() };
        }
        hist.push({ stage, startTime: now() });
        
        return { ...p, currentStage: stage, stageHistory: hist };
      });
      sync(next);
      return next;
    });
    
    // Reload after stage change
    setTimeout(loadBoard, 300);
  }, [loadBoard]);

  const adjustStageTime = useCallback((id, stageIndex, newStartTime) => {
    setPatients((prev) => {
      const next = prev.map((p) => {
        if (p.id !== id) return p;
        
        const hist = [...p.stageHistory];
        if (hist[stageIndex]) hist[stageIndex] = { ...hist[stageIndex], startTime: newStartTime };
        
        return { ...p, stageHistory: hist };
      });
      sync(next);
      return next;
    });
  }, []);

  const removePatient = useCallback((id) => {
    setPatients((prev) => prev.filter((p) => p.id !== id));
    byId.current.delete(id);
  }, []);

  const getTotalPatientTime = useCallback((patient) => {
    const end = now();
    return minutesBetween(patient.arrivalTime, end);
  }, []);

  const getCurrentStageTime = useCallback((patient) => {
    const last = patient.stageHistory[patient.stageHistory.length - 1];
    return minutesBetween(last.startTime, now());
  }, []);

  const getPatientStageTime = useCallback((patient, stage) => {
    if (stage) {
      const rec = patient.stageHistory.find((s) => s.stage === stage);
      if (!rec) return 0;
      const end = rec.endTime ?? now();
      return minutesBetween(rec.startTime, end);
    }
    return getCurrentStageTime(patient);
  }, [getCurrentStageTime]);

  const addSatisfactionFeedback = useCallback((id, stageIndex, feedback) => {
    setPatients((prev) => {
      const next = prev.map((p) => {
        if (p.id !== id) return p;
        
        const hist = [...p.stageHistory];
        if (hist[stageIndex]) {
          hist[stageIndex] = { ...hist[stageIndex], satisfaction: feedback };
        }
        
        return { ...p, stageHistory: hist };
      });
      sync(next);
      return next;
    });
  }, []);

  // Reload after backend operations
  const completeRegistration = useCallback(async (queue_number, registrationData) => {
    await api.put(`/api/registration/patient/${queue_number}`, registrationData);
    setTimeout(loadBoard, 300);
  }, [loadBoard]);

  const submitTriage = useCallback(async (encounterId, { esi, complaint, vitals }) => {
    await api.post(`/api/encounters/${encounterId}/triage`, { esi, complaint, vitals });
    setTimeout(loadBoard, 300);
  }, [loadBoard]);

  return useMemo(() => ({
    patients,
    addPatient,
    updatePatient,
    movePatientToStage,
    adjustStageTime,
    removePatient,
    getTotalPatientTime,
    getCurrentStageTime,
    getPatientStageTime,
    addSatisfactionFeedback,
    completeRegistration,
    submitTriage,
  }), [
    patients, addPatient, updatePatient, movePatientToStage, adjustStageTime, removePatient,
    getTotalPatientTime, getCurrentStageTime, getPatientStageTime, addSatisfactionFeedback,
    completeRegistration, submitTriage,
  ]);
}