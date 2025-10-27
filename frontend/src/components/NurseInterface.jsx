import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Users, Clock, Stethoscope, Edit, UserPlus, Timer, CheckCircle, ArrowRight } from 'lucide-react';

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

// Keep names/usernames exactly as the backend provides.
// No forced renames, no local fallbacks.
const normalizeDoctor = (raw) => ({
  username: raw?.username || raw?.user?.username || raw?.id || "",
  name: raw?.name || raw?.user?.name || raw?.full_name || "",
  specialty: raw?.specialty || raw?.department || 'General Medicine',
});

export function NurseInterface({
  patients,
  onUpdatePatient,
  onMoveToStage,
  getTotalTime,
  getCurrentStageTime,
  onAdjustStageTime,
  nurseName
}) {
  const [availableDoctors, setAvailableDoctors] = useState([]); // ← only DB
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [adjustTimeDialogOpen, setAdjustTimeDialogOpen] = useState(false);
  const [timeAdjustment, setTimeAdjustment] = useState({ hours: 0, minutes: 0 });

  // Load doctors from backend (no local injection)
  useEffect(() => {
    const loadDoctors = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/doctors');
        if (!res.ok) throw new Error('No /api/doctors');
        const list = await res.json();
        const normalized = Array.isArray(list) ? list.map(normalizeDoctor) : [];
        setAvailableDoctors(normalized);
      } catch {
        setAvailableDoctors([]); // if API fails, show none (no fake dr.smith)
      }
    };
    loadDoctors();
  }, []);

  // Auto-refresh from backend so names and stages reflect live data
  useEffect(() => {
    const fetchUpdatedPatients = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/board");
        if (!response.ok) throw new Error("Failed to fetch updated patient data");
        const data = await response.json();
        if (Array.isArray(data)) onUpdatePatient(null, data);
      } catch (err) {
        console.error("❌ Error fetching latest board data:", err);
      }
    };
    fetchUpdatedPatients();
    const interval = setInterval(fetchUpdatedPatients, 5000);
    return () => clearInterval(interval);
  }, [onUpdatePatient]);

  // Auto-assign nurse on first sighting (kept as-is)
  useEffect(() => {
    if (patients && nurseName) {
      patients.forEach((p) => {
        if (!p.assignedNurse && (p.full_name || p.name)) handleAssignNurse(p);
      });
    }
  }, [patients, nurseName]);

  const activeEarlyStagePatients = patients
    .filter(p => p.isActive)
    // Hide anything after registration phase
    .filter(p => ![
      'waiting_doctor','consultation','waiting_admission','waiting_observation','waiting_discharge',
      'admission_orders','awaiting_non_icu','awaiting_icu','discharge_documents','awaiting_departure','departed'
    ].includes(p.currentStage));

  const patientsNeedingDoctorAssignment = patients
    .filter(p => p.isActive)
    .filter(p => !p.assignedDoctor && ['waiting_doctor', 'consultation'].includes(p.currentStage));

  const getDoctorPatientCounts = () => {
    const counts = {};
    availableDoctors.forEach((doctor) => {
      counts[doctor.username] = patients.filter((p) => p.isActive && p.assignedDoctor === doctor.username).length;
    });
    return counts;
  };

  const doctorPatientCounts = getDoctorPatientCounts();

  const getDoctorLoadStatus = (patientCount) => {
    if (patientCount === 0) return { status: 'available', color: 'text-green-600', bgColor: 'bg-green-50' };
    if (patientCount <= 2) return { status: 'light', color: 'text-blue-600', bgColor: 'bg-blue-50' };
    if (patientCount <= 4) return { status: 'moderate', color: 'text-yellow-600', bgColor: 'bg-yellow-50' };
    return { status: 'heavy', color: 'text-red-600', bgColor: 'bg-red-50' };
  };

  const handleAssignDoctor = async () => {
    if (selectedPatient && selectedDoctor) {
      try {
        const res = await fetch("http://localhost:5000/api/board/assign-doctor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            encounter_id: selectedPatient.encounter_id || selectedPatient.id,
            doctor_username: selectedDoctor
          }),
        });
        if (!res.ok) throw new Error('backend rejected');
      } catch (e) {
        console.warn("assign-doctor fallback to local state:", e);
      }
      // Reflect immediately in UI
      onUpdatePatient(selectedPatient.id, { assignedDoctor: selectedDoctor });
      setSelectedPatient(null);
      setSelectedDoctor('');
    }
  };

  const handleAdjustTime = async () => {
    if (!selectedPatient) return;
    const currentStageIndex = (selectedPatient.stageHistory?.length || 0) - 1;
    const currentStage = selectedPatient.stageHistory?.[currentStageIndex];
    if (!currentStage) return;

    const adjustmentMs = (timeAdjustment.hours * 60 + timeAdjustment.minutes) * 60 * 1000;
    const newStart = new Date(new Date(currentStage.startTime).getTime() - adjustmentMs);

    // Try backend; fall back to local handler
    try {
      const res = await fetch("http://localhost:5000/api/board/adjust-stage-time", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          encounter_id: selectedPatient.encounter_id || selectedPatient.id,
          stage_index: currentStageIndex,
          new_start_time: newStart.toISOString(),
        }),
      });
      if (!res.ok) throw new Error("adjust-stage-time not available");
    } catch (e) {
      onAdjustStageTime(selectedPatient.id, currentStageIndex, newStart);
    }

    setAdjustTimeDialogOpen(false);
    setTimeAdjustment({ hours: 0, minutes: 0 });
  };

  const handleAssignNurse = async (patient) => {
    try {
      await fetch("http://localhost:5000/api/board/assign-nurse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          encounter_id: patient.encounter_id || patient.id,
          nurse_username: nurseName?.toLowerCase(),
        }),
      });
    } catch (err) {
      console.error("❌ Failed to assign nurse:", err);
    }
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
    const waitingStages = ['waiting_triage','waiting_registration','waiting_doctor','waiting_admission','waiting_observation','waiting_discharge'];
    const activeStages = ['triage','registration','consultation'];
    const processingStages = ['admission_orders','discharge_documents'];
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
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-blue-600">Hello, Nurse {nurseName} 👋</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><Users className="w-5 h-5 text-blue-500 mb-2"/><div className="text-2xl font-bold">{activeEarlyStagePatients.length}</div><p className="text-sm text-gray-600">Active Patients</p></CardContent></Card>
        <Card><CardContent className="p-4"><UserPlus className="w-5 h-5 text-orange-500 mb-2"/><div className="text-2xl font-bold">{patientsNeedingDoctorAssignment.length}</div><p className="text-sm text-gray-600">Need Doctor Assignment</p></CardContent></Card>
        <Card><CardContent className="p-4"><Clock className="w-5 h-5 text-green-500 mb-2"/><div className="text-2xl font-bold">{activeEarlyStagePatients.filter((p) => p.currentStage.startsWith('waiting')).length}</div><p className="text-sm text-gray-600">Patients Waiting</p></CardContent></Card>
        <Card><CardContent className="p-4"><Stethoscope className="w-5 h-5 text-purple-500 mb-2"/><div className="text-2xl font-bold">{patients.filter((p) => p.isActive && p.assignedDoctor).length}</div><p className="text-sm text-gray-600">Assigned to Doctors</p></CardContent></Card>
      </div>

      <Tabs defaultValue="patient-list" className="w-full">
        <TabsList className="flex justify-center gap-4 border-b pb-2">
          <TabsTrigger value="patient-list">Patient Management</TabsTrigger>
          <TabsTrigger value="doctor-workload">Doctor Workload</TabsTrigger>
          <TabsTrigger value="doctor-assignment">Doctor Assignment</TabsTrigger>
          <TabsTrigger value="time-adjustment">Time Management</TabsTrigger>
        </TabsList>

        <TabsContent value="patient-list" className="mt-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" />Active Patients</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activeEarlyStagePatients.map((patient) => (
                  <div key={patient.id} className={`p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md ${getPatientPriorityColor(patient)}`} onClick={() => setSelectedPatient(patient)}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-gray-900">{patient.full_name?.trim() ? patient.full_name : patient.name || `Patient ${patient.queue_number || patient.id}`}</div>
                        <div className="text-sm text-gray-600">Queue: {patient.queue_number || patient.id} • Age: {patient.age || 'N/A'}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {patient.esiLevel && (<Badge className={getESIBadgeColor(patient.esiLevel)}>ESI {patient.esiLevel}</Badge>)}
                        <Badge className={getStageBadgeColor(patient.currentStage)}>{STAGE_DISPLAY_NAMES[patient.currentStage]}</Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {selectedPatient && (
            <Card className="mt-6">
              <CardHeader><CardTitle>Patient Details - {selectedPatient.full_name?.trim() ? selectedPatient.full_name : selectedPatient.name || selectedPatient.queue_number || selectedPatient.id}</CardTitle></CardHeader>
              <CardContent>
                <p><strong>Queue:</strong> {selectedPatient.queue_number || selectedPatient.id}</p>
                <p><strong>ESI Level:</strong> {selectedPatient.esiLevel ? `Level ${selectedPatient.esiLevel}` : 'Not assigned'}</p>
                <p><strong>Total Time:</strong> {formatTime(getTotalTime(selectedPatient))}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="doctor-workload" className="mt-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Stethoscope className="w-5 h-5" />Doctor Workload Overview</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableDoctors.map((doctor) => {
                  const patientCount = doctorPatientCounts[doctor.username] || 0;
                  const loadStatus = getDoctorLoadStatus(patientCount);
                  const doctorPatients = patients.filter((p) => p.isActive && p.assignedDoctor === doctor.username);
                  return (
                    <Card key={doctor.username} className={`border-2 ${loadStatus.bgColor}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div><div className="font-semibold">{doctor.name}</div><div className="text-sm text-gray-600">{doctor.specialty}</div></div>
                          <div className={`text-2xl font-bold ${loadStatus.color}`}>{patientCount}</div>
                        </div>
                        {doctorPatients.map((p) => (
                          <div key={p.id} className="text-sm bg-white/50 p-2 rounded mt-1 flex justify-between">
                            <span>{p.full_name || p.name}</span>
                            <Badge className={getStageBadgeColor(p.currentStage)} variant="outline">{STAGE_DISPLAY_NAMES[p.currentStage]}</Badge>
                          </div>
                        ))}
                        {doctorPatients.length === 0 && (<div className="text-center text-sm text-gray-500 mt-2">No current patients</div>)}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="doctor-assignment" className="mt-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><UserPlus className="w-5 h-5" />Doctor Assignment</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-6">
                {patientsNeedingDoctorAssignment.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="w-10 h-10 mx-auto text-green-500 mb-2" />
                    <div>All patients have been assigned to doctors</div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      <h3 className="font-semibold text-lg">Patients Needing Doctor Assignment</h3>
                      {patientsNeedingDoctorAssignment.map((patient) => (
                        <div key={patient.id} className="p-4 border-2 rounded-lg cursor-pointer border-orange-300 bg-orange-50 hover:shadow-md" onClick={() => setSelectedPatient(patient)}>
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-semibold">{patient.full_name || `Patient ${patient.id}`}</div>
                              <div className="text-sm text-gray-600">ESI {patient.esiLevel} • Waiting: {getCurrentStageTime(patient)}m</div>
                            </div>
                            <Badge className="bg-orange-100 text-orange-800">Needs Assignment</Badge>
                          </div>
                        </div>
                      ))}
                    </div>

                    {selectedPatient && (
                      <div className="p-4 border border-blue-300 bg-blue-50 rounded-lg">
                        <h4 className="font-semibold mb-4">Assign Doctor to {selectedPatient.full_name || selectedPatient.id}</h4>
                        <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                          <SelectTrigger><SelectValue placeholder="Choose a doctor" /></SelectTrigger>
                          <SelectContent>
                            {availableDoctors.map((doctor) => (
                              <SelectItem key={doctor.username} value={doctor.username}>
                                {doctor.name} ({doctor.specialty})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button onClick={handleAssignDoctor} disabled={!selectedDoctor} className="mt-4 w-full">
                          <ArrowRight className="w-4 h-4 mr-2" />Assign Doctor
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="time-adjustment" className="mt-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Timer className="w-5 h-5" />Time Management</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeEarlyStagePatients.map((p) => (
                  <div key={p.id} className="p-4 border-2 rounded-lg bg-gray-50 hover:shadow-md cursor-pointer" onClick={() => setSelectedPatient(p)}>
                    <div className="flex items-center justify-between">
                      <div><div className="font-semibold">{p.full_name || `Patient ${p.id}`}</div><div className="text-sm text-gray-600">Stage: {STAGE_DISPLAY_NAMES[p.currentStage]}</div></div>
                      <div className="text-sm text-gray-600">{getCurrentStageTime(p)}m</div>
                    </div>
                  </div>
                ))}

                {selectedPatient && (
                  <div className="p-4 border border-blue-300 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold mb-2">Adjust Time for {selectedPatient.full_name || selectedPatient.id}</h4>
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div><Label>Hours</Label><Input type="number" min="0" max="23" value={timeAdjustment.hours} onChange={(e) => setTimeAdjustment({ ...timeAdjustment, hours: parseInt(e.target.value) || 0 })} /></div>
                      <div><Label>Minutes</Label><Input type="number" min="0" max="59" value={timeAdjustment.minutes} onChange={(e) => setTimeAdjustment({ ...timeAdjustment, minutes: parseInt(e.target.value) || 0 })} /></div>
                    </div>

                    <Dialog open={adjustTimeDialogOpen} onOpenChange={setAdjustTimeDialogOpen}>
                      <DialogTrigger asChild>
                        <Button disabled={timeAdjustment.hours === 0 && timeAdjustment.minutes === 0} className="w-full">
                          <Edit className="w-4 h-4 mr-2" />Apply Adjustment
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Confirm Adjustment</DialogTitle>
                          <DialogDescription>
                            Subtract {timeAdjustment.hours}h {timeAdjustment.minutes}m from {selectedPatient.full_name || selectedPatient.id}’s stage time?
                          </DialogDescription>
                        </DialogHeader>
                        <div className="flex gap-2 pt-4">
                          <Button variant="outline" onClick={() => setAdjustTimeDialogOpen(false)} className="flex-1">Cancel</Button>
                          <Button onClick={handleAdjustTime} className="flex-1">Confirm</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
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
