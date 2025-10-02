import { useReducer } from 'react';

function patientReducer(state, action) {
  switch (action.type) {
    case 'ADD_PATIENT':
      return {
        ...state,
        patients: [...state.patients, action.payload]
      };
    
    case 'UPDATE_PATIENT':
      return {
        ...state,
        patients: state.patients.map(patient => 
          patient.id === action.payload.id 
            ? { ...patient, ...action.payload.updates }
            : patient
        )
      };
    
    case 'MOVE_PATIENT_TO_STAGE':
      return {
        ...state,
        patients: state.patients.map(patient => {
          if (patient.id === action.payload.id) {
            const now = new Date();
            const updatedHistory = [...patient.stageHistory];
            
            // End current stage
            if (updatedHistory.length > 0) {
              updatedHistory[updatedHistory.length - 1].endTime = now;
            }
            
            // Start new stage
            updatedHistory.push({
              stage: action.payload.stage,
              startTime: now,
            });
            
            return {
              ...patient,
              currentStage: action.payload.stage,
              stageHistory: updatedHistory
            };
          }
          return patient;
        })
      };
    
    case 'SELECT_PATIENT':
      return {
        ...state,
        selectedPatientId: action.payload
      };
    
    case 'REMOVE_PATIENT':
      return {
        ...state,
        patients: state.patients.filter(p => p.id !== action.payload),
        selectedPatientId: state.selectedPatientId === action.payload ? null : state.selectedPatientId
      };
    
    case 'ADD_SATISFACTION_FEEDBACK':
      return {
        ...state,
        patients: state.patients.map(patient => {
          if (patient.id === action.payload.id) {
            const updatedHistory = [...patient.stageHistory];
            if (updatedHistory[action.payload.stageIndex]) {
              updatedHistory[action.payload.stageIndex].satisfaction = action.payload.feedback;
            }
            return {
              ...patient,
              stageHistory: updatedHistory
            };
          }
          return patient;
        })
      };
    
    case 'ADJUST_STAGE_TIME':
      return {
        ...state,
        patients: state.patients.map(patient => {
          if (patient.id === action.payload.id) {
            const updatedHistory = [...patient.stageHistory];
            if (updatedHistory[action.payload.stageIndex]) {
              updatedHistory[action.payload.stageIndex].startTime = action.payload.newStartTime;
            }
            return {
              ...patient,
              stageHistory: updatedHistory
            };
          }
          return patient;
        })
      };
    
    default:
      return state;
  }
}

const createSamplePatients = () => {
  const now = new Date();
  const patients = [];

  // Sample patient 1 - Waiting for doctor (assigned to dr.smith)
  patients.push({
    id: 'ED20241223140001',
    arrivalTime: new Date(now.getTime() - 45 * 60 * 1000), // 45 minutes ago
    name: 'Sarah Johnson',
    age: '34',
    dateOfBirth: '1990-03-15',
    sex: 'Female',
    chiefComplaint: 'Severe chest pain radiating to left arm, started 2 hours ago',
    esiLevel: 2,
    currentStage: 'waiting_doctor',
    assignedDoctor: 'dr.smith',
    assignedNurse: 'nurse.williams',
    stageHistory: [
      { 
        stage: 'kiosk', 
        startTime: new Date(now.getTime() - 45 * 60 * 1000), 
        endTime: new Date(now.getTime() - 44 * 60 * 1000),
        satisfaction: {
          rating: 4,
          comment: 'Quick and easy check-in process',
          submittedAt: new Date(now.getTime() - 43 * 60 * 1000)
        }
      },
      { 
        stage: 'waiting_triage', 
        startTime: new Date(now.getTime() - 44 * 60 * 1000), 
        endTime: new Date(now.getTime() - 40 * 60 * 1000),
        satisfaction: {
          rating: 3,
          comment: 'The wait was reasonable',
          submittedAt: new Date(now.getTime() - 39 * 60 * 1000)
        }
      },
      { 
        stage: 'triage', 
        startTime: new Date(now.getTime() - 40 * 60 * 1000), 
        endTime: new Date(now.getTime() - 35 * 60 * 1000),
        satisfaction: {
          rating: 5,
          comment: 'Nurse was very professional and thorough',
          submittedAt: new Date(now.getTime() - 34 * 60 * 1000)
        }
      },
      { stage: 'waiting_registration', startTime: new Date(now.getTime() - 35 * 60 * 1000), endTime: new Date(now.getTime() - 25 * 60 * 1000) },
      { stage: 'registration', startTime: new Date(now.getTime() - 25 * 60 * 1000), endTime: new Date(now.getTime() - 15 * 60 * 1000) },
      { stage: 'waiting_doctor', startTime: new Date(now.getTime() - 15 * 60 * 1000) }
    ],
    isActive: true
  });

  // Sample patient 2 - Waiting for doctor (assigned to dr.johnson)
  patients.push({
    id: 'ED20241223141002',
    arrivalTime: new Date(now.getTime() - 30 * 60 * 1000), // 30 minutes ago
    name: 'Michael Chen',
    age: '28',
    dateOfBirth: '1996-08-22',
    sex: 'Male',
    chiefComplaint: 'Persistent fever and cough for 3 days, difficulty breathing',
    esiLevel: 3,
    currentStage: 'waiting_doctor',
    assignedDoctor: 'dr.johnson',
    assignedNurse: 'nurse.thompson',
    stageHistory: [
      { stage: 'kiosk', startTime: new Date(now.getTime() - 30 * 60 * 1000), endTime: new Date(now.getTime() - 29 * 60 * 1000) },
      { stage: 'waiting_triage', startTime: new Date(now.getTime() - 29 * 60 * 1000), endTime: new Date(now.getTime() - 25 * 60 * 1000) },
      { stage: 'triage', startTime: new Date(now.getTime() - 25 * 60 * 1000), endTime: new Date(now.getTime() - 20 * 60 * 1000) },
      { stage: 'waiting_registration', startTime: new Date(now.getTime() - 20 * 60 * 1000), endTime: new Date(now.getTime() - 15 * 60 * 1000) },
      { stage: 'registration', startTime: new Date(now.getTime() - 15 * 60 * 1000), endTime: new Date(now.getTime() - 10 * 60 * 1000) },
      { stage: 'waiting_doctor', startTime: new Date(now.getTime() - 10 * 60 * 1000) }
    ],
    isActive: true
  });

  // Sample patient 3 - Another for dr.smith
  patients.push({
    id: 'ED20241223142003',
    arrivalTime: new Date(now.getTime() - 20 * 60 * 1000), // 20 minutes ago
    name: 'Emma Rodriguez',
    age: '67',
    dateOfBirth: '1957-11-03',
    sex: 'Female',
    chiefComplaint: 'Fall at home, possible hip fracture, unable to bear weight',
    esiLevel: 3,
    currentStage: 'waiting_doctor',
    assignedDoctor: 'dr.smith',
    assignedNurse: 'nurse.davis',
    stageHistory: [
      { stage: 'kiosk', startTime: new Date(now.getTime() - 20 * 60 * 1000), endTime: new Date(now.getTime() - 19 * 60 * 1000) },
      { stage: 'waiting_triage', startTime: new Date(now.getTime() - 19 * 60 * 1000), endTime: new Date(now.getTime() - 17 * 60 * 1000) },
      { stage: 'triage', startTime: new Date(now.getTime() - 17 * 60 * 1000), endTime: new Date(now.getTime() - 15 * 60 * 1000) },
      { stage: 'waiting_registration', startTime: new Date(now.getTime() - 15 * 60 * 1000), endTime: new Date(now.getTime() - 10 * 60 * 1000) },
      { stage: 'registration', startTime: new Date(now.getTime() - 10 * 60 * 1000), endTime: new Date(now.getTime() - 5 * 60 * 1000) },
      { stage: 'waiting_doctor', startTime: new Date(now.getTime() - 5 * 60 * 1000) }
    ],
    isActive: true
  });

  return patients;
};

export function usePatientManagement() {
  const [state, dispatch] = useReducer(patientReducer, {
    patients: createSamplePatients(),
    selectedPatientId: null
  });

  const generatePatientId = () => {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `ED${dateStr}${timeStr}${random}`;
  };

  const addPatient = () => {
    const newPatient = {
      id: generatePatientId(),
      arrivalTime: new Date(),
      currentStage: 'kiosk',
      stageHistory: [{
        stage: 'kiosk',
        startTime: new Date(),
      }],
      isActive: true
    };
    
    dispatch({ type: 'ADD_PATIENT', payload: newPatient });
    return newPatient.id;
  };

  const updatePatient = (id, updates) => {
    dispatch({ type: 'UPDATE_PATIENT', payload: { id, updates } });
  };

  const movePatientToStage = (id, stage) => {
    dispatch({ type: 'MOVE_PATIENT_TO_STAGE', payload: { id, stage } });
  };

  const selectPatient = (id) => {
    dispatch({ type: 'SELECT_PATIENT', payload: id });
  };

  const removePatient = (id) => {
    dispatch({ type: 'REMOVE_PATIENT', payload: id });
  };

  const getPatientsByStage = (stage) => {
    return state.patients.filter(p => p.currentStage === stage && p.isActive);
  };

  const getPatientStageTime = (patient, stage) => {
    const targetStage = stage || patient.currentStage;
    const stageEntry = patient.stageHistory.find(h => h.stage === targetStage);
    if (!stageEntry) return 0;
    
    const endTime = stageEntry.endTime || new Date();
    return Math.floor((endTime.getTime() - stageEntry.startTime.getTime()) / 1000 / 60); // minutes
  };

  const getTotalPatientTime = (patient) => {
    return Math.floor((new Date().getTime() - patient.arrivalTime.getTime()) / 1000 / 60); // minutes
  };

  const getCurrentStageTime = (patient) => {
    const currentStageEntry = patient.stageHistory.find(h => h.stage === patient.currentStage && !h.endTime);
    if (!currentStageEntry) return 0;
    
    return Math.floor((new Date().getTime() - currentStageEntry.startTime.getTime()) / 1000 / 60); // minutes
  };

  const addDemoPatient = (doctorUsername, name, age, chiefComplaint, esiLevel) => {
    const now = new Date();
    const minutesAgo = Math.floor(Math.random() * 60) + 10; // 10-70 minutes ago
    
    const newPatient = {
      id: generatePatientId(),
      arrivalTime: new Date(now.getTime() - minutesAgo * 60 * 1000),
      name,
      age: age.toString(),
      dateOfBirth: `${2024 - age}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
      sex: Math.random() > 0.5 ? 'Male' : 'Female',
      chiefComplaint,
      esiLevel,
      currentStage: 'waiting_doctor',
      assignedDoctor: doctorUsername,
      assignedNurse: 'nurse.wilson', // Default nurse for demo patients
      stageHistory: [
        { stage: 'kiosk', startTime: new Date(now.getTime() - minutesAgo * 60 * 1000), endTime: new Date(now.getTime() - (minutesAgo - 1) * 60 * 1000) },
        { stage: 'waiting_triage', startTime: new Date(now.getTime() - (minutesAgo - 1) * 60 * 1000), endTime: new Date(now.getTime() - (minutesAgo - 5) * 60 * 1000) },
        { stage: 'triage', startTime: new Date(now.getTime() - (minutesAgo - 5) * 60 * 1000), endTime: new Date(now.getTime() - (minutesAgo - 10) * 60 * 1000) },
        { stage: 'waiting_registration', startTime: new Date(now.getTime() - (minutesAgo - 10) * 60 * 1000), endTime: new Date(now.getTime() - (minutesAgo - 20) * 60 * 1000) },
        { stage: 'registration', startTime: new Date(now.getTime() - (minutesAgo - 20) * 60 * 1000), endTime: new Date(now.getTime() - (minutesAgo - 30) * 60 * 1000) },
        { stage: 'waiting_doctor', startTime: new Date(now.getTime() - (minutesAgo - 30) * 60 * 1000) }
      ],
      isActive: true
    };
    
    dispatch({ type: 'ADD_PATIENT', payload: newPatient });
    return newPatient.id;
  };

  const addSatisfactionFeedback = (patientId, stageIndex, feedback) => {
    dispatch({ type: 'ADD_SATISFACTION_FEEDBACK', payload: { id: patientId, stageIndex, feedback } });
  };

  const adjustStageTime = (patientId, stageIndex, newStartTime) => {
    dispatch({ type: 'ADJUST_STAGE_TIME', payload: { id: patientId, stageIndex, newStartTime } });
  };

  return {
    patients: state.patients,
    selectedPatientId: state.selectedPatientId,
    addPatient,
    addDemoPatient,
    updatePatient,
    movePatientToStage,
    selectPatient,
    removePatient,
    getPatientsByStage,
    getPatientStageTime,
    getTotalPatientTime,
    getCurrentStageTime,
    addSatisfactionFeedback,
    adjustStageTime
  };
}