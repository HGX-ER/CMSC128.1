import { useState, useMemo, useEffect } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { AlertTriangle, Clock, MessageCircle, Filter, RefreshCw, TrendingUp } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";
import { toast } from 'sonner';

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

export function ManagerInterface({ 
  patients, 
  onUpdatePatient, 
  onMoveToStage, 
  onRemovePatient, 
  getTotalTime,
  getStageTime 
}) {
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [esiFilter, setEsiFilter] = useState('all');
  const [timeOrder, setTimeOrder] = useState('none');
  const [viewedFeedbackCount, setViewedFeedbackCount] = useState(0);
  
  // Backend feedback state
  const [backendFeedback, setBackendFeedback] = useState([]);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(true);
  const [lastFeedbackUpdate, setLastFeedbackUpdate] = useState(null);

  const activePatients = patients.filter(p => p.isActive && p.currentStage !== 'departed');
  
  // Fetch feedback from backend
  const fetchFeedback = async () => {
    try {
      setIsLoadingFeedback(true);
      const response = await fetch('http://localhost:5000/api/feedback');
      
      if (!response.ok) {
        throw new Error('Failed to fetch feedback');
      }
      
      const data = await response.json();
      setBackendFeedback(data.feedback || []);
      setLastFeedbackUpdate(new Date());
    } catch (error) {
      console.error('Error fetching feedback:', error);
      toast.error('Failed to load feedback');
    } finally {
      setIsLoadingFeedback(false);
    }
  };

  // Initial fetch and polling
  useEffect(() => {
    fetchFeedback();
    const interval = setInterval(fetchFeedback, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, []);

  // Listen for SSE events for real-time updates
  useEffect(() => {
    const eventSource = new EventSource('http://localhost:5000/stream/events');
    
    eventSource.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'patient_feedback') {
          fetchFeedback();
          toast.info('New patient feedback received!');
        }
      } catch (error) {
        console.error('Error parsing SSE event:', error);
      }
    });

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      eventSource.close();
    };

    return () => eventSource.close();
  }, []);
  
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
  }, [patients, esiFilter, timeOrder]);
  
  const getPatientsByStage = (stage) => {
    return activePatients.filter(p => p.currentStage === stage);
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

  const isOverThreshold = (patient, stage) => {
    const threshold = TIME_THRESHOLDS[stage];
    if (!threshold) return false;
    return getStageTime(patient, stage) > threshold;
  };

  const getStageAlerts = () => {
    const alerts = [];
    
    // Time threshold alerts
    activePatients.forEach(patient => {
      const threshold = TIME_THRESHOLDS[patient.currentStage];
      if (threshold && getStageTime(patient) > threshold) {
        alerts.push({
          type: 'time',
          message: `${patient.name} has been in ${STAGE_LABELS[patient.currentStage]} for ${getStageTime(patient)} minutes (threshold: ${threshold}m)`,
          patient: patient
        });
      }
    });

    // ESI 1-2 alerts
    activePatients.forEach(patient => {
      if ((patient.esiLevel === 1 || patient.esiLevel === 2) && getTotalTime(patient) > 30) {
        alerts.push({
          type: 'priority',
          message: `High priority patient ${patient.name} (ESI ${patient.esiLevel}) has been waiting ${getTotalTime(patient)} minutes`,
          patient: patient
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
    const average = total > 0 
      ? (allFeedback.reduce((sum, f) => sum + f.rating, 0) / total).toFixed(1)
      : 0;
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">ED Manager Dashboard</h1>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-lg px-4 py-2">
            Active Patients: {activePatients.length}
          </Badge>
          {lastFeedbackUpdate && (
            <span className="text-sm text-gray-500">
              Last updated: {lastFeedbackUpdate.toLocaleTimeString()}
            </span>
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

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="flex justify-between w-full space-x-3 overflow-x-auto pb-1 bg-transparent border-b pb-2">
          <TabsTrigger
            value="overview"
            className="
              flex items-center justify-center gap-2 min-w-[120px] px-6 py-3 rounded-xl text-sm sm:text-base font-medium
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
            Overview
          </TabsTrigger>
          
          <TabsTrigger
            value="whiteboard"
            className="
              flex items-center justify-center gap-2 min-w-[120px] px-6 py-3 rounded-xl text-sm sm:text-base font-medium
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
            Whiteboard
          </TabsTrigger>
          
          <TabsTrigger
            value="stages"
            className="
              flex items-center justify-center gap-2 min-w-[120px] px-6 py-3 rounded-xl text-sm sm:text-base font-medium
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
            Stage Management
          </TabsTrigger>
          
          <TabsTrigger
            value="feedback"
            onClick={() => setViewedFeedbackCount(totalFeedbackCount)}
            className="
              flex items-center justify-center gap-2 min-w-[120px] px-6 py-3 rounded-xl text-sm sm:text-base font-medium
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
            Patient Feedback
            {newFeedbackCount > 0 && (
              <Badge className="ml-1 bg-red-500 text-white px-2 py-0.5 text-xs">
                {newFeedbackCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Stage Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Object.entries(STAGE_LABELS).map(([stage, label]) => {
              const count = getPatientsByStage(stage).length;
              if (count === 0 && !['waiting_triage', 'waiting_registration', 'waiting_doctor', 'waiting_admission', 'waiting_observation', 'waiting_discharge'].includes(stage)) return null;
              
              return (
                <Card key={stage}>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold">{count}</div>
                    <div className="text-sm text-gray-600">{label}</div>
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
                  <span className="text-4xl">😠</span>
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
                  <span className="text-4xl">😄</span>
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

        <TabsContent value="whiteboard" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Patient Whiteboard</CardTitle>
                <div className="flex items-center gap-3">
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
                          ESI 1 (Critical)
                        </div>
                      </SelectItem>
                      <SelectItem value="2">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                          ESI 2 (Emergent)
                        </div>
                      </SelectItem>
                      <SelectItem value="3">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                          ESI 3 (Urgent)
                        </div>
                      </SelectItem>
                      <SelectItem value="4">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          ESI 4 (Less Urgent)
                        </div>
                      </SelectItem>
                      <SelectItem value="5">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          ESI 5 (Non-Urgent)
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
                    <TableHead>Diagnosis</TableHead>
                    <TableHead>Stage of Care</TableHead>
                    <TableHead>Stage Time</TableHead>
                    <TableHead>Alerts</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredActivePatients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center py-8 text-gray-500">
                        No patients found matching the selected ESI level filter.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredActivePatients.map((patient) => (
                      <TableRow key={patient.id}>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            {patient.id}
                          </Badge>
                        </TableCell>
                        <TableCell>{patient.arrivalTime.toLocaleTimeString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{getTotalTime(patient)}m</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{patient.name || 'Not registered'}</TableCell>
                        <TableCell>{getPatientAge(patient)}</TableCell>
                        <TableCell>{patient.sex || '-'}</TableCell>
                        <TableCell className="max-w-xs truncate">{patient.chiefComplaint || '-'}</TableCell>
                        <TableCell className="max-w-xs truncate">{patient.diagnosis || '-'}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Badge variant="outline">{STAGE_LABELS[patient.currentStage]}</Badge>
                            {patient.esiLevel && (
                              <Badge className={ESI_COLORS[patient.esiLevel]}>
                                ESI {patient.esiLevel}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={isOverThreshold(patient, patient.currentStage) ? "destructive" : "outline"}>
                            {getStageTime(patient)}m
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {(patient.esiLevel === 1 || patient.esiLevel === 2) && getTotalTime(patient) > 30 && (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          )}
                          {isOverThreshold(patient, patient.currentStage) && (
                            <Clock className="h-4 w-4 text-orange-500" />
                          )}
                        </TableCell>
                        <TableCell>
                          {patient.currentStage === 'awaiting_departure' && (
                            <Button 
                              size="sm" 
                              onClick={() => handleEndMonitoring(patient.id)}
                            >
                              End Monitoring
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

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

        <TabsContent value="feedback" className="space-y-6">
          {/* Feedback Header with Refresh */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Real-Time Patient Feedback</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    Patient satisfaction ratings and comments submitted during their ED visit
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
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
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
                  backendFeedback
                    .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at))
                    .map((feedback) => {
                      const satisfactionData = getSatisfactionEmoji(feedback.rating);
                      
                      // Color coding based on rating
                      let bgColor = 'bg-yellow-50 border-yellow-200';
                      let borderColor = 'border-l-yellow-500';
                      
                      if (feedback.rating <= 2) {
                        bgColor = 'bg-red-50 border-red-200';
                        borderColor = 'border-l-red-500';
                      } else if (feedback.rating === 3) {
                        bgColor = 'bg-orange-50 border-orange-200';
                        borderColor = 'border-l-orange-500';
                      } else if (feedback.rating === 4) {
                        bgColor = 'bg-yellow-50 border-yellow-200';
                        borderColor = 'border-l-yellow-500';
                      } else if (feedback.rating === 5) {
                        bgColor = 'bg-green-50 border-green-200';
                        borderColor = 'border-l-green-500';
                      }
                      
                      return (
                        <Card key={feedback.id} className={`border-l-4 ${borderColor}`}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-3">
                                  <Badge variant="outline" className="font-mono text-base px-3 py-1">
                                    {feedback.queue_number}
                                  </Badge>
                                  <Badge className={getRatingBadge(feedback.rating)}>
                                    {feedback.rating} / 5
                                  </Badge>
                                  <Badge variant="outline" className="text-sm">
                                    {feedback.stage_display_name || feedback.stage}
                                  </Badge>
                                </div>
                                
                                {/* Emoji Face Display */}
                                <div className="flex items-center gap-3 mb-2">
                                  <span className="text-6xl">{satisfactionData.emoji}</span>
                                  <div>
                                    <p className={`text-lg font-semibold ${satisfactionData.color}`}>
                                      {satisfactionData.label}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                      Rating: {feedback.rating} out of 5
                                    </p>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Clock className="w-4 h-4" />
                                {new Date(feedback.submitted_at).toLocaleString()}
                              </div>
                            </div>

                            {feedback.comment && (
                              <div className={`${bgColor} rounded-lg p-3 mt-2 border`}>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                  <MessageCircle className="w-4 h-4 inline mr-2 text-gray-600" />
                                  {feedback.comment}
                                </p>
                              </div>
                            )}

                            {feedback.patient_name && (
                              <div className="mt-3 pt-3 border-t text-sm text-gray-600">
                                <span className="font-medium">Patient:</span> {feedback.patient_name}
                                {feedback.priority_esi && (
                                  <span className="ml-3">
                                    <span className="font-medium">ESI:</span> {feedback.priority_esi}
                                  </span>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })
                )}
              </div>
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
                  {[1, 2, 3, 4, 5].map(rating => {
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
                      backendFeedback.reduce((acc, f) => {
                        const stage = f.stage_display_name || f.stage;
                        if (!acc[stage]) acc[stage] = { sum: 0, count: 0 };
                        acc[stage].sum += f.rating;
                        acc[stage].count += 1;
                        return acc;
                      }, {})
                    )
                      .sort((a, b) => (b[1].sum / b[1].count) - (a[1].sum / a[1].count))
                      .map(([stage, data]) => {
                        const avg = (data.sum / data.count).toFixed(1);
                        const avgRating = Math.round(avg);
                        const emojiData = getSatisfactionEmoji(avgRating);
                        const color = avg <= 2 ? 'text-red-600' : avg <= 3 ? 'text-orange-600' : 'text-green-600';
                        
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

                {/* Satisfaction Trend */}
                <div className="mt-6">
                  <h3 className="font-semibold mb-3">Overall Satisfaction</h3>
                  <div className="flex items-center justify-center gap-4 p-6 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg">
                    <span className="text-8xl">
                      {getSatisfactionEmoji(Math.round(feedbackStats.average)).emoji}
                    </span>
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