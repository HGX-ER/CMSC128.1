import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Textarea } from './ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { StageHistory } from './StageHistory';
import { SatisfactionModal } from './SatisfactionModal';
import { HospitalAnnouncements } from './HospitalAnnouncements';
import { MedicalTrivia } from './MedicalTrivia';
import { HealthTips } from './HealthTips';
import { RelaxationExercises } from './RelaxationExercises';
import { HospitalServices } from './HospitalServices';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs.jsx';
import { Clock, Timer, Heart, Activity, Stethoscope, UserCheck, CheckCircle, MapPin, Loader2, History, Newspaper, Brain, Lightbulb, Wind, Building, Bell, MessageCircle, Send, Star } from 'lucide-react';

export function PatientInterface({ patients, currentPatientId, getTotalTime, getCurrentStageTime, onAddSatisfactionFeedback, onAddRealtimeFeedback }) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [satisfactionModal, setSatisfactionModal] = useState(null);
  const [realtimeComments, setRealtimeComments] = useState([]);
  const [patientComment, setPatientComment] = useState('');
  const [submittedComments, setSubmittedComments] = useState([]);
  const [backendPatientData, setBackendPatientData] = useState(null);
  const [commentSatisfaction, setCommentSatisfaction] = useState(0);
  const [commentHoveredStar, setCommentHoveredStar] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Clipboard fallback helper function
  const copyToClipboard = (text) => {
    // Fallback for browsers that block clipboard API
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      textArea.remove();
      return true;
    } catch (err) {
      console.error('Failed to copy', err);
      textArea.remove();
      return false;
    }
  };
  
  // Try to get patient from backend first, fallback to local state
  const patient = backendPatientData || patients.find(p => p.id === currentPatientId);

  // Staff profile pictures and information
  const staffProfiles = {
    'dr.smith': { 
      name: 'Dr. Sarah Smith',
      photo: 'https://images.unsplash.com/photo-1719610894782-7b376085e200?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmZW1hbGUlMjBkb2N0b3IlMjBwb3J0cmFpdHxlbnwxfHx8fDE3NjA1ODg4OTh8MA&ixlib=rb-4.1.0&q=80&w=1080',
      room: '201',
      building: 'Main Hospital Building',
      floor: '2nd Floor'
    },
    'dr.johnson': { 
      name: 'Dr. Michael Johnson',
      photo: 'https://images.unsplash.com/photo-1615177393114-bd2917a4f74a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtYWxlJTIwZG9jdG9yJTIwcG9ydHJhaXR8ZW58MXx8fHwxNzYwNjA5MDI5fDA&ixlib=rb-4.1.0&q=80&w=1080',
      room: '203',
      building: 'Main Hospital Building',
      floor: '2nd Floor'
    },
    'dr.davis': { 
      name: 'Dr. Emily Davis',
      photo: 'https://images.unsplash.com/photo-1612523138351-4643808db8f3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkb2N0b3IlMjBwcm9mZXNzaW9uYWwlMjBwb3J0cmFpdHxlbnwxfHx8fDE3NjA2MDEwNDZ8MA&ixlib=rb-4.1.0&q=80&w=1080',
      room: '205',
      building: 'Pediatric Wing',
      floor: '2nd Floor'
    },
    'dr.brown': { 
      name: 'Dr. James Brown',
      photo: 'https://images.unsplash.com/photo-1615177393114-bd2917a4f74a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtYWxlJTIwZG9jdG9yJTIwcG9ydHJhaXR8ZW58MXx8fHwxNzYwNjA5MDI5fDA&ixlib=rb-4.1.0&q=80&w=1080',
      room: '207',
      building: 'Trauma Center',
      floor: '2nd Floor'
    },
    'nurse.williams': { 
      name: 'Nurse Jennifer Williams',
      photo: 'https://images.unsplash.com/photo-1758204054877-fb1c7ba85ea1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxudXJzZSUyMHByb2Zlc3Npb25hbCUyMHBvcnRyYWl0fGVufDF8fHx8MTc2MDY2ODE5Nnww&ixlib=rb-4.1.0&q=80&w=1080'
    },
    'nurse.thompson': { 
      name: 'Nurse Robert Thompson',
      photo: 'https://images.unsplash.com/photo-1758204054877-fb1c7ba85ea1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxudXJzZSUyMHByb2Zlc3Npb25hbCUyMHBvcnRyYWl0fGVufDF8fHx8MTc2MDY2ODE5Nnww&ixlib=rb-4.1.0&q=80&w=1080'
    },
    'nurse.davis': { 
      name: 'Nurse Lisa Davis',
      photo: 'https://images.unsplash.com/photo-1758204054877-fb1c7ba85ea1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxudXJzZSUyMHByb2Zlc3Npb25hbCUyMHBvcnRyYWl0fGVufDF8fHx8MTc2MDY2ODE5Nnww&ixlib=rb-4.1.0&q=80&w=1080'
    },
    'nurse.wilson': { 
      name: 'Nurse Mark Wilson',
      photo: 'https://images.unsplash.com/photo-1758204054877-fb1c7ba85ea1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxudXJzZSUyMHByb2Zlc3Npb25hbCUyMHBvcnRyYWl0fGVufDF8fHx8MTc2MDY2ODE5Nnww&ixlib=rb-4.1.0&q=80&w=1080'
    },
    'nurse.martinez': { 
      name: 'Nurse Maria Martinez',
      photo: 'https://images.unsplash.com/photo-1758204054877-fb1c7ba85ea1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxudXJzZSUyMHByb2Zlc3Npb25hbCUyMHBvcnRyYWl0fGVufDF8fHx8MTc2MDY2ODE5Nnww&ixlib=rb-4.1.0&q=80&w=1080'
    }
  };
  
  // Fetch patient data from backend
  useEffect(() => {
    const fetchPatientStatus = async () => {
      if (!currentPatientId) return;
      
      try {
        const response = await fetch(`/api/patient/status/${currentPatientId}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('Queue number not found in the system');
            setIsLoading(false);
            return;
          }
          throw new Error('Failed to fetch patient status');
        }
        
        const data = await response.json();
        
        // Map backend status to frontend currentStage
        const statusToStageMap = {
          'arrived': 'kiosk',
          'waiting_for_triage': 'waiting_triage',
          'in_triage': 'triage',
          'waiting_for_registration': 'waiting_registration',
          'in_registration': 'registration',
          'waiting_for_provider': 'waiting_doctor',
          'with_provider': 'consultation',
          'waiting_for_admission': 'waiting_admission',
          'waiting_for_observation': 'waiting_observation',
          'waiting_for_discharge': 'waiting_discharge',
          'admission_in_progress': 'admission_orders',
          'awaiting_bed': 'awaiting_non_icu',
          'awaiting_icu_bed': 'awaiting_icu',
          'discharge_in_progress': 'discharge_documents',
          'ready_to_depart': 'awaiting_departure',
          'departed': 'departed'
        };
        
        // Transform backend data to match frontend format
        const transformedPatient = {
          id: data.queue_number,
          name: data.patient.full_name,
          queueNumber: data.queue_number,
          esiLevel: data.timestamps?.triaged ? parseInt(data.priority_esi) : null,
          currentStage: statusToStageMap[data.status] || data.status,
          arrivalTime: data.timestamps.arrived ? new Date(data.timestamps.arrived) : new Date(),
          isActive: data.status !== 'departed',
          stageHistory: data.events?.map(event => ({
            stage: statusToStageMap[event.type] || event.type,
            startTime: new Date(event.at),
            endTime: null,
            payload: event.payload
          })) || [],
          // Additional fields from backend
          chiefComplaint: data.timestamps?.roomed ? 'Registered' : null,
          assignedDoctor: data.timestamps?.provider_started ? 'dr.smith' : null,
          assignedNurse: data.timestamps?.triaged ? 'nurse.williams' : null,
          sex: data.patient.sex,
          dob: data.patient.dob,
          disposition: data.timestamps.dispositioned,
        };
        
        setBackendPatientData(transformedPatient);
        setError(null);
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching patient status:', err);
        // Fallback to local state if backend fails
        setError('Using offline data - updates may be delayed');
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchPatientStatus();

    // Poll every 5 seconds for updates
    const pollInterval = setInterval(fetchPatientStatus, 5000);

    return () => clearInterval(pollInterval);
  }, [currentPatientId]);

  // Update timer every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // Real-time comment system based on current stage
  useEffect(() => {
    if (!patient) return;
    
    const getStageComments = (stage) => {
      const comments = {
        kiosk: [
          { time: new Date(), message: "Thank you for checking in. Please have a seat in the waiting area." },
          { time: new Date(), message: "Your information has been recorded successfully." }
        ],
        waiting_triage: [
          { time: new Date(), message: "You're in the queue for triage assessment." },
          { time: new Date(), message: "A triage nurse will call you shortly to assess your condition." }
        ],
        triage: [
          { time: new Date(), message: "Triage nurse is assessing your vital signs and symptoms." },
          { time: new Date(), message: "Your priority level is being determined based on your condition." }
        ],
        waiting_registration: [
          { time: new Date(), message: "Please proceed to the registration desk when called." },
          { time: new Date(), message: "Registration staff will collect your demographic information." }
        ],
        registration: [
          { time: new Date(), message: "Registration staff is processing your information." },
          { time: new Date(), message: "Your healthcare team is being assigned." }
        ],
        waiting_doctor: [
          { time: new Date(), message: "You're in the queue to see the doctor." },
          { time: new Date(), message: "The doctor will see you based on medical priority." },
          { time: new Date(), message: "Please remain in the designated waiting area." }
        ],
        consultation: [
          { time: new Date(), message: "The doctor is now seeing you." },
          { time: new Date(), message: "Your examination and consultation is in progress." }
        ],
        waiting_admission: [
          { time: new Date(), message: "Admission arrangements are being made." },
          { time: new Date(), message: "Hospital bed availability is being checked." }
        ],
        waiting_observation: [
          { time: new Date(), message: "Observation unit placement is being arranged." },
          { time: new Date(), message: "You will be moved to the observation area shortly." }
        ],
        waiting_discharge: [
          { time: new Date(), message: "Your discharge paperwork is being prepared." },
          { time: new Date(), message: "Please wait while we finalize your discharge instructions." }
        ],
        admission_orders: [
          { time: new Date(), message: "Admission paperwork is being processed." },
          { time: new Date(), message: "Your hospital room is being prepared." }
        ],
        awaiting_non_icu: [
          { time: new Date(), message: "Waiting for transfer to hospital ward." },
          { time: new Date(), message: "Transport team has been notified." }
        ],
        awaiting_icu: [
          { time: new Date(), message: "ICU bed is being prepared for you." },
          { time: new Date(), message: "Critical care team has been notified." }
        ],
        discharge_documents: [
          { time: new Date(), message: "Discharge documents are being finalized." },
          { time: new Date(), message: "Pharmacy is preparing your medications." }
        ],
        awaiting_departure: [
          { time: new Date(), message: "You're cleared to leave. Please wait for final instructions." },
          { time: new Date(), message: "Thank you for your patience during your visit." }
        ],
        departed: [
          { time: new Date(), message: "Visit completed. We hope you feel better soon!" },
          { time: new Date(), message: "Thank you for choosing our Emergency Department." }
        ]
      };
      return comments[stage] || [{ time: new Date(), message: "Your care is in progress." }];
    };

    setRealtimeComments(getStageComments(patient.currentStage));
  }, [patient?.currentStage]);

  // Check for newly completed stages that need satisfaction feedback
  useEffect(() => {
    if (!patient || !onAddSatisfactionFeedback) return;

    const completedStagesWithoutFeedback = patient.stageHistory.filter(
      (stage, index) => stage.endTime && !stage.satisfaction && 
      ['waiting_triage', 'triage', 'waiting_registration', 'registration', 'waiting_doctor', 'consultation'].includes(stage.stage)
    );

    if (completedStagesWithoutFeedback.length > 0) {
      const stage = completedStagesWithoutFeedback[0];
      const stageIndex = patient.stageHistory.findIndex(s => s === stage);
      const duration = stage.endTime ? 
        Math.floor((stage.endTime.getTime() - stage.startTime.getTime()) / 1000 / 60) : 0;

      setSatisfactionModal({
        isOpen: true,
        stageIndex,
        stageName: stage.stage,
        stageDisplayName: getStageDisplayName(stage.stage),
        duration
      });
    }
  }, [patient?.stageHistory, onAddSatisfactionFeedback]);

  const handleSatisfactionSubmit = (feedback) => {
    if (satisfactionModal && onAddSatisfactionFeedback) {
      onAddSatisfactionFeedback(currentPatientId, satisfactionModal.stageIndex, feedback);
    }
    setSatisfactionModal(null);
  };

  const handleSubmitComment = () => {
    if (patientComment.trim() && commentSatisfaction > 0) {
      const newComment = {
        time: new Date(),
        message: patientComment,
        rating: commentSatisfaction,
        stage: patient.currentStage,
        isPatient: true
      };
      setSubmittedComments([...submittedComments, newComment]);
      
      // Send feedback to ED Manager
      if (onAddRealtimeFeedback) {
        onAddRealtimeFeedback(currentPatientId, {
          rating: commentSatisfaction,
          comment: patientComment,
          stage: patient.currentStage,
          stageName: getStageDisplayName(patient.currentStage)
        });
      }
      
      setPatientComment('');
      setCommentSatisfaction(0);
      toast.success('Your feedback has been sent to the ED Manager!');
    } else if (commentSatisfaction === 0) {
      toast.error('Please select a star rating before submitting');
    } else {
      toast.error('Please add a comment before submitting');
    }
  };
  
  if (isLoading && !patient) {
    return (
      <div className="min-h-screen bg-blue-50 p-4 flex items-center justify-center">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
            <h3 className="text-lg font-medium mb-2">Loading your visit information...</h3>
            <p className="text-gray-600">Connecting to the Emergency Department system...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !patient) {
    return (
      <div className="min-h-screen bg-blue-50 p-4 flex items-center justify-center">
        <Card className="w-full max-w-md shadow-lg border-l-4 border-l-red-500">
          <CardContent className="p-8 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Activity className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-medium mb-2 text-red-800">Unable to Load Visit Information</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <p className="text-sm text-gray-500">
              Please check with the registration desk or try logging in again.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen bg-blue-50 p-4 flex items-center justify-center">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
            <h3 className="text-lg font-medium mb-2">Loading your visit information...</h3>
            <p className="text-gray-600">Please wait while we fetch your current status.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStageDescription = (stage) => {
    const descriptions = {
      kiosk: 'You have successfully checked in',
      waiting_triage: 'Please wait to be called for triage assessment',
      triage: 'You are currently being assessed by the triage nurse',
      waiting_registration: 'Please proceed to registration when called',
      registration: 'Your information is being registered',
      waiting_doctor: 'Please wait in the designated area to see the doctor',
      consultation: 'You are currently with the doctor',
      waiting_admission: 'Admission is being arranged',
      waiting_observation: 'Observation is being arranged',
      waiting_discharge: 'Your discharge is being prepared',
      admission_orders: 'Admission paperwork is being processed',
      awaiting_non_icu: 'Waiting for transfer to hospital ward',
      awaiting_icu: 'Waiting for transfer to intensive care',
      discharge_documents: 'Your discharge papers are being prepared',
      awaiting_departure: 'You are ready to leave - please wait for final instructions',
      departed: 'Visit completed - thank you for choosing our ED'
    };
    return descriptions[stage] || 'Your care is in progress';
  };

  const getStageDisplayName = (stage) => {
    const displayNames = {
      kiosk: 'Check-in Area',
      waiting_triage: 'Triage Waiting Area',
      triage: 'Triage Assessment',
      waiting_registration: 'Registration Waiting Area',
      registration: 'Registration',
      waiting_doctor: 'Doctor Waiting Area',
      consultation: 'Doctor Consultation',
      waiting_admission: 'Admission Waiting',
      waiting_observation: 'Observation Waiting',
      waiting_discharge: 'Discharge Preparation',
      admission_orders: 'Admission Processing',
      awaiting_non_icu: 'Transfer to Ward',
      awaiting_icu: 'Transfer to ICU',
      discharge_documents: 'Discharge Processing',
      awaiting_departure: 'Ready for Departure',
      departed: 'Visit Completed'
    };
    return displayNames[stage] || 'In Process';
  };

  const getStaffDisplayName = (username) => {
    return staffProfiles[username]?.name || username;
  };

  const getPriorityBadgeColor = (esiLevel) => {
    switch (esiLevel) {
      case 1: return 'bg-red-100 text-red-800 border-red-200';
      case 2: return 'bg-orange-100 text-orange-800 border-orange-200';
      case 3: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 4: return 'bg-blue-100 text-blue-800 border-blue-200';
      case 5: return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

const getProgressPercentage = () => {

    // This is the universal path every patient follows up to consultation

    const basePath = [
      'kiosk', 
      'waiting_triage', 
      'triage', 
      'waiting_registration', 
      'registration', 
      'waiting_doctor', 
      'consultation'
    ];


    // Path for patients being discharged
    const dischargePath = [
      ...basePath,
      'waiting_discharge',
      'discharge_documents', 
      'awaiting_departure', 
      'departed'
    ];

    // Path for patients being admitted to a regular ward

    const admissionPath = [
      ...basePath,
      'waiting_admission',
      'admission_orders',
      'awaiting_non_icu', 
      'departed' // 'departed' from the ED to the ward
    ];

    // Path for patients being admitted to the ICU
    const icuPath = [
      ...basePath,
      'waiting_admission',
      'admission_orders',
      'awaiting_icu',
      'departed' // 'departed' from the ED to the ICU
    ];

    // Path for patients being moved to observation
    const observationPath = [
      ...basePath,
      'waiting_observation',

      // Assuming observation eventually follows a discharge path
      'waiting_discharge',
      'discharge_documents', 
      'awaiting_departure', 
      'departed'
    ];

      // Determine which path the patient is on
      let fullPath = dischargePath; // Default to discharge path
      const stage = patient.currentStage;
      const disposition = patient.disposition; // Get from transformed patient

      // Check for admission stages or disposition
      if (
        stage === 'waiting_admission' || 
        stage === 'admission_orders' || 
        stage === 'awaiting_non_icu' ||
        disposition === 'Admit - Ward'
      ) {
        fullPath = admissionPath;
      } 

      // Check for ICU stages or disposition
      else if (
        stage === 'awaiting_icu' ||
        disposition === 'Admit - ICU'
      ) {
        fullPath = icuPath;
      } 

      // Check for observation stages or disposition
      else if (
        stage === 'waiting_observation' ||
        disposition === 'Observation'
      ) {
        fullPath = observationPath;
      }

      // Handle edge cases where stage is ambiguous but disposition clarifies
      if ((stage === 'waiting_admission' || stage === 'admission_orders') && disposition === 'Admit - ICU') {
         fullPath = icuPath;
      }

      if ((stage === 'waiting_admission' || stage === 'admission_orders') && disposition === 'Admit - Ward') {
         fullPath = admissionPath;
      }

    const currentIndex = fullPath.indexOf(stage);

    if (currentIndex === -1) {
         // If stage isn't found (e.g., a new unmapped stage), try to find it in the base path
         const baseIndex = basePath.indexOf(stage);
         if (baseIndex !== -1) {
            // Calculate progress assuming the default (discharge) path length
            const totalSteps = dischargePath.length - 1;
            return Math.round((baseIndex / totalSteps) * 100);
         }
         console.warn(`Stage ${stage} not found in any progress path.`);
         return 0; // Fallback
    }

  

    const totalSteps = fullPath.length - 1;

    if (totalSteps <= 0) return 100; // Path only has one step

    

    return Math.round((currentIndex / totalSteps) * 100);

  };

  const getStageIcon = (stage) => {
    switch (stage) {
      case 'kiosk': return CheckCircle;
      case 'waiting_triage':
      case 'triage': return UserCheck;
      case 'waiting_registration':
      case 'registration': return Activity;
      case 'waiting_doctor':
      case 'consultation': return Stethoscope;
      default: return Timer;
    }
  };

  const StageIcon = getStageIcon(patient.currentStage);

  return (
    <div className="min-h-screen bg-blue-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl mb-2">Emergency Department</h1>
          <p className="text-xl text-gray-600">Visit Tracker - {patient.name || 'Patient'}</p>
          
          {/* Connection Status Indicator */}
          <div className="flex items-center justify-center gap-2 mt-2">
            {backendPatientData ? (
              <>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-600">Live updates from ED system</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span className="text-xs text-yellow-600">Offline mode - updates may be delayed</span>
              </>
            )}
          </div>
        </div>

        {/* Main Status Card */}
        <Card className="shadow-lg border-l-4 border-l-blue-600">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <StageIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-2xl text-blue-800">
                    {getStageDisplayName(patient.currentStage)}
                  </CardTitle>
                  <p className="text-gray-600">Queue Number: {patient.id}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-blue-800">
                  {getCurrentStageTime(patient)}<span className="text-lg">min</span>
                </div>
                <p className="text-sm text-gray-600">in current stage</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-800 font-medium mb-1">Current Status:</p>
                <p className="text-blue-700">{getStageDescription(patient.currentStage)}</p>
              </div>

              {/* Real-Time Updates & Patient Comments */}
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Bell className="w-4 h-4 text-green-700" />
                  <p className="text-green-800 font-medium">Real-Time Updates & Communication:</p>
                </div>
                
                {/* System Updates */}
                <div className="space-y-2 mb-4">
                  {realtimeComments.map((comment, index) => (
                    <div key={index} className="flex items-start gap-2 bg-white p-2 rounded">
                      <MessageCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm text-green-700">{comment.message}</p>
                        <p className="text-xs text-gray-500">{comment.time.toLocaleTimeString()}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Patient Submitted Comments */}
                {submittedComments.filter(c => c.stage === patient.currentStage).length > 0 && (
                  <div className="space-y-2 mb-4">
                    <p className="text-sm font-medium text-green-800">Your Comments:</p>
                    {submittedComments.filter(c => c.stage === patient.currentStage).map((comment, index) => (
                      <div key={index} className="flex items-start gap-2 bg-blue-50 p-2 rounded border border-blue-200">
                        <MessageCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm text-blue-700 font-medium">You: {comment.message}</p>
                          <div className="flex items-center gap-1 mt-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-3 h-3 ${
                                  star <= comment.rating
                                    ? 'text-yellow-500 fill-yellow-500'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          <p className="text-xs text-gray-500">{comment.time.toLocaleTimeString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Real-time Feedback Section */}
                <div className="mt-4 p-4 border border-green-300 rounded-xl bg-white shadow-sm">
                  <p className="text-center text-green-800 font-semibold mb-4">
                    How are you feeling right now? Share your experience with the ED Manager
                  </p>

                  {/* Star Rating */}
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <p className="text-sm font-medium text-green-800 mr-3">Rate your current experience:</p>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setCommentSatisfaction(star)}
                          onMouseEnter={() => setCommentHoveredStar(star)}
                          onMouseLeave={() => setCommentHoveredStar(0)}
                          className="transition-transform hover:scale-110"
                        >
                          <Star
                            className={`w-6 h-6 ${
                              star <= (commentHoveredStar || commentSatisfaction)
                                ? 'text-yellow-500 fill-yellow-500'
                                : 'text-gray-300'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    <span className="text-sm text-green-700 ml-2">
                      {commentSatisfaction > 0 && `${commentSatisfaction}/5 stars`}
                    </span>
                  </div>

                  {/* Comment Input */}
                  <div className="space-y-2">
                    <p className="text-sm font-bold text-green-800">
                      Additional Comments or Concerns:
                    </p>
                    <div className="flex gap-2">
                      <Textarea
                        value={patientComment}
                        onChange={(e) => setPatientComment(e.target.value)}
                        placeholder="Tell us about your experience, any concerns, or suggestions..."
                        className="flex-1 min-h-[80px] text-sm"
                      />
                      <Button
                        onClick={handleSubmitComment}
                        disabled={!patientComment.trim() || commentSatisfaction === 0}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 self-end"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-green-600">
                      Your feedback will be sent directly to the ED Manager for immediate attention
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Visit Progress</span>
                  <span className="text-sm text-gray-600">{getProgressPercentage()}% Complete</span>
                </div>
                <Progress value={getProgressPercentage()} className="h-3" />
              </div>

              {/* History Button */}
              <div className="flex justify-center pt-2">
                <StageHistory patient={patient} />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Visit Overview */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-green-600" />
                Visit Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">Total Time</span>
                  </div>
                  <div className="text-xl font-bold text-gray-800">
                    {getTotalTime(patient)} min
                  </div>
                </div>
                
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Timer className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">Arrival</span>
                  </div>
                  <div className="text-sm font-medium text-gray-800">
                    {patient.arrivalTime.toLocaleTimeString()}
                  </div>
                </div>
              </div>

              {patient.esiLevel && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">Priority Level</span>
                  </div>
                  <Badge className={getPriorityBadgeColor(patient.esiLevel)}>
                    Level {patient.esiLevel} {patient.esiLevel === 1 ? '(Critical)' : 
                    patient.esiLevel === 2 ? '(Emergent)' : 
                    patient.esiLevel === 3 ? '(Urgent)' : 
                    patient.esiLevel === 4 ? '(Less Urgent)' : '(Non-Urgent)'}
                  </Badge>
                </div>
              )}

              {patient.chiefComplaint && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-700 mb-1">Chief Complaint</div>
                  <div className="text-sm text-gray-800">{patient.chiefComplaint}</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Healthcare Team */}
          {(patient.assignedNurse || patient.assignedDoctor) && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-purple-600" />
                  Your Healthcare Team
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {patient.assignedNurse && (
                  <div className="flex items-center gap-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={staffProfiles[patient.assignedNurse]?.photo} alt={getStaffDisplayName(patient.assignedNurse)} />
                      <AvatarFallback className="bg-purple-200 text-purple-800">
                        {getStaffDisplayName(patient.assignedNurse).split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-medium text-purple-800">Assigned Nurse</div>
                      <div className="text-purple-700">{getStaffDisplayName(patient.assignedNurse)}</div>
                    </div>
                  </div>
                )}
                
                {patient.assignedDoctor && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={staffProfiles[patient.assignedDoctor]?.photo} alt={getStaffDisplayName(patient.assignedDoctor)} />
                        <AvatarFallback className="bg-purple-200 text-purple-800">
                          {getStaffDisplayName(patient.assignedDoctor).split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="font-medium text-purple-800">Assigned Doctor</div>
                        <div className="text-purple-700">{getStaffDisplayName(patient.assignedDoctor)}</div>
                      </div>
                    </div>
                    
                    {/* Doctor Location Info */}
                    {staffProfiles[patient.assignedDoctor]?.room && (
                      <div className="ml-15 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                        <div className="text-sm space-y-1">
                          <div className="flex items-center gap-2">
                            <Building className="w-4 h-4 text-indigo-600" />
                            <span className="font-medium text-indigo-800">Location:</span>
                          </div>
                          <div className="ml-6 text-indigo-700">
                            <p>🏥 {staffProfiles[patient.assignedDoctor].building}</p>
                            <p>📍 Room {staffProfiles[patient.assignedDoctor].room}</p>
                            <p>🔢 {staffProfiles[patient.assignedDoctor].floor}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="text-xs text-purple-600 mt-2">
                  <p>• Your care team has been notified of your visit</p>
                  <p>• They will see you in order of medical priority</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Entertainment and Information Tabs */}
        <Tabs defaultValue="tips" className="w-full">
          <TabsList className="flex justify-between w-full space-x-3 overflow-x-auto pb-1 bg-transparent border-b pb-2">
            <TabsTrigger
              value="tips"
              className="
                flex items-center justify-center gap-2 min-w-[100px] px-6 py-3 rounded-xl text-sm sm:text-base font-medium
                text-blue-700 border border-blue-200 bg-white shadow-sm transition-all duration-200
                hover:bg-blue-50 hover:text-blue-700
                dark:hover:bg-gray-800 
                data-[state=active]:!bg-blue-100
                dark:data-[state=active]:!bg-blue-100 
                data-[state=active]:!text-blue-800
                dark:data-[state=active]:!text-blue-800
                data-[state=active]:!border-blue-300
                dark:data-[state=active]:!border-blue-300
                data-[state=active]:shadow-lg
                data-[state=active]:scale-[1.05]
              "
            >
              <Lightbulb className="w-4 h-4" />
              <span className="hidden sm:inline">Health Tips</span>
              <span className="sm:hidden"></span>
            </TabsTrigger>

            <TabsTrigger
              value="news"
              className="
                flex items-center justify-center gap-2 min-w-[100px] px-6 py-3 rounded-xl text-sm sm:text-base font-medium
                text-blue-700 border border-blue-200 bg-white shadow-sm transition-all duration-200
                hover:bg-blue-50 hover:text-blue-700
                dark:hover:bg-gray-800 
                data-[state=active]:!bg-blue-100
                dark:data-[state=active]:!bg-blue-100 
                data-[state=active]:!text-blue-800
                dark:data-[state=active]:!text-blue-800
                data-[state=active]:!border-blue-300
                dark:data-[state=active]:!border-blue-300
                data-[state=active]:shadow-lg
                data-[state=active]:scale-[1.05]
              "
            >
              <Newspaper className="w-4 h-4" />
              <span className="hidden sm:inline">News</span>
              <span className="sm:hidden">News</span>
            </TabsTrigger>

            <TabsTrigger
              value="trivia"
              className="
                flex items-center justify-center gap-2 min-w-[100px] px-6 py-3 rounded-xl text-sm sm:text-base font-medium
                text-blue-700 border border-blue-200 bg-white shadow-sm transition-all duration-200
                hover:bg-blue-50 hover:text-blue-700
                dark:hover:bg-gray-800 
                data-[state=active]:!bg-blue-100
                dark:data-[state=active]:!bg-blue-100 
                data-[state=active]:!text-blue-800
                dark:data-[state=active]:!text-blue-800
                data-[state=active]:!border-blue-300
                dark:data-[state=active]:!border-blue-300
                data-[state=active]:shadow-lg
                data-[state=active]:scale-[1.05]
              "
            >
              <Brain className="w-4 h-4" />
              <span className="hidden sm:inline">Trivia</span>
              <span className="sm:hidden">Quiz</span>
            </TabsTrigger>

            <TabsTrigger
              value="relax"
              className="
                flex items-center justify-center gap-2 min-w-[100px] px-6 py-3 rounded-xl text-sm sm:text-base font-medium
                text-blue-700 border border-blue-200 bg-white shadow-sm transition-all duration-200
                hover:bg-blue-50 hover:text-blue-700
                dark:hover:bg-gray-800 
                data-[state=active]:!bg-blue-100
                dark:data-[state=active]:!bg-blue-100 
                data-[state=active]:!text-blue-800
                dark:data-[state=active]:!text-blue-800
                data-[state=active]:!border-blue-300
                dark:data-[state=active]:!border-blue-300
                data-[state=active]:shadow-lg
                data-[state=active]:scale-[1.05]
              "
            >
              <Wind className="w-4 h-4" />
              <span className="hidden sm:inline">Relax</span>
              <span className="sm:hidden">Calm</span>
            </TabsTrigger>

            <TabsTrigger
              value="services"
              className="
                flex items-center justify-center gap-2 min-w-[100px] px-6 py-3 rounded-xl text-sm sm:text-base font-medium
                text-blue-700 border border-blue-200 bg-white shadow-sm transition-all duration-200
                hover:bg-blue-50 hover:text-blue-700
                dark:hover:bg-gray-800 
                data-[state=active]:!bg-blue-100
                dark:data-[state=active]:!bg-blue-100 
                data-[state=active]:!text-blue-800
                dark:data-[state=active]:!text-blue-800
                data-[state=active]:!border-blue-300
                dark:data-[state=active]:!border-blue-300
                data-[state=active]:shadow-lg
                data-[state=active]:scale-[1.05]
              "
            >
              <Building className="w-4 h-4" />
              <span className="hidden sm:inline">Services</span>
              <span className="sm:hidden">Info</span>
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="tips" className="mt-0">
              <HealthTips />
            </TabsContent>

            <TabsContent value="news" className="mt-0">
              <HospitalAnnouncements />
            </TabsContent>

            <TabsContent value="trivia" className="mt-0">
              <MedicalTrivia />
            </TabsContent>

            <TabsContent value="relax" className="mt-0">
              <RelaxationExercises />
            </TabsContent>

            <TabsContent value="services" className="mt-0">
              <HospitalServices />
            </TabsContent>
          </div>
        </Tabs>


        {/* Important Information */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Important Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="font-medium text-green-800">What's Happening</h3>
                <ul className="text-sm space-y-2 text-gray-600">
                  <li>• Your status updates automatically as you progress</li>
                  <li>• You will be seen based on medical priority, not arrival time</li>
                  <li>• Wait times may vary based on your condition and ED volume</li>
                  <li>• Please stay in the waiting area unless called by staff</li>
                  <li>• Refresh this page anytime to see your current status</li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <h3 className="font-medium text-blue-800">Need Help?</h3>
                <ul className="text-sm space-y-2 text-gray-600">
                  <li>• Inform staff if your condition changes</li>
                  <li>• Ask the front desk if you have questions</li>
                  <li>• Let us know if you need to update your contact information</li>
                  <li>• Notify staff if you need to leave temporarily</li>
                  <li>• Keep your queue number visible at all times</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Time */}
        <div className="text-center text-sm text-gray-500">
          Last updated: {currentTime.toLocaleString()}
        </div>

        {/* Satisfaction Feedback Modal */}
        {satisfactionModal && (
          <SatisfactionModal
            isOpen={satisfactionModal.isOpen}
            onClose={() => setSatisfactionModal(null)}
            onSubmit={handleSatisfactionSubmit}
            stageName={satisfactionModal.stageName}
            stageDisplayName={satisfactionModal.stageDisplayName}
            duration={satisfactionModal.duration}
          />
        )}
      </div>
    </div>
  );
}