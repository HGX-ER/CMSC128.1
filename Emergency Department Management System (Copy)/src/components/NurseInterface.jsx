import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Users, 
  Clock, 
  Stethoscope, 
  Edit, 
  UserPlus, 
  Timer, 
  AlertTriangle,
  CheckCircle,
  ArrowRight
} from 'lucide-react';

const AVAILABLE_DOCTORS = [
  { username: 'dr.smith', name: 'Dr. Sarah Smith', specialty: 'Emergency Medicine' },
  { username: 'dr.johnson', name: 'Dr. Michael Johnson', specialty: 'Internal Medicine' },
  { username: 'dr.davis', name: 'Dr. Emily Davis', specialty: 'Pediatrics' },
  { username: 'dr.brown', name: 'Dr. James Brown', specialty: 'Surgery' }
];

const STAGE_DISPLAY_NAMES = {
  kiosk: 'Check-in',
  waiting_triage: 'Waiting for Triage',
  triage: 'Triage Assessment',
  waiting_registration: 'Waiting for Registration',
  registration: 'Registration',
  waiting_doctor: 'Waiting for Doctor',
  consultation: 'Doctor Consultation',
  waiting_admission: 'Admission Processing',
  waiting_observation: 'Observation Processing',
  waiting_discharge: 'Discharge Processing',
  admission_orders: 'Admission Orders',
  awaiting_non_icu: 'Awaiting Ward Transfer',
  awaiting_icu: 'Awaiting ICU Transfer',
  discharge_documents: 'Discharge Documents',
  awaiting_departure: 'Ready for Departure',
  departed: 'Departed'
};

export function NurseInterface({ 
  patients, 
  onUpdatePatient, 
  onMoveToStage, 
  getTotalTime, 
  getCurrentStageTime,
  onAdjustStageTime 
}) {
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [adjustTimeDialogOpen, setAdjustTimeDialogOpen] = useState(false);
  const [timeAdjustment, setTimeAdjustment] = useState({ hours: 0, minutes: 0 });

  const activePatients = patients.filter(p => p.isActive);
  const patientsNeedingDoctorAssignment = activePatients.filter(p => 
    !p.assignedDoctor && 
    ['waiting_doctor', 'consultation'].includes(p.currentStage)
  );

  // Calculate patient counts per doctor
  const getDoctorPatientCounts = () => {
    const counts = {};
    AVAILABLE_DOCTORS.forEach(doctor => {
      counts[doctor.username] = activePatients.filter(p => 
        p.assignedDoctor === doctor.username
      ).length;
    });
    return counts;
  };

  const doctorPatientCounts = getDoctorPatientCounts();

  // Get doctor load status for visual indicators
  const getDoctorLoadStatus = (patientCount) => {
    if (patientCount === 0) return { status: 'available', color: 'text-green-600', bgColor: 'bg-green-50' };
    if (patientCount <= 2) return { status: 'light', color: 'text-blue-600', bgColor: 'bg-blue-50' };
    if (patientCount <= 4) return { status: 'moderate', color: 'text-yellow-600', bgColor: 'bg-yellow-50' };
    return { status: 'heavy', color: 'text-red-600', bgColor: 'bg-red-50' };
  };

  const handleAssignDoctor = () => {
    if (selectedPatient && selectedDoctor) {
      onUpdatePatient(selectedPatient.id, { assignedDoctor: selectedDoctor });
      if (selectedPatient.currentStage === 'waiting_doctor') {
        onMoveToStage(selectedPatient.id, 'consultation');
      }
      setSelectedPatient(null);
      setSelectedDoctor('');
    }
  };

  const handleAdjustTime = () => {
    if (!selectedPatient) return;
    
    const currentStageIndex = selectedPatient.stageHistory.length - 1;
    const currentStage = selectedPatient.stageHistory[currentStageIndex];
    
    if (currentStage) {
      const adjustment = (timeAdjustment.hours * 60 + timeAdjustment.minutes) * 60 * 1000; // Convert to milliseconds
      const newStartTime = new Date(currentStage.startTime.getTime() - adjustment);
      onAdjustStageTime(selectedPatient.id, currentStageIndex, newStartTime);
    }
    
    setAdjustTimeDialogOpen(false);
    setTimeAdjustment({ hours: 0, minutes: 0 });
  };

  const getPatientPriorityColor = (patient) => {
    switch (patient.esiLevel) {
      case 1: return 'border-red-500 bg-red-50';
      case 2: return 'border-orange-500 bg-orange-50';
      case 3: return 'border-yellow-500 bg-yellow-50';
      case 4: return 'border-green-500 bg-green-50';
      case 5: return 'border-blue-500 bg-blue-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  const getESIBadgeColor = (esiLevel) => {
    switch (esiLevel) {
      case 1: return 'bg-red-100 text-red-800 border-red-200';
      case 2: return 'bg-orange-100 text-orange-800 border-orange-200';
      case 3: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 4: return 'bg-green-100 text-green-800 border-green-200';
      case 5: return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStageBadgeColor = (stage) => {
    const waitingStages = ['waiting_triage', 'waiting_registration', 'waiting_doctor', 'waiting_admission', 'waiting_observation', 'waiting_discharge'];
    const activeStages = ['triage', 'registration', 'consultation'];
    const processingStages = ['admission_orders', 'discharge_documents'];
    
    if (waitingStages.includes(stage)) return 'bg-yellow-100 text-yellow-800';
    if (activeStages.includes(stage)) return 'bg-blue-100 text-blue-800';
    if (processingStages.includes(stage)) return 'bg-purple-100 text-purple-800';
    return 'bg-gray-100 text-gray-800';
  };

  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{activePatients.length}</div>
                <div className="text-sm text-gray-600">Active Patients</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-orange-600" />
              <div>
                <div className="text-2xl font-bold">{patientsNeedingDoctorAssignment.length}</div>
                <div className="text-sm text-gray-600">Need Doctor Assignment</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold">
                  {activePatients.filter(p => p.currentStage.startsWith('waiting')).length}
                </div>
                <div className="text-sm text-gray-600">Patients Waiting</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-purple-600" />
              <div>
                <div className="text-2xl font-bold">
                  {activePatients.filter(p => p.assignedDoctor).length}
                </div>
                <div className="text-sm text-gray-600">Assigned to Doctors</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="patient-list" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="patient-list">Patient Management</TabsTrigger>
          <TabsTrigger value="doctor-workload">Doctor Workload</TabsTrigger>
          <TabsTrigger value="doctor-assignment">Doctor Assignment</TabsTrigger>
          <TabsTrigger value="time-adjustment">Time Management</TabsTrigger>
        </TabsList>

        {/* Patient List Tab */}
        <TabsContent value="patient-list" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Active Patients
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activePatients.map((patient) => (
                  <div 
                    key={patient.id}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md ${
                      selectedPatient?.id === patient.id ? 'ring-2 ring-blue-500' : ''
                    } ${getPatientPriorityColor(patient)}`}
                    onClick={() => setSelectedPatient(patient)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="font-semibold">
                            {patient.name || `Patient ${patient.id}`}
                          </div>
                          <div className="text-sm text-gray-600">
                            ID: {patient.id} • Age: {patient.age || 'N/A'}
                          </div>
                          {patient.chiefComplaint && (
                            <div className="text-sm text-gray-600 mt-1">
                              Complaint: {patient.chiefComplaint}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {patient.esiLevel && (
                          <Badge className={getESIBadgeColor(patient.esiLevel)}>
                            ESI {patient.esiLevel}
                          </Badge>
                        )}
                        
                        <Badge className={getStageBadgeColor(patient.currentStage)}>
                          {STAGE_DISPLAY_NAMES[patient.currentStage]}
                        </Badge>

                        <div className="text-right">
                          <div className="text-sm font-medium">
                            {getCurrentStageTime(patient)}m
                          </div>
                          <div className="text-xs text-gray-500">
                            Total: {getTotalTime(patient)}m
                          </div>
                        </div>
                      </div>
                    </div>

                    {patient.assignedDoctor && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                        <Stethoscope className="w-4 h-4" />
                        <span>
                          Assigned to: {AVAILABLE_DOCTORS.find(d => d.username === patient.assignedDoctor)?.name || patient.assignedDoctor}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Patient Details Panel */}
          {selectedPatient && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Patient Details - {selectedPatient.name || selectedPatient.id}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-sm text-gray-600">Queue ID</Label>
                      <div className="font-medium">{selectedPatient.id}</div>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">Age</Label>
                      <div className="font-medium">{selectedPatient.age || 'N/A'}</div>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">ESI Level</Label>
                      <div className="font-medium">
                        {selectedPatient.esiLevel ? `Level ${selectedPatient.esiLevel}` : 'Not assigned'}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">Total Time</Label>
                      <div className="font-medium">{formatTime(getTotalTime(selectedPatient))}</div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm text-gray-600">Stage History</Label>
                    <div className="mt-2 space-y-2">
                      {selectedPatient.stageHistory.map((stage, index) => {
                        const duration = stage.endTime 
                          ? Math.floor((stage.endTime.getTime() - stage.startTime.getTime()) / 1000 / 60)
                          : getCurrentStageTime(selectedPatient);
                        
                        return (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <div className="flex items-center gap-2">
                              <Badge className={getStageBadgeColor(stage.stage)}>
                                {STAGE_DISPLAY_NAMES[stage.stage]}
                              </Badge>
                              {!stage.endTime && (
                                <Badge variant="outline" className="text-green-600">Current</Badge>
                              )}
                            </div>
                            <div className="text-sm text-gray-600">
                              {formatTime(duration)} • Started: {stage.startTime.toLocaleTimeString()}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Doctor Workload Tab */}
        <TabsContent value="doctor-workload" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5" />
                Doctor Workload Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {AVAILABLE_DOCTORS.map((doctor) => {
                    const patientCount = doctorPatientCounts[doctor.username];
                    const loadStatus = getDoctorLoadStatus(patientCount);
                    const doctorPatients = activePatients.filter(p => p.assignedDoctor === doctor.username);
                    
                    return (
                      <Card key={doctor.username} className={`border-2 ${loadStatus.bgColor}`}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <div className="font-semibold">{doctor.name}</div>
                              <div className="text-sm text-gray-600">{doctor.specialty}</div>
                            </div>
                            <div className="text-right">
                              <div className={`text-2xl font-bold ${loadStatus.color}`}>
                                {patientCount}
                              </div>
                              <div className="text-sm text-gray-600">
                                {patientCount === 1 ? 'patient' : 'patients'}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between mb-3">
                            <Badge 
                              className={`${loadStatus.color} ${loadStatus.bgColor} border-current`}
                              variant="outline"
                            >
                              {loadStatus.status === 'available' && 'Available'}
                              {loadStatus.status === 'light' && 'Light Load'}
                              {loadStatus.status === 'moderate' && 'Moderate Load'}
                              {loadStatus.status === 'heavy' && 'Heavy Load'}
                            </Badge>
                          </div>

                          {doctorPatients.length > 0 && (
                            <div className="space-y-2">
                              <div className="text-sm font-medium text-gray-700">Current Patients:</div>
                              <div className="space-y-1">
                                {doctorPatients.map((patient) => (
                                  <div key={patient.id} className="flex items-center justify-between text-sm bg-white/50 p-2 rounded">
                                    <div>
                                      <span className="font-medium">{patient.name || patient.id}</span>
                                      {patient.esiLevel && (
                                        <Badge className={`ml-2 ${getESIBadgeColor(patient.esiLevel)}`} variant="outline">
                                          ESI {patient.esiLevel}
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="text-gray-600">
                                      <Badge className={getStageBadgeColor(patient.currentStage)} variant="outline">
                                        {STAGE_DISPLAY_NAMES[patient.currentStage]}
                                      </Badge>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {doctorPatients.length === 0 && (
                            <div className="text-center py-2 text-gray-500 text-sm">
                              No current patients
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Workload Summary */}
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="text-lg">Workload Distribution Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div className="p-3 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {AVAILABLE_DOCTORS.filter(d => doctorPatientCounts[d.username] === 0).length}
                        </div>
                        <div className="text-sm text-gray-600">Available</div>
                      </div>
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {AVAILABLE_DOCTORS.filter(d => doctorPatientCounts[d.username] >= 1 && doctorPatientCounts[d.username] <= 2).length}
                        </div>
                        <div className="text-sm text-gray-600">Light Load</div>
                      </div>
                      <div className="p-3 bg-yellow-50 rounded-lg">
                        <div className="text-2xl font-bold text-yellow-600">
                          {AVAILABLE_DOCTORS.filter(d => doctorPatientCounts[d.username] >= 3 && doctorPatientCounts[d.username] <= 4).length}
                        </div>
                        <div className="text-sm text-gray-600">Moderate Load</div>
                      </div>
                      <div className="p-3 bg-red-50 rounded-lg">
                        <div className="text-2xl font-bold text-red-600">
                          {AVAILABLE_DOCTORS.filter(d => doctorPatientCounts[d.username] > 4).length}
                        </div>
                        <div className="text-sm text-gray-600">Heavy Load</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Doctor Assignment Tab */}
        <TabsContent value="doctor-assignment" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Doctor Assignment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {patientsNeedingDoctorAssignment.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                    <div>All patients have been assigned to doctors</div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      <h3 className="font-semibold text-lg">Patients Needing Doctor Assignment</h3>
                      {patientsNeedingDoctorAssignment.map((patient) => (
                        <div 
                          key={patient.id}
                          className={`p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md ${
                            selectedPatient?.id === patient.id ? 'ring-2 ring-blue-500' : 'border-orange-300 bg-orange-50'
                          }`}
                          onClick={() => setSelectedPatient(patient)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-semibold">
                                {patient.name || `Patient ${patient.id}`}
                              </div>
                              <div className="text-sm text-gray-600">
                                ESI {patient.esiLevel} • Waiting: {getCurrentStageTime(patient)}m
                              </div>
                              {patient.chiefComplaint && (
                                <div className="text-sm text-gray-600">
                                  {patient.chiefComplaint}
                                </div>
                              )}
                            </div>
                            <Badge className="bg-orange-100 text-orange-800">
                              Needs Assignment
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>

                    {selectedPatient && (
                      <div className="p-4 border border-blue-300 bg-blue-50 rounded-lg">
                        <h4 className="font-semibold mb-4">
                          Assign Doctor to {selectedPatient.name || selectedPatient.id}
                        </h4>
                        
                        <div className="space-y-4">
                          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                            <div className="text-sm font-medium mb-2">Current Doctor Workload:</div>
                            <div className="flex flex-wrap gap-2">
                              {AVAILABLE_DOCTORS
                                .sort((a, b) => doctorPatientCounts[a.username] - doctorPatientCounts[b.username])
                                .map((doctor) => {
                                  const patientCount = doctorPatientCounts[doctor.username];
                                  const loadStatus = getDoctorLoadStatus(patientCount);
                                  
                                  return (
                                    <div key={doctor.username} className="flex items-center gap-1">
                                      <span className="text-sm">{doctor.name.split(' ')[1] || doctor.name}:</span>
                                      <Badge 
                                        className={`${loadStatus.color} ${loadStatus.bgColor} border-current text-xs`}
                                        variant="outline"
                                      >
                                        {patientCount}
                                      </Badge>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                          
                          <div>
                            <Label>Select Doctor (sorted by current workload)</Label>
                            <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                              <SelectTrigger>
                                <SelectValue placeholder="Choose a doctor" />
                              </SelectTrigger>
                              <SelectContent>
                                {AVAILABLE_DOCTORS
                                  .sort((a, b) => doctorPatientCounts[a.username] - doctorPatientCounts[b.username])
                                  .map((doctor) => {
                                    const patientCount = doctorPatientCounts[doctor.username];
                                    const loadStatus = getDoctorLoadStatus(patientCount);
                                    
                                    return (
                                      <SelectItem key={doctor.username} value={doctor.username}>
                                        <div className="flex items-center justify-between w-full">
                                          <div>
                                            <div className="font-medium">{doctor.name}</div>
                                            <div className="text-sm text-gray-600">{doctor.specialty}</div>
                                          </div>
                                          <div className="flex items-center gap-2 ml-4">
                                            <Badge 
                                              className={`${loadStatus.color} ${loadStatus.bgColor} border-current text-xs`}
                                              variant="outline"
                                            >
                                              {patientCount} patients
                                            </Badge>
                                          </div>
                                        </div>
                                      </SelectItem>
                                    );
                                  })}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <Button 
                            onClick={handleAssignDoctor}
                            disabled={!selectedDoctor}
                            className="w-full"
                          >
                            <ArrowRight className="w-4 h-4 mr-2" />
                            Assign Doctor
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Time Adjustment Tab */}
        <TabsContent value="time-adjustment" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Timer className="w-5 h-5" />
                Time Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <div className="font-medium text-blue-800">Time Adjustment Feature</div>
                      <div className="text-sm text-blue-700 mt-1">
                        Use this feature to adjust patient stage times when there are delays in documentation or system entry. 
                        Select a patient and specify how much time to subtract from their current stage.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold text-lg">Select Patient for Time Adjustment</h3>
                  {activePatients.map((patient) => (
                    <div 
                      key={patient.id}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md ${
                        selectedPatient?.id === patient.id ? 'ring-2 ring-blue-500' : 'border-gray-300 bg-gray-50'
                      }`}
                      onClick={() => setSelectedPatient(patient)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold">
                            {patient.name || `Patient ${patient.id}`}
                          </div>
                          <div className="text-sm text-gray-600">
                            Current Stage: {STAGE_DISPLAY_NAMES[patient.currentStage]} • {getCurrentStageTime(patient)}m
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            Total Time: {formatTime(getTotalTime(patient))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {selectedPatient && (
                  <div className="p-4 border border-blue-300 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold mb-4">
                      Adjust Time for {selectedPatient.name || selectedPatient.id}
                    </h4>
                    
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Hours to subtract</Label>
                          <Input
                            type="number"
                            min="0"
                            max="23"
                            value={timeAdjustment.hours}
                            onChange={(e) => setTimeAdjustment(prev => ({ ...prev, hours: parseInt(e.target.value) || 0 }))}
                          />
                        </div>
                        <div>
                          <Label>Minutes to subtract</Label>
                          <Input
                            type="number"
                            min="0"
                            max="59"
                            value={timeAdjustment.minutes}
                            onChange={(e) => setTimeAdjustment(prev => ({ ...prev, minutes: parseInt(e.target.value) || 0 }))}
                          />
                        </div>
                      </div>
                      
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                        <div className="text-sm text-yellow-800">
                          <strong>Current:</strong> {getCurrentStageTime(selectedPatient)} minutes in {STAGE_DISPLAY_NAMES[selectedPatient.currentStage]}
                          <br />
                          <strong>After adjustment:</strong> {Math.max(0, getCurrentStageTime(selectedPatient) - (timeAdjustment.hours * 60 + timeAdjustment.minutes))} minutes
                        </div>
                      </div>
                      
                      <Dialog open={adjustTimeDialogOpen} onOpenChange={setAdjustTimeDialogOpen}>
                        <DialogTrigger asChild>
                          <Button 
                            disabled={timeAdjustment.hours === 0 && timeAdjustment.minutes === 0}
                            className="w-full"
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Apply Time Adjustment
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Confirm Time Adjustment</DialogTitle>
                            <DialogDescription>
                              Are you sure you want to adjust the time for {selectedPatient.name || selectedPatient.id}?
                              This will subtract {timeAdjustment.hours}h {timeAdjustment.minutes}m from their current stage time.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="flex gap-2 pt-4">
                            <Button variant="outline" onClick={() => setAdjustTimeDialogOpen(false)} className="flex-1">
                              Cancel
                            </Button>
                            <Button onClick={handleAdjustTime} className="flex-1">
                              Confirm Adjustment
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}