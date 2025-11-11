import { useState, useMemo } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { AlertTriangle, Clock, Star, MessageCircle, Bell, Filter } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";

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
  const [viewedFeedbackCount, setViewedFeedbackCount] = useState(0);

  const activePatients = patients.filter(p => p.isActive && p.currentStage !== 'departed');
  
  // Calculate total feedback count
  const totalFeedbackCount = useMemo(() => {
    return activePatients.reduce((sum, patient) => {
      return sum + (patient.realtimeFeedback?.length || 0);
    }, 0);
  }, [activePatients]);
  
  // Calculate new feedback count
  const newFeedbackCount = Math.max(0, totalFeedbackCount - viewedFeedbackCount);
  
  // Filter patients by ESI level for whiteboard
  const getFilteredPatients = () => {
    if (esiFilter === 'all') return activePatients;
    return activePatients.filter(p => p.esiLevel && p.esiLevel.toString() === esiFilter);
  };
  
  const filteredActivePatients = getFilteredPatients();
  
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl">ED Manager Dashboard</h1>
        <Badge variant="outline" className="text-lg px-4 py-2">
          Active Patients: {activePatients.length}
        </Badge>
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
                      <TableCell colSpan={11} className="text-center py-8 text-gray-500">
                        No patients found matching the selected ESI level filter.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredActivePatients.map((patient) => (
                      <TableRow key={patient.id}>
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
                        <div className="font-medium">{patient.name || patient.id}</div>
                        <div className="text-gray-600">
                          {getStageTime(patient)}m in stage • {getTotalTime(patient)}m total
                        </div>
                        {patient.esiLevel && (
                          <Badge className={`${ESI_COLORS[patient.esiLevel]} text-xs`}>
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
          <Card>
            <CardHeader>
              <CardTitle>Real-Time Patient Feedback</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Patient satisfaction ratings and comments submitted during their ED visit
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activePatients
                  .filter(p => p.realtimeFeedback && p.realtimeFeedback.length > 0)
                  .length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                      <p>No patient feedback received yet</p>
                      <p className="text-sm mt-1">Feedback will appear here as patients submit ratings</p>
                    </div>
                  ) : (
                    activePatients
                      .filter(p => p.realtimeFeedback && p.realtimeFeedback.length > 0)
                      .map(patient => (
                        <Card key={patient.id} className="border-l-4 border-l-yellow-500">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <CardTitle className="text-lg">
                                  {patient.name || patient.id}
                                </CardTitle>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline">Queue: {patient.id}</Badge>
                                  {patient.esiLevel && (
                                    <Badge className={ESI_COLORS[patient.esiLevel]}>
                                      ESI {patient.esiLevel}
                                    </Badge>
                                  )}
                                  <Badge variant="outline">
                                    {STAGE_LABELS[patient.currentStage]}
                                  </Badge>
                                </div>
                              </div>
                              <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                                {patient.realtimeFeedback.length} feedback{patient.realtimeFeedback.length !== 1 ? 's' : ''}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              {patient.realtimeFeedback.map((feedback, index) => {
                                // Color coding based on rating
                                let starColor = 'fill-yellow-400 text-yellow-400';
                                let bgColor = 'bg-yellow-50 border-yellow-200';
                                if (feedback.rating <= 2) {
                                  starColor = 'fill-red-500 text-red-500';
                                  bgColor = 'bg-red-50 border-red-200';
                                } else if (feedback.rating === 3) {
                                  starColor = 'fill-orange-400 text-orange-400';
                                  bgColor = 'bg-orange-50 border-orange-200';
                                } else if (feedback.rating === 4) {
                                  starColor = 'fill-yellow-400 text-yellow-400';
                                  bgColor = 'bg-yellow-50 border-yellow-200';
                                } else if (feedback.rating === 5) {
                                  starColor = 'fill-green-500 text-green-500';
                                  bgColor = 'bg-green-50 border-green-200';
                                }
                                
                                return (
                                  <div
                                    key={index}
                                    className={`p-4 ${bgColor} border rounded-lg`}
                                  >
                                    <div className="flex items-start justify-between mb-2">
                                      <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-1">
                                          {[...Array(5)].map((_, i) => (
                                            <Star
                                              key={i}
                                              className={`w-4 h-4 ${
                                                i < feedback.rating ? starColor : 'text-gray-300'
                                              }`}
                                            />
                                          ))}
                                        </div>
                                        <span className="font-medium text-gray-800">
                                          {feedback.rating}/5
                                        </span>
                                        <span className="text-lg">
                                          {feedback.rating === 1 && '😞'}
                                          {feedback.rating === 2 && '😕'}
                                          {feedback.rating === 3 && '😐'}
                                          {feedback.rating === 4 && '😊'}
                                          {feedback.rating === 5 && '😄'}
                                        </span>
                                      </div>
                                      <div className="text-right">
                                        <Badge variant="outline" className="mb-1">
                                          {feedback.stageName}
                                        </Badge>
                                        <p className="text-xs text-gray-500">
                                          {new Date(feedback.submittedAt).toLocaleString()}
                                        </p>
                                      </div>
                                    </div>
                                    {feedback.comment && (
                                      <div className="mt-2 p-3 bg-white rounded border border-gray-200">
                                        <p className="text-sm text-gray-700">
                                          <MessageCircle className="w-4 h-4 inline mr-2 text-gray-600" />
                                          {feedback.comment}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </CardContent>
                        </Card>
                      ))
                  )}
              </div>
            </CardContent>
          </Card>

          {/* Feedback Summary Statistics */}
          {activePatients.filter(p => p.realtimeFeedback && p.realtimeFeedback.length > 0).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Feedback Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {[1, 2, 3, 4, 5].map(rating => {
                    const count = activePatients.reduce((acc, patient) => {
                      if (patient.realtimeFeedback) {
                        return acc + patient.realtimeFeedback.filter(f => f.rating === rating).length;
                      }
                      return acc;
                    }, 0);
                    
                    return (
                      <div key={rating} className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-center gap-1 mb-2">
                          {[...Array(rating)].map((_, i) => (
                            <Star
                              key={i}
                              className="w-3 h-3 fill-yellow-400 text-yellow-400"
                            />
                          ))}
                        </div>
                        <div className="text-2xl font-bold">{count}</div>
                        <div className="text-xs text-gray-600 mt-1">
                          {rating} star{rating !== 1 ? 's' : ''}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}