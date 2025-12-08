// frontend/src/components/ManagerInterface.jsx

import { useState, useMemo, useEffect } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { AlertTriangle, Clock, MessageCircle, Filter, RefreshCw, TrendingUp, Bell, MessageSquare, BellRing, Check, X } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";
import { toast } from 'sonner';

// Star component for ratings
function Star({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

const STAGE_LABELS = {
  kiosk: 'At Kiosk',
  waiting_triage: 'Waiting for Triage',
  triage: 'In Triage',
  waiting_registration: 'Waiting for Registration',
  registration: 'In Registration',
  waiting_doctor: 'Waiting to be seen by Doctor',
  consultation: 'In Consultation',
  waiting_admission: 'For Admission',
  waiting_observation: 'For Observation',
  waiting_discharge: 'For Discharge',
  admission_orders: 'Admitting Orders In',
  awaiting_non_icu: 'Awaiting transfer to Non-ICU',
  awaiting_icu: 'Awaiting transfer to ICU',
  discharge_documents: 'Discharge Documents In',
  awaiting_departure: 'Awaiting Departure from ED',
  departed: 'Departed'
};

const ESI_COLORS = {
  1: "bg-red-600 text-white",
  2: "bg-orange-500 text-white",
  3: "bg-yellow-500 text-black",
  4: "bg-green-500 text-white",
  5: "bg-blue-500 text-white"
};

const TIME_THRESHOLDS = {
  waiting_triage: 15,
  registration: 30,
  waiting_doctor: 60,
  consultation: 120,
  admission_orders: 60,
  awaiting_non_icu: 240,
  awaiting_icu: 60,
  discharge_documents: 30,
  awaiting_departure: 30
};

// Satisfaction emoji mapping
const SATISFACTION_EMOJIS = {
  1: { emoji: '😠', label: 'Very Unsatisfied', color: 'text-red-600' },
  2: { emoji: '😕', label: 'Unsatisfied', color: 'text-orange-500' },
  3: { emoji: '😐', label: 'Neutral', color: 'text-yellow-500' },
  4: { emoji: '🙂', label: 'Satisfied', color: 'text-green-500' },
  5: { emoji: '😄', label: 'Very Satisfied', color: 'text-green-600' }
};

export function ManagerInterface({ patients, onUpdatePatient, onMoveToStage, onRemovePatient, getTotalTime, getStageTime }) {
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [esiFilter, setEsiFilter] = useState('all');
  const [timeOrder, setTimeOrder] = useState('none');
  const [viewedFeedbackCount, setViewedFeedbackCount] = useState(0);
  
  // ✅ ADDED: Toggle for showing departed patients
  const [showDeparted, setShowDeparted] = useState(false);

  // Backend feedback state
  const [backendFeedback, setBackendFeedback] = useState([]);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);
  const [lastFeedbackUpdate, setLastFeedbackUpdate] = useState(null);
  const [newFeedbackPatients, setNewFeedbackPatients] = useState(new Set());
  const [backendAvailable, setBackendAvailable] = useState(false);

  // Notification state
  const [readFeedbackIds, setReadFeedbackIds] = useState(new Set());

  // Notification sound
  const [playNotificationSound] = useState(() => {
    const audioContext = typeof AudioContext !== 'undefined' ? new AudioContext() : null;
    return () => {
      if (!audioContext) return;
      try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
      } catch (error) {
        console.log('Audio notification not available');
      }
    };
  });

// ✅ CORRECT: Show ALL patients when showDeparted is true
const activePatients = showDeparted 
  ? patients  // Show ALL patients including departed
  : patients.filter(p => p.currentStage !== 'departed'); // Hide departed only

  
  // ✅ ADDED: Separate list for departed patients
  const departedPatients = patients.filter(p => p.currentStage === 'departed' || !p.isActive);

  // Fetch feedback from backend
  const fetchFeedback = async () => {
    try {
      setIsLoadingFeedback(true);
      const response = await fetch('http://localhost:5000/api/feedback', {
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });

      if (!response.ok) {
        throw new Error('Failed to fetch feedback');
      }

      const data = await response.json();
      const newFeedback = data.feedback || [];

      // Mark backend as available
      setBackendAvailable(true);

      // Check for new feedback
      if (backendFeedback.length > 0 && newFeedback.length > backendFeedback.length) {
        const latestFeedback = newFeedback[0];

        // Show toast notification
        toast.success('🔔 New patient feedback received!', {
          description: `${latestFeedback.queue_number} rated ${latestFeedback.rating}/5 at ${latestFeedback.stage_display_name || latestFeedback.stage}`,
          duration: 5000,
        });

        // Play notification sound
        playNotificationSound();

        // Add to blinking patients
        setNewFeedbackPatients(prev => {
          const updated = new Set(prev);
          updated.add(latestFeedback.queue_number);
          return updated;
        });

        // Remove from blinking after 10 seconds
        setTimeout(() => {
          setNewFeedbackPatients(prev => {
            const updated = new Set(prev);
            updated.delete(latestFeedback.queue_number);
            return updated;
          });
        }, 10000);
      }

      setBackendFeedback(newFeedback);
      setLastFeedbackUpdate(new Date());
    } catch (error) {
      // Silently mark backend as unavailable
      setBackendAvailable(false);
      if (backendAvailable) {
        console.log('Backend not available - using local feedback only');
      }
    } finally {
      setIsLoadingFeedback(false);
    }
  };

  // Initial fetch and polling
  useEffect(() => {
    fetchFeedback();
    const interval = setInterval(fetchFeedback, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, []);

  // Listen for SSE events for real-time updates
  useEffect(() => {
    if (!backendAvailable) return;

    let eventSource;
    try {
      eventSource = new EventSource('http://localhost:5000/stream/events');

      eventSource.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'patient_feedback') {
            fetchFeedback();
          }
        } catch (error) {
          console.error('Error parsing SSE event:', error);
        }
      });

      eventSource.onerror = () => {
        setBackendAvailable(false);
        if (eventSource) {
          eventSource.close();
        }
      };
    } catch (error) {
      console.log('SSE not available');
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [backendAvailable]);

  // Calculate total feedback count (backend + local)
  const totalFeedbackCount = useMemo(() => {
    const localCount = activePatients.reduce((sum, patient) => {
      return sum + (patient.realtimeFeedback?.length || 0);
    }, 0);
    return backendFeedback.length + localCount;
  }, [activePatients, backendFeedback.length]);

  // Calculate new feedback count
  const newFeedbackCount = Math.max(0, totalFeedbackCount - viewedFeedbackCount);

  // Filter patients by ESI level for whiteboard
  const getFilteredPatients = () => {
    if (esiFilter === 'all') return activePatients;
    return activePatients.filter(p => p.esiLevel && p.esiLevel.toString() === esiFilter);
  };

  const filteredActivePatients = useMemo(() => {
    const arr = getFilteredPatients().slice();
    if (timeOrder === 'newest') {
      arr.sort((a, b) => new Date(b.arrivalTime) - new Date(a.arrivalTime));
    } else if (timeOrder === 'oldest') {
      arr.sort((a, b) => new Date(a.arrivalTime) - new Date(b.arrivalTime));
    }
    return arr;
  }, [patients, esiFilter, timeOrder, showDeparted]);

  const getPatientsByStage = (stage) => {
    // ✅ UPDATED: Include departed in count if showing departed
    if (stage === 'departed') {
      return departedPatients;
    }
    return activePatients.filter(p => p.currentStage === stage);
  };

  // NEW helper: total patients in the admission pipeline
const getForAdmissionTotal = () => {
  const admissionStages = [
    "waitingadmission",   // For Admission
    "admissionorders",    // Admitting Orders In
    "awaitingnonicu",     // Awaiting transfer to Non-ICU
    "awaitingicu",        // Awaiting transfer to ICU
  ];
  return admissionStages.reduce(
    (sum, s) => sum + getPatientsByStage(s).length,
    0
  );
};

  const handleEndMonitoring = (patientId) => {
    onMoveToStage(patientId, 'departed');
    onUpdatePatient(patientId, { isActive: false });
  };

  const getPatientAge = (patient) => {
    if (patient.age) return `${patient.age}y`;
    if (patient.dateOfBirth) {
      const age = new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear();
      return `${age}y`;
    }
    return 'Unknown';
  };

  // Split stored diagnosis into doctor's note and ICD-10 list
const splitDiagnosis = (full) => {
  if (!full) return { note: "", icd: "" };

  const marker = "ICD-10 Codes:";
  const idx = full.indexOf(marker);

  if (idx === -1) {
    // No marker → treat whole thing as free-text note
    return { note: full.trim(), icd: "" };
  }

  const note = full.slice(0, idx).trim();
  const icd = full.slice(idx + marker.length).trim();

  return { note, icd };
};


  const isOverThreshold = (patient, stage) => {
    const threshold = TIME_THRESHOLDS[stage];
    if (!threshold) return false;
    return getStageTime(patient, stage) > threshold;
  };

const getStageAlerts = () => {
  const alerts = [];

  // 🔒 Only monitor non‑departed, active patients for alerts
  const monitoredPatients = activePatients.filter(
    (patient) => patient.currentStage !== 'departed' && patient.isActive !== false
  );

  // Time threshold alerts
  monitoredPatients.forEach(patient => {
    const threshold = TIME_THRESHOLDS[patient.currentStage];
    if (threshold && getStageTime(patient, patient.currentStage) > threshold) {
      alerts.push({
        type: 'time',
        message: `${patient.name} has been in ${STAGE_LABELS[patient.currentStage]} for ${getStageTime(patient, patient.currentStage)} minutes (threshold: ${threshold}m)`,
        patient,
      });
    }
  });

  // ESI 1–2 alerts
  monitoredPatients.forEach(patient => {
    if ((patient.esiLevel === 1 || patient.esiLevel === 2) && getTotalTime(patient) > 30) {
      alerts.push({
        type: 'priority',
        message: `High priority patient ${patient.name} (ESI ${patient.esiLevel}) has been waiting ${getTotalTime(patient)} minutes`,
        patient,
      });
    }
  });

  return alerts;
};


  const alerts = getStageAlerts();

  // Calculate feedback statistics
  const feedbackStats = useMemo(() => {
    const allFeedback = backendFeedback;
    const total = allFeedback.length;
    const average = total > 0 ? (allFeedback.reduce((sum, f) => sum + f.rating, 0) / total).toFixed(1) : 0;
    const lowSatisfaction = allFeedback.filter(f => f.rating <= 2).length;
    const highSatisfaction = allFeedback.filter(f => f.rating >= 4).length;
    return { total, average, lowSatisfaction, highSatisfaction };
  }, [backendFeedback]);

  const getRatingBadge = (rating) => {
    if (rating <= 2) return 'bg-red-100 text-red-800 border-red-200';
    if (rating === 3) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-green-100 text-green-800 border-green-200';
  };

  const getSatisfactionEmoji = (rating) => {
    return SATISFACTION_EMOJIS[rating] || SATISFACTION_EMOJIS[3];
  };

  // Calculate unread feedback count
  const unreadFeedbackCount = useMemo(() => {
    return backendFeedback.filter(f => !f.is_read && !readFeedbackIds.has(f.id)).length;
  }, [backendFeedback, readFeedbackIds]);

  // Get unread feedback items
  const unreadFeedback = useMemo(() => {
    return backendFeedback
      .filter(f => !f.is_read && !readFeedbackIds.has(f.id))
      .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at))
      .slice(0, 10); // Show latest 10 unread
  }, [backendFeedback, readFeedbackIds]);

  // Mark feedback as read
  const markAsRead = async (feedbackId) => {
    // save to UI immediately
    setReadFeedbackIds(prev => {
      const updated = new Set(prev);
      updated.add(feedbackId);
      return updated;
    });

    // save to backend
    try {
      await fetch(`http://localhost:5000/api/feedback/read/${feedbackId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
    } catch (err) {
      console.error("Failed to mark feedback as read:", err);
    }
  };

  // Mark feedback as unread
  const markAsUnread = async (feedbackId) => {
    setReadFeedbackIds(prev => {
      const updated = new Set(prev);
      updated.delete(feedbackId);
      return updated;
    });

    try {
      await fetch(`http://localhost:5000/api/feedback/unread/${feedbackId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
    } catch (err) {
      console.error("Failed to mark feedback as unread:", err);
    }
  };

  // Mark all as read
  const markAllAsRead = () => {
    const allIds = new Set(backendFeedback.map(f => f.id));
    setReadFeedbackIds(allIds);
    toast.success('All feedback marked as read');
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">ED Manager Dashboard</h1>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-lg px-4 py-2">
            Active Patients: {activePatients.length}
          </Badge>
          {lastFeedbackUpdate && (
            <Badge variant="outline" className="text-sm px-3 py-1">
              <Bell className="w-3 h-3 mr-1" />
              Last updated: {lastFeedbackUpdate.toLocaleTimeString()}
            </Badge>
          )}
          {unreadFeedbackCount > 0 && (
            <Badge className="bg-red-500 text-white animate-pulse">
              {unreadFeedbackCount} New Feedback
            </Badge>
          )}
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <AlertTriangle className="h-5 w-5" />
              Active Alerts ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.map((alert, index) => (
              <Alert key={index} className="border-orange-200">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{alert.message}</AlertDescription>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="flex justify-between w-full space-x-3 overflow-x-auto pb-1 bg-transparent border-b pb-2">
          <TabsTrigger value="overview" className="flex items-center justify-center gap-2 min-w-[120px] px-6 py-3 rounded-xl text-sm sm:text-base font-medium text-blue-700 border border-blue-200 bg-white shadow-sm transition-all duration-200 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-gray-800 data-[state=active]:!bg-blue-100 dark:data-[state=active]:!bg-blue-100 data-[state=active]:!text-blue-800 dark:data-[state=active]:!text-blue-800 data-[state=active]:!border-blue-300 dark:data-[state=active]:!border-blue-300 data-[state=active]:shadow-lg data-[state=active]:scale-1.05">
            Overview
          </TabsTrigger>

          <TabsTrigger value="whiteboard" className="flex items-center justify-center gap-2 min-w-[120px] px-6 py-3 rounded-xl text-sm sm:text-base font-medium text-blue-700 border border-blue-200 bg-white shadow-sm transition-all duration-200 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-gray-800 data-[state=active]:!bg-blue-100 dark:data-[state=active]:!bg-blue-100 data-[state=active]:!text-blue-800 dark:data-[state=active]:!text-blue-800 data-[state=active]:!border-blue-300 dark:data-[state=active]:!border-blue-300 data-[state=active]:shadow-lg data-[state=active]:scale-1.05">
            Whiteboard
          </TabsTrigger>

          <TabsTrigger value="stages" className="flex items-center justify-center gap-2 min-w-[120px] px-6 py-3 rounded-xl text-sm sm:text-base font-medium text-blue-700 border border-blue-200 bg-white shadow-sm transition-all duration-200 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-gray-800 data-[state=active]:!bg-blue-100 dark:data-[state=active]:!bg-blue-100 data-[state=active]:!text-blue-800 dark:data-[state=active]:!text-blue-800 data-[state=active]:!border-blue-300 dark:data-[state=active]:!border-blue-300 data-[state=active]:shadow-lg data-[state=active]:scale-1.05">
            Stage Management
          </TabsTrigger>

          <TabsTrigger 
            value="feedback" 
            onClick={() => setViewedFeedbackCount(totalFeedbackCount)}
            className="relative flex items-center justify-center gap-2 min-w-[120px] px-6 py-3 rounded-xl flex items-center justify-center gap-2 min-w-[120px] px-6 py-3 rounded-xl text-sm sm:text-base font-medium text-blue-700 border border-blue-200 bg-white shadow-sm transition-all duration-200 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-gray-800 data-[state=active]:!bg-blue-100 dark:data-[state=active]:!bg-blue-100 data-[state=active]:!text-blue-800 dark:data-[state=active]:!text-blue-800 data-[state=active]:!border-blue-300 dark:data-[state=active]:!border-blue-300 data-[state=active]:shadow-lg data-[state=active]:scale-1.05"
          >
            Patient Feedback
            {newFeedbackCount > 0 && (
              <span className="absolute right-2 top-1.5 w-3 h-3 bg-red-600 rounded-full animate-pulse"></span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Stage Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Object.entries(STAGE_LABELS).map(([stage, label]) => {
              const count = getPatientsByStage(stage).length;
              
              // ✅ UPDATED: Always show departed count
              if (count === 0 && stage !== 'departed' && !['waiting_triage', 'waiting_registration', 'waiting_doctor', 'waiting_admission', 'waiting_observation', 'waiting_discharge'].includes(stage)) {
                return null;
              }

              return (
                <Card key={stage} className={stage === 'departed' ? 'bg-gray-100 border-gray-300' : ''}>
                  <CardContent className="p-4 text-center">
                    <div className={`text-2xl font-bold ${stage === 'departed' ? 'text-gray-600' : ''}`}>
                      {count}
                    </div>
                    <div className={`text-sm ${stage === 'departed' ? 'text-gray-500' : 'text-gray-600'}`}>
                      {label}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Feedback Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Feedback</p>
                    <p className="text-2xl font-bold mt-1">{feedbackStats.total}</p>
                  </div>
                  <MessageCircle className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Average Rating</p>
                    <p className="text-2xl font-bold mt-1">{feedbackStats.average}</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Low Satisfaction</p>
                    <p className="text-2xl font-bold mt-1 text-red-600">{feedbackStats.lowSatisfaction}</p>
                  </div>
                  <div>
                    <span className="text-4xl">😕</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">High Satisfaction</p>
                    <p className="text-2xl font-bold mt-1 text-green-600">{feedbackStats.highSatisfaction}</p>
                  </div>
                  <div>
                    <span className="text-4xl">😄</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Registrations */}
          <Card>
            <CardHeader>
              <CardTitle>Recently Registered Patients</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activePatients
                  .filter(p => p.name)
                  .slice(0, 10)
                  .map((patient) => (
                    <div key={patient.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium">{patient.name}</div>
                        <div className="text-sm text-gray-600">
                          {getPatientAge(patient)} • {patient.sex} • {patient.chiefComplaint}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {patient.esiLevel && (
                          <Badge className={ESI_COLORS[patient.esiLevel]}>
                            ESI {patient.esiLevel}
                          </Badge>
                        )}
                        <Badge variant="outline">{STAGE_LABELS[patient.currentStage]}</Badge>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Whiteboard Tab */}
        <TabsContent value="whiteboard" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Patient Whiteboard</CardTitle>
                <div className="flex items-center gap-3">
                  {/* ✅ ADDED: Toggle for departed patients */}
                  <Button
                    variant={showDeparted ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowDeparted(!showDeparted)}
                    className="flex items-center gap-2"
                  >
                    {showDeparted ? (
                      <>
                        <Check className="w-4 h-4" />
                        Showing Departed
                      </>
                    ) : (
                      <>
                        <X className="w-4 h-4" />
                        Hide Departed
                      </>
                    )}
                  </Button>

                  <Filter className="w-4 h-4 text-gray-600" />
                  <Select value={esiFilter} onValueChange={setEsiFilter}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Filter by ESI Level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All ESI Levels</SelectItem>
                      <SelectItem value="1">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-red-600 rounded-full"></div>
                          ESI 1 - Critical
                        </div>
                      </SelectItem>
                      <SelectItem value="2">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                          ESI 2 - Emergent
                        </div>
                      </SelectItem>
                      <SelectItem value="3">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                          ESI 3 - Urgent
                        </div>
                      </SelectItem>
                      <SelectItem value="4">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          ESI 4 - Less Urgent
                        </div>
                      </SelectItem>
                      <SelectItem value="5">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          ESI 5 - Non-Urgent
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={timeOrder} onValueChange={setTimeOrder}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Order by time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Time</SelectItem>
                      <SelectItem value="newest">Newest First</SelectItem>
                      <SelectItem value="oldest">Oldest First</SelectItem>
                    </SelectContent>
                  </Select>

                  <Badge variant="outline" className="text-sm">
                    {filteredActivePatients.length} patients
                    {showDeparted && departedPatients.length > 0 && (
                      <span className="ml-2 text-gray-500">
                        ({departedPatients.length} departed)
                      </span>
                    )}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Queue</TableHead>
                    <TableHead>Time Arrival</TableHead>
                    <TableHead>Total Elapsed</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>Sex</TableHead>
                    <TableHead>Chief Complaint</TableHead>
                    <TableHead>Diagnosis (Doctor Note)</TableHead>
                    <TableHead>ICD-10 Codes</TableHead> 
                    <TableHead>Stage of Care</TableHead>
                    <TableHead>Stage Time</TableHead>
                    <TableHead>Feedback</TableHead>
                    <TableHead>Alerts</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredActivePatients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={13} className="text-center py-8 text-gray-500">
                        No patients found matching the selected ESI level filter.
                      </TableCell>
                    </TableRow>
                  ) : (
filteredActivePatients.map((patient) => {
  const hasNewFeedback = newFeedbackPatients.has(patient.id);
  const feedbackCount = backendFeedback.filter(
    (f) => f.queue_number === patient.id
  ).length;

  // ✅ ADDED: Gray out departed patients
  const isDeparted = patient.currentStage === "departed";

  // ✅ NEW: split diagnosis into doctor's note vs ICD-10 codes
  const { note: diagnosisNote, icd: icdCodes } = splitDiagnosis(
    patient.diagnosis
  );

  return (
    <TableRow
      key={patient.id}
      className={`
        ${hasNewFeedback ? "animate-pulse bg-green-50" : ""}
        ${isDeparted ? "bg-gray-100 opacity-60" : ""}
      `}
    >
      <TableCell>
        <Badge
          variant="outline"
          className={`font-mono ${isDeparted ? "bg-gray-200" : ""}`}
        >
          {patient.id}
        </Badge>
      </TableCell>

      <TableCell>{patient.arrivalTime.toLocaleTimeString()}</TableCell>

      <TableCell>
        <Badge variant="outline">{getTotalTime(patient)}m</Badge>
      </TableCell>

      <TableCell className="font-medium">
        {patient.name || "Not registered"}
      </TableCell>

      <TableCell>{getPatientAge(patient)}</TableCell>
      <TableCell>{patient.sex || "-"}</TableCell>

      <TableCell className="max-w-xs truncate">
        {patient.chiefComplaint || "-"}
      </TableCell>

      {/* ✅ NEW: doctor's diagnosis narrative */}
      <TableCell className="max-w-xs truncate">
        {diagnosisNote || "-"}
      </TableCell>

      {/* ✅ NEW: ICD-10 codes only */}
      <TableCell className="max-w-xs truncate font-mono text-xs">
        {icdCodes || "-"}
      </TableCell>

      <TableCell>
        <div className="space-y-1">
          <Badge
            variant={isDeparted ? "secondary" : "outline"}
            className={isDeparted ? "bg-gray-300 text-gray-700" : ""}
          >
            {STAGE_LABELS[patient.currentStage]}
          </Badge>
          {patient.esiLevel && (
            <Badge className={ESI_COLORS[patient.esiLevel]}>
              ESI {patient.esiLevel}
            </Badge>
          )}
        </div>
      </TableCell>

      <TableCell>
        <Badge
          variant={
            isOverThreshold(patient, patient.currentStage)
              ? "destructive"
              : "outline"
          }
        >
          {getStageTime(patient)}m
        </Badge>
      </TableCell>

      <TableCell>
        {feedbackCount > 0 && (
          <div className="flex items-center gap-1">
            <MessageSquare
              className={`w-4 h-4 ${
                hasNewFeedback
                  ? "text-green-600 animate-bounce"
                  : "text-blue-600"
              }`}
            />
            <Badge
              variant="outline"
              className={
                hasNewFeedback
                  ? "bg-green-100 border-green-500 text-green-800 animate-pulse"
                  : "bg-blue-100 border-blue-500 text-blue-800"
              }
            >
              {feedbackCount}
            </Badge>
          </div>
        )}
      </TableCell>

      <TableCell>
        {(patient.esiLevel === 1 || patient.esiLevel === 2) &&
          getTotalTime(patient) > 30 && (
            <AlertTriangle className="h-4 w-4 text-red-500" />
          )}
        {isOverThreshold(patient, patient.currentStage) && (
          <Clock className="h-4 w-4 text-orange-500" />
        )}
      </TableCell>

      <TableCell>
        {!isDeparted && patient.currentStage === "awaiting_departure" && (
          <Button size="sm" onClick={() => handleEndMonitoring(patient.id)}>
            End Monitoring
          </Button>
        )}
        {isDeparted && (
          <span className="text-gray-400 text-sm">Completed</span>
        )}
      </TableCell>
    </TableRow>
  );
})

                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stages Tab */}
        <TabsContent value="stages" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(STAGE_LABELS).map(([stage, label]) => {
              const stagePatients = getPatientsByStage(stage);
              if (stagePatients.length === 0) return null;

              return (
                <Card key={stage}>
                  <CardHeader>
                    <CardTitle className="text-lg">{label}</CardTitle>
                    <Badge variant="outline">{stagePatients.length} patients</Badge>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {stagePatients.map((patient) => (
                      <div key={patient.id} className="p-2 bg-gray-50 rounded text-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="font-mono text-xs">
                            {patient.id}
                          </Badge>
                          <div className="font-medium">{patient.name || 'Not registered'}</div>
                        </div>
                        <div className="text-gray-600">
                          {getStageTime(patient)}m in stage • {getTotalTime(patient)}m total
                        </div>
                        {patient.esiLevel && (
                          <Badge className={`${ESI_COLORS[patient.esiLevel]} text-xs mt-1`}>
                            ESI {patient.esiLevel}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Feedback Tab */}
        <TabsContent value="feedback" className="space-y-6">
          {/* Feedback Header with Refresh */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Real-Time Patient Feedback</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    Organized by patient - Click to view detailed feedback
                  </p>
                </div>
                <Button 
                  onClick={fetchFeedback}
                  disabled={isLoadingFeedback}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingFeedback ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingFeedback && backendFeedback.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50 animate-pulse" />
                  <p>Loading feedback...</p>
                </div>
              ) : backendFeedback.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>No patient feedback received yet</p>
                  <p className="text-sm mt-1">Feedback will appear here as patients submit ratings</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Group feedback by patient */}
                  {Object.entries(
                    backendFeedback.reduce((acc, feedback) => {
                      if (!acc[feedback.queue_number]) {
                        acc[feedback.queue_number] = [];
                      }
                      acc[feedback.queue_number].push(feedback);
                      return acc;
                    }, {})
                  )
                    .sort(([, feedbackA], [, feedbackB]) => {
                      // Sort by most recent feedback
                      const latestA = Math.max(...feedbackA.map(f => new Date(f.submitted_at).getTime()));
                      const latestB = Math.max(...feedbackB.map(f => new Date(f.submitted_at).getTime()));
                      return latestB - latestA;
                    })
                    .map(([queueNumber, patientFeedback]) => {
                      const latestFeedback = patientFeedback.sort((a, b) => 
                        new Date(b.submitted_at) - new Date(a.submitted_at)
                      )[0];
                      const hasNewFeedback = newFeedbackPatients.has(queueNumber);
                      // Separate stage feedback from overall satisfaction
                      const stageFeedback = patientFeedback.filter(f => f.stage !== 'departed');
                      const overallFeedback = patientFeedback.filter(f => f.stage === 'departed');

                      const avgRating = stageFeedback.length > 0 
                        ? (stageFeedback.reduce((sum, f) => sum + f.rating, 0) / stageFeedback.length).toFixed(1)
                        : '0.0';
                      const avgEmoji = getSatisfactionEmoji(Math.round(avgRating));


                      return (
                        <Card 
                          key={queueNumber}
                          className={`border-l-4 transition-all ${
                            hasNewFeedback 
                              ? 'border-l-green-500 bg-green-50 shadow-lg animate-pulse' 
                              : 'border-l-blue-500'
                          }`}
                        >
<CardHeader className="pb-3">
  <div className="flex items-start justify-between">
    <div className="flex-1">
      <div className="flex items-center gap-3 mb-2">
        <Badge variant="outline" className="font-mono text-lg px-4 py-1">
          {queueNumber}
        </Badge>
        {latestFeedback.patient_name && (
          <span className="font-semibold text-lg">{latestFeedback.patient_name}</span>
        )}
        {hasNewFeedback && (
          <Badge className="bg-green-500 text-white animate-bounce">
            <Bell className="w-3 h-3 mr-1" />
            NEW MESSAGE
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-3">
        {/* Stage Feedback Average */}
        {stageFeedback.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-3xl">{avgEmoji.emoji}</span>
            <div>
              <p className="text-sm text-gray-600">Stage Average</p>
              <p className="text-xl font-bold">{avgRating} / 5</p>
              <p className="text-xs text-gray-500">{stageFeedback.length} {stageFeedback.length === 1 ? 'review' : 'reviews'}</p>
            </div>
          </div>
        )}
        
        {/* Overall Visit */}
        {overallFeedback.length > 0 && (
          <div className={`flex items-center gap-2 ${stageFeedback.length > 0 ? 'border-l pl-3 ml-3' : ''}`}>
            <span className="text-3xl">{getSatisfactionEmoji(Math.round(overallFeedback[0].rating)).emoji}</span>
            <div>
              <p className="text-sm text-gray-600">Overall Visit</p>
              <p className="text-xl font-bold">{overallFeedback[0].rating} / 5</p>
            </div>
          </div>
        )}
        
        {latestFeedback.priority_esi && (
          <Badge className={ESI_COLORS[latestFeedback.priority_esi]}>
            ESI {latestFeedback.priority_esi}
          </Badge>
        )}
      </div>
    </div>
    <div className="text-sm text-gray-500">
      <p>Latest feedback:</p>
      <p className="font-medium">{new Date(latestFeedback.submitted_at).toLocaleString()}</p>
    </div>
  </div>
</CardHeader>

                          <CardContent>
                            <div className="space-y-3">
                              {patientFeedback
                                .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at))
                                .map((feedback, index) => {
                                  const satisfactionData = getSatisfactionEmoji(feedback.rating);
                                  const isRead = feedback.is_read || readFeedbackIds.has(feedback.id);

                                  let bgColor = 'bg-gray-50';
                                  if (feedback.rating <= 2) bgColor = 'bg-red-50';
                                  else if (feedback.rating === 3) bgColor = 'bg-orange-50';
                                  else if (feedback.rating === 4) bgColor = 'bg-yellow-50';
                                  else if (feedback.rating === 5) bgColor = 'bg-green-50';

                                  return (
                                    <div 
                                      key={feedback.id} 
                                      className={`${bgColor} rounded-lg p-4 border ${
                                        index === 0 && hasNewFeedback 
                                          ? 'border-green-500 border-2' 
                                          : 'border-gray-200'
                                      }`}
                                    >
                                      <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-3">
                                          <span className="text-4xl">{satisfactionData.emoji}</span>
                                          <div>
                                            <div className="flex items-center gap-2 mb-1">
                                              <Badge className={getRatingBadge(feedback.rating)}>
                                                {feedback.rating} / 5
                                              </Badge>
                                              <Badge variant="outline">
                                                {feedback.stage_display_name || feedback.stage}
                                              </Badge>
                                              {index === 0 && hasNewFeedback && (
                                                <Badge className="bg-green-500 text-white text-xs">
                                                  NEW
                                                </Badge>
                                              )}
                                            </div>
                                            <p className={`font-semibold ${satisfactionData.color}`}>
                                              {satisfactionData.label}
                                            </p>
                                          </div>
                                        </div>
                                        <div className="text-xs text-gray-500 flex items-center gap-1">
                                          <Clock className="w-3 h-3" />
                                          {new Date(feedback.submitted_at).toLocaleString()}
                                        </div>
                                      </div>

                                      {feedback.comment && (
                                        <div className="mt-3 p-3 bg-white rounded border border-gray-200">
                                          <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                            <MessageCircle className="w-4 h-4 inline mr-2 text-gray-600" />
                                            {feedback.comment}
                                          </p>
                                        </div>
                                      )}

                                      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                                        <div className="flex items-center gap-3">
                                          {index === 0 && (
                                            <Badge variant="outline" className="text-xs">
                                              Latest Feedback
                                            </Badge>
                                          )}
                                          <span>Feedback {patientFeedback.length - index}</span>
                                          {isRead ? (
                                            <Badge className="bg-gray-100 text-gray-600 text-xs">
                                              <Check className="w-3 h-3 mr-1" />
                                              Read
                                            </Badge>
                                          ) : (
                                            <Badge className="bg-blue-100 text-blue-700 text-xs animate-pulse">
                                              <BellRing className="w-3 h-3 mr-1" />
                                              Unread
                                            </Badge>
                                          )}
                                        </div>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => isRead ? markAsUnread(feedback.id) : markAsRead(feedback.id)}
                                          className="h-6 text-xs"
                                        >
                                          {isRead ? (
                                            <>
                                              <X className="w-3 h-3 mr-1" />
                                              Mark unread
                                            </>
                                          ) : (
                                            <>
                                              <Check className="w-3 h-3 mr-1" />
                                              Mark read
                                            </>
                                          )}
                                        </Button>
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Feedback Summary Statistics */}
          {backendFeedback.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Feedback Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {[1, 2, 3, 4, 5].map((rating) => {
                    const count = backendFeedback.filter(f => f.rating === rating).length;
                    const percentage = ((count / backendFeedback.length) * 100).toFixed(1);
                    const satisfactionData = getSatisfactionEmoji(rating);

                    return (
                      <div key={rating} className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-center mb-2">
                          <span className="text-4xl">{satisfactionData.emoji}</span>
                        </div>
                        <div className="text-2xl font-bold">{count}</div>
                        <div className="text-xs text-gray-600 mt-1">
                          {satisfactionData.label}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {percentage}%
                        </div>
                      </div>
                    );
                  })}
                </div>

{/* Average by Stage */}
<div className="mt-6">
  <h3 className="font-semibold mb-3">Average Rating by Stage</h3>
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
    {Object.entries(
      backendFeedback
        .filter(f => f.stage !== 'departed') // ← Exclude overall satisfaction
        .reduce((acc, f) => {
          const stage = f.stage_display_name || f.stage;
          if (!acc[stage]) acc[stage] = { sum: 0, count: 0 };
          acc[stage].sum += f.rating;
          acc[stage].count += 1;
          return acc;
        }, {})
    )
    .sort(([, a], [, b]) => (b.sum / b.count) - (a.sum / a.count))
    .map(([stage, data]) => {
      const avg = (data.sum / data.count).toFixed(1);
      const avgRating = Math.round(avg);
      const emojiData = getSatisfactionEmoji(avgRating);
      const color = avg < 2 ? 'text-red-600' : avg < 3 ? 'text-orange-600' : 'text-green-600';
      
      return (
        <div key={stage} className="flex justify-between items-center p-3 bg-white rounded border">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{emojiData.emoji}</span>
            <span className="text-sm font-medium truncate">{stage}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-lg font-bold ${color}`}>{avg}</span>
            <Badge variant="outline" className="text-xs">
              {data.count} {data.count === 1 ? 'review' : 'reviews'}
            </Badge>
          </div>
        </div>
      );
    })}
  </div>
</div>

{/* Overall Visit Satisfaction (separate from stages) */}
{backendFeedback.filter(f => f.stage === 'departed').length > 0 && (
  <div className="mt-6">
    <h3 className="font-semibold mb-3">Overall Visit Satisfaction</h3>
    <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
      {(() => {
        const overallFeedback = backendFeedback.filter(f => f.stage === 'departed');
        const avgRating = (overallFeedback.reduce((sum, f) => sum + f.rating, 0) / overallFeedback.length).toFixed(1);
        const emojiData = getSatisfactionEmoji(Math.round(avgRating));
        
        return (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-5xl">{emojiData.emoji}</span>
              <div>
                <p className="text-2xl font-bold">{avgRating} / 5.0</p>
                <p className="text-sm text-gray-600">
                  {overallFeedback.length} {overallFeedback.length === 1 ? 'response' : 'responses'}
                </p>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  </div>
)}




                {/* Satisfaction Trend */}
                <div className="mt-6">
                  <h3 className="font-semibold mb-3">Overall Satisfaction</h3>
                  <div className="flex items-center justify-center gap-4 p-6 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg">
                    <span className="text-8xl">{getSatisfactionEmoji(Math.round(feedbackStats.average)).emoji}</span>
                    <div>
                      <p className="text-4xl font-bold text-gray-800">{feedbackStats.average}</p>
                      <p className="text-lg text-gray-600">out of 5.0</p>
                      <p className="text-sm text-gray-500 mt-1">
                        Based on {feedbackStats.total} {feedbackStats.total === 1 ? 'review' : 'reviews'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
