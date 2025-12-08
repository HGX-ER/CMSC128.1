import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Textarea } from './ui/textarea';
import { Avatar, AvatarFallback } from './ui/avatar';
import { StageHistory } from './StageHistory';
import { HospitalAnnouncements } from './HospitalAnnouncements';
import { MedicalTrivia } from './MedicalTrivia';
import { HealthTips } from './HealthTips';
import { RelaxationExercises } from './RelaxationExercises';
import { HospitalServices } from './HospitalServices';
import { ConsultationCompletionScreen } from './ConsultationCompletionScreen';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs.jsx';
import {
  Clock,
  Timer,
  Heart,
  Activity,
  Stethoscope,
  UserCheck,
  CheckCircle,
  MapPin,
  Loader2,
  Newspaper,
  Brain,
  Lightbulb,
  Wind,
  Building,
  Bell,
  MessageCircle,
  Send,
  Star,
  RefreshCw,
} from 'lucide-react';
import { formatDisposition } from '../types/patient';

export function PatientInterface({
  patients,
  currentPatientId,
  getTotalTime,
  getCurrentStageTime,
  onAddSatisfactionFeedback,
  onAddRealtimeFeedback,
}) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [realtimeComments, setRealtimeComments] = useState([]);
  const [patientComment, setPatientComment] = useState('');
  const [submittedComments, setSubmittedComments] = useState([]);
  const [backendPatientData, setBackendPatientData] = useState(null);
  const [commentSatisfaction, setCommentSatisfaction] = useState(0);
  const [commentHoveredStar, setCommentHoveredStar] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [doctors, setDoctors] = useState([]);

  // Get queue number from URL or props
  const getQueueNumber = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const queueFromUrl = urlParams.get('queue');
    return queueFromUrl || currentPatientId;
  };

  const queueNumber = getQueueNumber();
  const patient = backendPatientData || patients.find((p) => p.id === queueNumber);

  // Load doctors once so we can map username -> full name
  useEffect(() => {
    const loadDoctors = async () => {
      try {
        const res = await fetch('https://node-mysql-api-zsam.onrender.com/api/doctors');
        if (!res.ok) return;
        const data = await res.json();
        setDoctors(data);
      } catch (e) {
        console.error('Failed to load doctors', e);
      }
    };
    loadDoctors();
  }, []);

  const getDoctorInfo = (username) => {
    if (!username) return null;
    const d = doctors.find((doc) => doc.username === username);
    if (!d) return null;
    return {
      name: d.full_name || d.username,
      specialty: d.specialty || '',
      room: d.room || '',
      floor: d.floor || '',
      building: 'Main Hospital Building',
    };
  };

  // Stage normalization
  const normalizeStage = (statusToStageMap, rawStage) => {
    if (!rawStage) return 'kiosk';
    return statusToStageMap[rawStage] || rawStage;
  };

  // Polling for patient status
  useEffect(() => {
    if (!queueNumber) return;

    const pollPatientStatus = async () => {
      try {
        const response = await fetch(`https://node-mysql-api-zsam.onrender.com/api/patient/status/${queueNumber}`);
        if (!response.ok) {
          if (response.status === 404) return;
          throw new Error(`Failed to fetch patient status: ${response.status}`);
        }

        const data = await response.json();

        const statusToStageMap = {
          arrived: 'kiosk',
          waiting_for_triage: 'waiting_triage',
          in_triage: 'triage',
          triaged: 'waiting_registration',
          waiting_for_registration: 'waiting_registration',
          in_registration: 'registration',
          waiting_for_provider: 'waiting_doctor',
          with_provider: 'consultation',
          waiting_for_admission: 'waiting_admission',
          waiting_for_observation: 'waiting_observation',
          waiting_for_discharge: 'waiting_discharge',
          admission_in_progress: 'admission_orders',
          awaiting_bed: 'awaiting_non_icu',
          awaiting_icu_bed: 'awaiting_icu',
          discharge_in_progress: 'discharge_documents',
          ready_to_depart: 'awaiting_departure',
          departed: 'departed',
          in_observation: 'waiting_observation',
          admitted_non_icu: 'awaiting_non_icu',
          admitted_icu: 'awaiting_icu',
        };

        const transformedPatient = {
          id: data.queue_number,
          name: data.patient.full_name,
          queueNumber: data.queue_number,
          esiLevel: data.priority_esi ? parseInt(data.priority_esi) : null,
          currentStage: normalizeStage(statusToStageMap, data.frontend_stage || data.status),
          arrivalTime: data.timestamps.arrived ? new Date(data.timestamps.arrived) : new Date(),
          isActive: data.status !== 'departed',
          stageHistory:
            data.events?.map((event, index, array) => ({
              stage: normalizeStage(statusToStageMap, event.frontend_stage || event.type),
              startTime: new Date(event.at),
              endTime: array[index + 1] ? new Date(array[index + 1].at) : null,
              payload: event.payload,
            })) || [],
          chiefComplaint: data.timestamps?.roomed ? 'Registered' : null,
          assignedDoctor: data.assigned_doctor || null,
          sex: data.patient.sex,
          dob: data.patient.dob,
          disposition: data.timestamps.dispositioned,
        };

        setBackendPatientData(transformedPatient);
        setLastUpdated(new Date());
        setError(null);
      } catch (err) {
        console.error('Error polling patient status:', err);
      }
    };

    pollPatientStatus();
    const intervalId = setInterval(pollPatientStatus, 5000);
    return () => clearInterval(intervalId);
  }, [queueNumber]);

  // Initial status load
  useEffect(() => {
    const fetchPatientStatus = async () => {
      if (!queueNumber) {
        setError('No queue number provided');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await fetch(`https://node-mysql-api-zsam.onrender.com/api/patient/status/${queueNumber}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError(`Queue number "${queueNumber}" not found in the system`);
            setIsLoading(false);
            return;
          }
          throw new Error(`Failed to fetch patient status: ${response.status}`);
        }

        const data = await response.json();

        const statusToStageMap = {
          arrived: 'kiosk',
          waiting_for_triage: 'waiting_triage',
          in_triage: 'triage',
          triaged: 'waiting_registration',
          waiting_for_registration: 'waiting_registration',
          in_registration: 'registration',
          waiting_for_provider: 'waiting_doctor',
          with_provider: 'consultation',
          waiting_for_admission: 'waiting_admission',
          waiting_for_observation: 'waiting_observation',
          waiting_for_discharge: 'waiting_discharge',
          admission_in_progress: 'admission_orders',
          awaiting_bed: 'awaiting_non_icu',
          awaiting_icu_bed: 'awaiting_icu',
          discharge_in_progress: 'discharge_documents',
          ready_to_depart: 'awaiting_departure',
          departed: 'departed',
          in_observation: 'waiting_observation',
          admitted_non_icu: 'awaiting_non_icu',
          admitted_icu: 'awaiting_icu',
        };

        const transformedPatient = {
          id: data.queue_number,
          name: data.patient.full_name,
          queueNumber: data.queue_number,
          esiLevel: data.priority_esi ? parseInt(data.priority_esi) : null,
          currentStage: normalizeStage(statusToStageMap, data.frontend_stage || data.status),
          arrivalTime: data.timestamps.arrived ? new Date(data.timestamps.arrived) : new Date(),
          isActive: data.status !== 'departed',
          stageHistory:
            data.events?.map((event, index, array) => ({
              stage: normalizeStage(statusToStageMap, event.frontend_stage || event.type),
              startTime: new Date(event.at),
              endTime: array[index + 1] ? new Date(array[index + 1].at) : null,
              payload: event.payload,
            })) || [],
          chiefComplaint: data.timestamps?.roomed ? 'Registered' : null,
          assignedDoctor: data.assigned_doctor || null,
          sex: data.patient.sex,
          dob: data.patient.dob,
          disposition: data.timestamps.dispositioned,
        };

        setBackendPatientData(transformedPatient);
        setLastUpdated(new Date());
        setError(null);
      } catch (err) {
        console.error('Error fetching patient status:', err);
        setError('Using offline data - updates may be delayed');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPatientStatus();
  }, [queueNumber]);

  // Manual refresh
  const handleManualRefresh = async () => {
    if (!queueNumber) {
      toast.error('No queue number available');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`https://node-mysql-api-zsam.onrender.com/api/patient/status/${queueNumber}`);
      if (!response.ok) {
        throw new Error(`Failed to refresh patient status: ${response.status}`);
      }

      const data = await response.json();

      const statusToStageMap = {
        arrived: 'kiosk',
        waiting_for_triage: 'waiting_triage',
        in_triage: 'triage',
        triaged: 'waiting_registration',
        waiting_for_registration: 'waiting_registration',
        in_registration: 'registration',
        waiting_for_provider: 'waiting_doctor',
        with_provider: 'consultation',
        waiting_for_admission: 'waiting_admission',
        waiting_for_observation: 'waiting_observation',
        waiting_for_discharge: 'waiting_discharge',
        admission_in_progress: 'admission_orders',
        awaiting_bed: 'awaiting_non_icu',
        awaiting_icu_bed: 'awaiting_icu',
        discharge_in_progress: 'discharge_documents',
        ready_to_depart: 'awaiting_departure',
        departed: 'departed',
        in_observation: 'waiting_observation',
        admitted_non_icu: 'awaiting_non_icu',
        admitted_icu: 'awaiting_icu',
      };

      const transformedPatient = {
        id: data.queue_number,
        name: data.patient.full_name,
        queueNumber: data.queue_number,
        esiLevel: data.priority_esi ? parseInt(data.priority_esi) : null,
        currentStage: normalizeStage(statusToStageMap, data.frontend_stage || data.status),
        arrivalTime: data.timestamps.arrived ? new Date(data.timestamps.arrived) : new Date(),
        isActive: data.status !== 'departed',
        stageHistory:
          data.events?.map((event, index, array) => ({
            stage: normalizeStage(statusToStageMap, event.frontend_stage || event.type),
            startTime: new Date(event.at),
            endTime: array[index + 1] ? new Date(array[index + 1].at) : null,
            payload: event.payload,
          })) || [],
        chiefComplaint: data.timestamps?.roomed ? 'Registered' : null,
        assignedDoctor: data.assigned_doctor || null,
        sex: data.patient.sex,
        dob: data.patient.dob,
        disposition: data.timestamps.dispositioned,
      };

      setBackendPatientData(transformedPatient);
      setLastUpdated(new Date());
      setError(null);
      toast.success('Status updated!');
    } catch (err) {
      console.error('Error refreshing patient status:', err);
      toast.error('Failed to refresh status');
    } finally {
      setIsLoading(false);
    }
  };

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Real-time comments based on stage
  useEffect(() => {
    if (!patient) return;

    const getStageComments = (stage) => {
      const comments = {
        kiosk: [
          { time: new Date(), message: 'Thank you for checking in. Please have a seat in the waiting area.' },
          { time: new Date(), message: 'Your information has been recorded successfully.' },
        ],
        waiting_triage: [
          { time: new Date(), message: 'You are in the queue for triage assessment.' },
          { time: new Date(), message: 'A triage nurse will call you shortly.' },
        ],
        triage: [
          { time: new Date(), message: 'Triage nurse is assessing your vital signs and symptoms.' },
          { time: new Date(), message: 'Your priority level is being determined.' },
        ],
        waiting_registration: [
          { time: new Date(), message: 'Please proceed to the registration desk when called.' },
          { time: new Date(), message: 'Registration staff will collect your information.' },
        ],
        registration: [
          { time: new Date(), message: 'Registration staff is processing your information.' },
          { time: new Date(), message: 'Your healthcare team is being assigned.' },
        ],
        waiting_doctor: [
          { time: new Date(), message: 'You are in the queue to see the doctor.' },
          { time: new Date(), message: 'You will be seen based on medical priority.' },
        ],
        consultation: [
          { time: new Date(), message: 'The doctor is now seeing you.' },
          { time: new Date(), message: 'Your examination and consultation is in progress.' },
        ],
        waiting_admission: [
          { time: new Date(), message: 'Admission arrangements are being made.' },
          { time: new Date(), message: 'Hospital bed availability is being checked.' },
        ],
        waiting_observation: [
          { time: new Date(), message: 'Observation unit placement is being arranged.' },
          { time: new Date(), message: 'You will be moved to the observation area shortly.' },
        ],
        waiting_discharge: [
          { time: new Date(), message: 'Your discharge paperwork is being prepared.' },
          { time: new Date(), message: 'Please wait while we finalize your discharge instructions.' },
        ],
        admission_orders: [
          { time: new Date(), message: 'Admission paperwork is being processed.' },
          { time: new Date(), message: 'Your hospital room is being prepared.' },
        ],
        awaiting_non_icu: [
          { time: new Date(), message: 'Waiting for transfer to hospital ward.' },
          { time: new Date(), message: 'Transport team has been notified.' },
        ],
        awaiting_icu: [
          { time: new Date(), message: 'ICU bed is being prepared for you.' },
          { time: new Date(), message: 'Critical care team has been notified.' },
        ],
        discharge_documents: [
          { time: new Date(), message: 'Discharge documents are being finalized.' },
          { time: new Date(), message: 'Pharmacy is preparing your medications.' },
        ],
        awaiting_departure: [
          { time: new Date(), message: "You are cleared to leave. Please wait for final instructions." },
          { time: new Date(), message: 'Thank you for your patience during your visit.' },
        ],
        departed: [
          { time: new Date(), message: 'Visit completed. We hope you feel better soon!' },
          { time: new Date(), message: 'Thank you for choosing our Emergency Department.' },
        ],
      };
      return comments[stage] || [{ time: new Date(), message: 'Your care is in progress.' }];
    };

    setRealtimeComments(getStageComments(patient.currentStage));
  }, [patient?.currentStage]);

  const handleSubmitComment = async () => {
    if (patientComment.trim() && commentSatisfaction > 0) {
      try {
        const response = await fetch('https://node-mysql-api-zsam.onrender.com/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            queueNumber,
            rating: commentSatisfaction,
            comment: patientComment,
            stage: patient.currentStage,
            stageName: getStageDisplayName(patient.currentStage),
          }),
        });

        if (!response.ok) throw new Error('Failed to submit feedback');

        const newComment = {
          time: new Date(),
          message: patientComment,
          rating: commentSatisfaction,
          stage: patient.currentStage,
          isPatient: true,
        };
        setSubmittedComments([...submittedComments, newComment]);
        setPatientComment('');
        setCommentSatisfaction(0);
        toast.success('Your feedback has been sent to the ED Manager!');
      } catch (error) {
        console.error('Error submitting feedback:', error);
        toast.error('Failed to send feedback. Please try again.');
      }
    } else if (commentSatisfaction === 0) {
      toast.error('Please select a rating before submitting');
    } else {
      toast.error('Please add a comment before submitting');
    }
  };

  // Loading / error UIs
  if (!queueNumber && isLoading) {
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

  if (!queueNumber) {
    return (
      <div className="min-h-screen bg-blue-50 p-4 flex items-center justify-center">
        <Card className="w-full max-w-md shadow-lg border-l-4 border-l-red-500">
          <CardContent className="p-8 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Activity className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-medium mb-2 text-red-800">Queue Number Required</h3>
            <p className="text-gray-600 mb-4">Please provide a queue number to view your visit status.</p>
            <Button onClick={() => window.history.back()} className="w-full">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading && !patient) {
    return (
      <div className="min-h-screen bg-blue-50 p-4 flex items-center justify-center">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
            <h3 className="text-lg font-medium mb-2">Loading your visit information...</h3>
            <p className="text-gray-600">Connecting to the Emergency Department system...</p>
            <p className="text-sm text-gray-500 mt-2">Queue: {queueNumber}</p>
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
            <p className="text-sm text-gray-500">Please check with the registration desk or try logging in again.</p>
            <p className="text-sm text-gray-500 mt-2">Queue: {queueNumber}</p>
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
            <p className="text-sm text-gray-500 mt-2">Queue: {queueNumber}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStageDescription = (stage) => {
    const descriptions = {
      kiosk: 'You have successfully checked in',
      waiting_triage: 'Please wait to be called for triage assessment',
      triaged: 'You are currently being assessed by the triage nurse',
      waiting_registration: 'Please proceed to registration when called',
      registration: 'Your information is being registered',
      registered: 'You have been registered',
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
      departed: 'Visit completed - thank you for choosing our ED',
    };
    return descriptions[stage] || 'Your care is in progress';
  };

  const getStageDisplayName = (stage) => {
    const displayNames = {
      kiosk: 'Check-in Area',
      waiting_triage: 'Triage Waiting Area',
      triaged: 'Triage Assessment',
      waiting_registration: 'Registration Waiting Area',
      registration: 'Registration',
      registered: 'Registration (Registered)',
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
      departed: 'Visit Completed',
    };
    return displayNames[stage] || `In Process (${stage})`;
  };

  const getPriorityBadgeColor = (esiLevel) => {
    switch (esiLevel) {
      case 1:
        return 'bg-red-100 text-red-800 border-red-200';
      case 2:
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 3:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 4:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 5:
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getProgressPercentage = () => {
    if (!patient) return 0;

    const flow = ['checkin', 'triage', 'registration', 'doctor', 'consultation', 'departed'];

    const stageMap = {
      kiosk: 'checkin',
      arrived: 'checkin',
      waiting_triage: 'triage',
      in_triage: 'triage',
      triaged: 'triage',
      waiting_registration: 'registration',
      in_registration: 'registration',
      registration: 'registration',
      registered: 'registration',
      waiting_doctor: 'doctor',
      with_provider: 'doctor',
      consultation: 'consultation',
      waiting_discharge: 'consultation',
      discharge_documents: 'consultation',
      awaiting_departure: 'consultation',
      waiting_admission: 'consultation',
      admission_orders: 'consultation',
      awaiting_non_icu: 'consultation',
      awaiting_icu: 'consultation',
      waiting_observation: 'consultation',
      departed: 'departed',
    };

    const normalizedStage = stageMap[patient.currentStage] || 'checkin';
    const index = flow.indexOf(normalizedStage);
    const clampedIndex = index === -1 ? 0 : index;
    const maxIndex = flow.length - 1;

    return Math.round((clampedIndex / maxIndex) * 100);
  };

  const getStageIcon = (stage) => {
    switch (stage) {
      case 'kiosk':
        return CheckCircle;
      case 'waiting_triage':
      case 'triage':
        return UserCheck;
      case 'waiting_registration':
      case 'registration':
        return Activity;
      case 'waiting_doctor':
      case 'consultation':
        return Stethoscope;
      default:
        return Timer;
    }
  };

  const StageIcon = getStageIcon(patient.currentStage);
  const doctorInfo = getDoctorInfo(patient.assignedDoctor);

  return (
    <div className="min-h-screen bg-blue-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">Emergency Department</h1>
          <p className="text-xl text-gray-600">Visit Tracker</p>

          <div className="flex items-center justify-center gap-4 mt-2">
            <div className="flex items-center gap-2">
              {backendPatientData ? (
                <>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs text-green-600">Live updates from ED system</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                  <span className="text-xs text-yellow-600">Offline mode - updates may be delayed</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={handleManualRefresh}
                disabled={isLoading}
                size="sm"
                variant="outline"
                className="flex items-center gap-1 h-7"
              >
                <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              {lastUpdated && (
                <span className="text-xs text-gray-500">
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </div>
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
                  {patient.disposition && (
                    <div className="mt-1">
                      <span className="text-sm text-gray-700">Disposition: </span>
                      <strong className="text-sm text-gray-800">
                        {formatDisposition(patient.disposition)}
                      </strong>
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-blue-800">
                  {getTotalTime(patient)}
                  <span className="text-lg">min</span>
                </div>
                <p className="text-sm text-gray-600">in current stage</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {getProgressPercentage() === 100 ? (
              <ConsultationCompletionScreen
                onSubmitFeedback={onAddSatisfactionFeedback}
                patientName={patient.name}
                queueNumber={queueNumber}
              />
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-blue-800 font-medium mb-1">Current Status:</p>
                  <p className="text-blue-700">{getStageDescription(patient.currentStage)}</p>
                </div>

                {/* Real-time updates + feedback */}
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <Bell className="w-4 h-4 text-green-700" />
                    <p className="text-green-800 font-medium">Real-Time Updates & Communication:</p>
                  </div>

                  <div className="space-y-2 mb-4">
                    {realtimeComments.map((comment, index) => (
                      <div key={index} className="flex items-start gap-2 bg-white p-2 rounded">
                        <MessageCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm text-green-700">{comment.message}</p>
                          <p className="text-xs text-gray-500">
                            {comment.time.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {submittedComments
                    .filter((c) => c.stage === patient.currentStage)
                    .map((comment, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-2 bg-blue-50 p-2 rounded border border-blue-200 mb-2"
                      >
                        <MessageCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm text-blue-700 font-medium">
                            You: {comment.message}
                          </p>
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
                          <p className="text-xs text-gray-500">
                            {comment.time.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}

                  <div className="mt-4 p-4 border border-green-300 rounded-xl bg-white shadow-sm">
                    <p className="text-center text-green-800 font-semibold mb-4">
                      How are you feeling right now? Share your experience with the ED Manager
                    </p>

                    <div className="text-center">
                      <p className="text-base text-green-800 font-semibold mb-6">
                        How satisfied are you with this stage?
                      </p>

                      <div className="flex justify-center items-center gap-6 mb-6">
                        {[
                          { id: 1, emoji: '😠', label: 'Very Unsatisfied' },
                          { id: 2, emoji: '😕', label: 'Unsatisfied' },
                          { id: 3, emoji: '😐', label: 'Neutral' },
                          { id: 4, emoji: '🙂', label: 'Satisfied' },
                          { id: 5, emoji: '😄', label: 'Very Satisfied' },
                        ].map((smile, index, arr) => (
                          <div key={smile.id} className="flex items-center">
                            <div
                              className="flex flex-col items-center cursor-pointer"
                              onClick={() => setCommentSatisfaction(smile.id)}
                              title={smile.label}
                            >
                              <span
                                className={`text-6xl transition-transform duration-200 ${
                                  commentSatisfaction === smile.id
                                    ? 'scale-125'
                                    : 'opacity-60 hover:opacity-100 hover:scale-110'
                                }`}
                              >
                                {smile.emoji}
                              </span>
                              <span
                                className={`mt-2 text-sm font-medium ${
                                  commentSatisfaction === smile.id
                                    ? 'text-blue-700'
                                    : 'text-gray-500'
                                }`}
                              >
                                {smile.label}
                              </span>
                            </div>
                            {index < arr.length - 1 && (
                              <div className="h-10 border-l border-gray-600 mx-6" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

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
                        Your feedback will be sent directly to the ED Manager for immediate
                        attention
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Visit Progress</span>
                    <span className="text-sm text-gray-600">{getProgressPercentage()}% Complete</span>
                  </div>
                  <Progress value={getProgressPercentage()} className="h-3" />
                </div>

                <div className="flex justify-center pt-2">
                  <StageHistory patient={patient} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Overview + Assigned Doctor */}
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
                    Level {patient.esiLevel}{' '}
                    {patient.esiLevel === 1
                      ? '(Critical)'
                      : patient.esiLevel === 2
                      ? '(Emergent)'
                      : patient.esiLevel === 3
                      ? '(Urgent)'
                      : patient.esiLevel === 4
                      ? '(Less Urgent)'
                      : '(Non-Urgent)'}
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

          {/* Assigned Doctor card (no nurses) */}
          {doctorInfo && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-purple-600" />
                  Your Doctor
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-purple-200 text-purple-800">
                      {doctorInfo.name
                        .split(' ')
                        .filter(Boolean)
                        .map((n) => n[0].toUpperCase())
                        .join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="font-medium text-purple-800">Assigned Doctor</div>
                    <div className="text-purple-700">{doctorInfo.name}</div>
                    {doctorInfo.specialty && (
                      <div className="text-xs text-purple-600">{doctorInfo.specialty}</div>
                    )}
                  </div>
                </div>

                {(doctorInfo.room || doctorInfo.floor) && (
                  <div className="ml-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                    <div className="text-sm space-y-1">
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-indigo-600" />
                        <span className="font-medium text-indigo-800">Location:</span>
                      </div>
                      <div className="ml-6 text-indigo-700">
                        <p>🏥 {doctorInfo.building}</p>
                        {doctorInfo.room && <p>📍 Room {doctorInfo.room}</p>}
                        {doctorInfo.floor && <p>🔢 {doctorInfo.floor}</p>}
                      </div>
                    </div>
                  </div>
                )}

                <div className="text-xs text-purple-600 mt-2">
                  <p>• Your doctor has been notified of your visit</p>
                  <p>• You will be seen in order of medical priority</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Tabs for tips, news, trivia, relax, services */}
        <Tabs defaultValue="tips" className="w-full">
          <TabsList className="flex justify-between w-full space-x-3 overflow-x-auto pb-2 bg-transparent border-b">
            <TabsTrigger
              value="tips"
              className="flex items-center justify-center gap-2 min-w-[100px] px-6 py-3 rounded-xl text-sm sm:text-base font-medium text-blue-700 border border-blue-200 bg-white shadow-sm data-[state=active]:!bg-blue-100 data-[state=active]:!text-blue-800"
            >
              <Lightbulb className="w-4 h-4" />
              <span className="hidden sm:inline">Health Tips</span>
              <span className="sm:hidden">💡</span>
            </TabsTrigger>

            <TabsTrigger
              value="news"
              className="flex items-center justify-center gap-2 min-w-[100px] px-6 py-3 rounded-xl text-sm sm:text-base font-medium text-blue-700 border border-blue-200 bg-white shadow-sm data-[state=active]:!bg-blue-100 data-[state=active]:!text-blue-800"
            >
              <Newspaper className="w-4 h-4" />
              <span className="hidden sm:inline">News</span>
            </TabsTrigger>

            <TabsTrigger
              value="trivia"
              className="flex items-center justify-center gap-2 min-w-[100px] px-6 py-3 rounded-xl text-sm sm:text-base font-medium text-blue-700 border border-blue-200 bg-white shadow-sm data-[state=active]:!bg-blue-100 data-[state=active]:!text-blue-800"
            >
              <Brain className="w-4 h-4" />
              <span className="hidden sm:inline">Trivia</span>
            </TabsTrigger>

            <TabsTrigger
              value="relax"
              className="flex items-center justify-center gap-2 min-w-[120px] px-6 py-3 rounded-xl text-sm sm:text-base font-medium text-blue-700 border border-blue-200 bg-white shadow-sm data-[state=active]:!bg-blue-100 data-[state=active]:!text-blue-800"
            >
              <Wind className="w-4 h-4" />
              <span className="hidden sm:inline">Relaxation</span>
            </TabsTrigger>

            <TabsTrigger
              value="services"
              className="flex items-center justify-center gap-2 min-w-[110px] px-6 py-3 rounded-xl text-sm sm:text-base font-medium text-blue-700 border border-blue-200 bg-white shadow-sm data-[state=active]:!bg-blue-100 data-[state=active]:!text-blue-800"
            >
              <Building className="w-4 h-4" />
              <span className="hidden sm:inline">Services</span>
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

        {/* Info */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Important Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="font-medium text-green-800">What&apos;s Happening</h3>
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

        {/* Times */}
        <div className="text-center text-sm text-gray-500 space-y-1">
          <p>Current time: {currentTime.toLocaleString()}</p>
          {lastUpdated && <p>Data updated: {lastUpdated.toLocaleString()}</p>}
          <p>Page automatically updates every 5 seconds</p>
        </div>
      </div>
    </div>
  );
}
