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

  const convertStatusToStage = (status) => {
    switch (status) {
      case 'arrived': return 'waiting_triage';
      case 'registered': return 'waiting_doctor';
      case 'triaged': return 'waiting_registration'; // tweak if your flow differs
      case 'roomed': return 'consultation';
      case 'provider_started': return 'consultation';
      case 'dispositioned': return 'disposition';
      case 'departed': return 'departed';
      default: return 'kiosk';
    }
  };

  const loadBoard = useCallback(async () => {
    try {
      const { data } = await api.get('/board');
      const mapped = data.map((row) => ({
        id: row.queue_number,
        name: `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim() || `Patient ${row.queue_number}`,
        esiLevel: row.priority_esi ?? null,
        currentStage: convertStatusToStage(row.status),
        arrivalTime: new Date(Date.now() - (row.waiting_min ?? 0) * 60000),
        stageHistory: [{ stage: 'kiosk', startTime: new Date(Date.now() - (row.waiting_min ?? 0) * 60000) }],
        isActive: row.status !== 'departed',
      }));
      sync(mapped);
      setPatients(mapped);
    } catch {
      // board optional on first load
    }
  }, []);

  useEffect(() => { loadBoard(); }, [loadBoard]);

  // Refresh when the server fires SSE events
  useEventBus((evt) => {
    if (
      evt?.type === 'encounter.created' ||
      evt?.type === 'encounter.registered' ||
      evt?.type === 'encounter.triaged' ||
      evt?.type === 'encounter.departed'
    ) {
      loadBoard();
    }
  });

  const addPatient = useCallback(async () => {
    try {
      const { data } = await api.post('/registration/new', {});
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
      return queue;
    } catch (e) {
      // fallback client-only id if backend route not available
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
  }, [patients]);

  const updatePatient = useCallback((id, patch) => {
    setPatients((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, ...patch } : p));
      sync(next);
      return next;
    });
  }, []);

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
  }, []);

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

  // Expose backend helpers if components want to call directly
  const completeRegistration = useCallback(async (queue_number, registrationData) => {
    await api.post('/registration/complete', { queue_number, ...registrationData });
  }, []);

  const submitTriage = useCallback(async (encounterId, { esi, complaint, vitals }) => {
    await api.post(`/encounters/${encounterId}/triage`, { esi, complaint, vitals });
  }, []);

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
