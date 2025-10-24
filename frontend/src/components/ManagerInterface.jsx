import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { AlertTriangle, Clock } from "lucide-react";
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

  const activePatients = patients.filter(p => p.isActive && p.currentStage !== 'departed');
  
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="whiteboard">Whiteboard</TabsTrigger>
          <TabsTrigger value="stages">Stage Management</TabsTrigger>
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
              <CardTitle>Patient Whiteboard</CardTitle>
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
                  {activePatients.map((patient) => (
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
                  ))}
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
      </Tabs>
    </div>
  );
}