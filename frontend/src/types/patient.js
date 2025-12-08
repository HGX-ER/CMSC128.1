// Patient-related constants and helper functions

// Valid patient stages
export const PATIENT_STAGES = [
  'kiosk',
  'waiting_triage',
  'triage',
  'waiting_registration',
  'registration',
  'waiting_doctor',
  'consultation',
  'waiting_admission',
  'waiting_observation',
  'waiting_discharge',
  'admission_orders',
  'awaiting_non_icu',
  'awaiting_icu',
  'discharge_documents',
  'awaiting_departure',
  'departed'
];

// Valid disposition options
export const DISPOSITION_OPTIONS = [
  'Admission Non-ICU',
  'Admission ICU',
  'Observation',
  'Discharge'
];

// Format machine disposition codes to human-friendly labels
export const formatDisposition = (disp) => {
  if (!disp) return '';
  const map = {
    in_observation: 'In Observation',
    observation: 'Observation',
    admitted_non_icu: 'Admitted (Non-ICU)',
    admitted_icu: 'Admitted (ICU)',
    discharge: 'Discharge',
    discharged: 'Discharged',
    admission: 'Admission'
  };
  if (map[disp]) return map[disp];
  // fallback: replace underscores and capitalize words
  return disp
    .toString()
    .replace(/_/g, ' ')
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
};

// Valid ESI levels
export const ESI_LEVELS = [1, 2, 3, 4, 5];

// Valid satisfaction ratings
export const SATISFACTION_RATINGS = [1, 2, 3, 4, 5];

// Helper function to create a new patient
export const createNewPatient = (id, arrivalTime = new Date()) => ({
  id,
  arrivalTime,
  currentStage: 'kiosk',
  stageHistory: [{
    stage: 'kiosk',
    startTime: arrivalTime
  }],
  isActive: true,
  isRegistered: false
});

// Helper function to create stage history entry
export const createStageHistoryEntry = (stage, startTime = new Date()) => ({
  stage,
  startTime
});

// Helper function to create satisfaction feedback
export const createSatisfactionFeedback = (rating, comment = '', submittedAt = new Date()) => ({
  rating,
  comment,
  submittedAt
});