import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { DoctorPatientCard } from "./DoctorPatientCard";

const ESI_COLORS = {
  1: "bg-red-600 text-white",
  2: "bg-orange-500 text-white", 
  3: "bg-yellow-500 text-black",
  4: "bg-green-500 text-white",
  5: "bg-blue-500 text-white"
};

export function DoctorInterface({ patients, onUpdatePatient, onMoveToStage, getTotalTime, currentDoctorUsername }) {
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [consultationOpen, setConsultationOpen] = useState(false);
  const [disposition, setDisposition] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [consultationStartTime, setConsultationStartTime] = useState(null);

  // Only show patients assigned to this doctor
  const waitingPatients = patients.filter(p => 
    p.currentStage === 'waiting_doctor' && p.assignedDoctor === currentDoctorUsername
  );
  const consultingPatients = patients.filter(p => 
    p.currentStage === 'consultation' && p.assignedDoctor === currentDoctorUsername
  );
  const selectedPatientData = patients.find(p => p.id === selectedPatient);

  const handleSelectPatient = (patientId) => {
    setSelectedPatient(patientId);
  };

  const handleStartConsult = () => {
    if (selectedPatient) {
      onMoveToStage(selectedPatient, 'consultation');
      setConsultationOpen(true);
      setConsultationStartTime(new Date());
      setDisposition("");
      setDiagnosis("");
    }
  };

  const handleEndConsult = () => {
    if (selectedPatient && disposition && diagnosis) {
      onUpdatePatient(selectedPatient, { 
        disposition: disposition,
        diagnosis: diagnosis 
      });
      
      // Move to appropriate stage based on disposition
      let nextStage = 'waiting_discharge';
      if (disposition === 'Admission Non-ICU') {
        nextStage = 'waiting_admission';
      } else if (disposition === 'Admission ICU') {
        nextStage = 'waiting_admission';
      } else if (disposition === 'Observation') {
        nextStage = 'waiting_observation';
      }
      
      onMoveToStage(selectedPatient, nextStage);
      setConsultationOpen(false);
      setSelectedPatient(null);
      setDiagnosis("");
      setDisposition("");
      setConsultationStartTime(null);
    }
  };

  const getPatientAge = (patient) => {
    if (patient.age) return `${patient.age}y`;
    if (patient.dateOfBirth) {
      const age = new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear();
      return `${age}y`;
    }
    return 'Unknown';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl">Doctor Interface</h1>
        <div className="flex gap-4">
          <Badge variant="outline" className="text-lg px-4 py-2">
            Waiting: {waitingPatients.length}
          </Badge>
          <Badge variant="outline" className="text-lg px-4 py-2 bg-yellow-100">
            In Consultation: {consultingPatients.length}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Waiting Patients */}
        <Card>
          <CardHeader>
            <CardTitle>My Assigned Patients</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {waitingPatients.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No patients assigned to you</p>
            ) : (
              waitingPatients
                .sort((a, b) => (a.esiLevel || 5) - (b.esiLevel || 5)) // Sort by ESI priority
                .map((patient) => (
                  <DoctorPatientCard
                    key={patient.id}
                    patient={patient}
                    isSelected={selectedPatient === patient.id}
                    onSelect={() => handleSelectPatient(patient.id)}
                    getTotalTime={getTotalTime}
                  />
                ))
            )}
          </CardContent>
        </Card>

        {/* Patient Profile & Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Patient Profile & Actions</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedPatientData ? (
              <div className="space-y-4">
                {/* Patient Details */}
                <div className="p-4 bg-blue-50 rounded-lg space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-medium">{selectedPatientData.name}</h3>
                      <p className="text-sm text-gray-600">
                        {getPatientAge(selectedPatientData)} • {selectedPatientData.sex}
                      </p>
                      <p className="text-xs text-gray-500 font-mono">ID: {selectedPatientData.id}</p>
                    </div>
                    {selectedPatientData.esiLevel && (
                      <Badge className={ESI_COLORS[selectedPatientData.esiLevel]}>
                        ESI {selectedPatientData.esiLevel}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium">Chief Complaint:</span>
                      <p className="text-sm text-gray-700">{selectedPatientData.chiefComplaint}</p>
                    </div>
                    
                    <div>
                      <span className="text-sm font-medium">Date of Birth:</span>
                      <p className="text-sm text-gray-700">{selectedPatientData.dateOfBirth || 'Not provided'}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
                      <div>
                        <span className="font-medium">Arrival:</span> {selectedPatientData.arrivalTime.toLocaleString()}
                      </div>
                      <div>
                        <span className="font-medium">Total Time:</span> {getTotalTime(selectedPatientData)}m
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                {selectedPatientData.currentStage === 'waiting_doctor' ? (
                  <Button onClick={handleStartConsult} className="w-full" size="lg">
                    🩺 START CONSULTATION
                  </Button>
                ) : selectedPatientData.currentStage === 'consultation' ? (
                  <div className="space-y-3">
                    <Badge className="bg-yellow-500 text-white w-full justify-center py-2">
                      Consultation in Progress
                    </Badge>
                    <Button 
                      onClick={() => setConsultationOpen(true)} 
                      variant="outline" 
                      className="w-full"
                    >
                      Continue Consultation
                    </Button>
                    {consultationStartTime && (
                      <p className="text-sm text-gray-600 text-center">
                        Started: {consultationStartTime.toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Badge variant="secondary">
                      Patient Status: {selectedPatientData.currentStage.replace('_', ' ')}
                    </Badge>
                    <p className="text-sm text-gray-500 mt-2">Not available for consultation</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>Select a patient to view their profile</p>
                <p className="text-sm mt-2">Click on any patient card to see their details</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Currently Consulting */}
      {consultingPatients.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>My Current Consultations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {consultingPatients.map((patient) => (
                <div key={patient.id} className="p-4 border rounded-lg bg-yellow-50">
                  <div className="space-y-2">
                    <div className="font-medium">{patient.name}</div>
                    <div className="text-sm text-gray-600">
                      {getPatientAge(patient)} • {patient.sex}
                    </div>
                    <Badge className="bg-yellow-500 text-white">
                      In Consultation
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Information Note */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> You can only see patients that have been assigned to you by the nursing staff during registration. 
            If you don't see any patients, please check with the registration desk.
          </p>
        </CardContent>
      </Card>

      {/* Consultation Dialog */}
      <Dialog open={consultationOpen} onOpenChange={setConsultationOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">🩺 Patient Consultation</DialogTitle>
            <DialogDescription>
              Complete the patient consultation by providing a diagnosis and determining the appropriate disposition for their care.
            </DialogDescription>
          </DialogHeader>
          {selectedPatientData && (
            <div className="space-y-6">
              {/* Patient Summary */}
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-medium text-blue-900">{selectedPatientData.name}</h3>
                    <p className="text-sm text-blue-700">
                      {getPatientAge(selectedPatientData)} • {selectedPatientData.sex} • DOB: {selectedPatientData.dateOfBirth}
                    </p>
                    <p className="text-xs text-blue-600 font-mono">Patient ID: {selectedPatientData.id}</p>
                  </div>
                  {selectedPatientData.esiLevel && (
                    <Badge className={ESI_COLORS[selectedPatientData.esiLevel]}>
                      ESI Level {selectedPatientData.esiLevel}
                    </Badge>
                  )}
                </div>
                
                <div className="bg-white p-3 rounded border border-blue-100">
                  <span className="text-sm font-medium text-blue-900">Chief Complaint:</span>
                  <p className="text-sm text-gray-700 mt-1">{selectedPatientData.chiefComplaint}</p>
                </div>
                
                <div className="grid grid-cols-3 gap-4 mt-3 text-xs text-blue-700">
                  <div>
                    <span className="font-medium">Arrival:</span><br />
                    {selectedPatientData.arrivalTime.toLocaleString()}
                  </div>
                  <div>
                    <span className="font-medium">Total Time:</span><br />
                    {getTotalTime(selectedPatientData)} minutes
                  </div>
                  <div>
                    <span className="font-medium">Consultation Start:</span><br />
                    {consultationStartTime?.toLocaleTimeString() || 'Just started'}
                  </div>
                </div>
              </div>

              {/* Consultation Form */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="diagnosis" className="text-base font-medium">Clinical Diagnosis *</Label>
                  <Textarea
                    id="diagnosis"
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    placeholder="Enter comprehensive diagnosis and assessment..."
                    rows={4}
                    className="mt-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">Include primary diagnosis and any relevant differential diagnoses</p>
                </div>

                <div>
                  <Label htmlFor="disposition" className="text-base font-medium">Patient Disposition *</Label>
                  <Select value={disposition} onValueChange={setDisposition}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select patient disposition..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Discharge">🏠 Discharge Home</SelectItem>
                      <SelectItem value="Observation">👁️ Observation Unit</SelectItem>
                      <SelectItem value="Admission Non-ICU">🏥 Hospital Admission (General Floor)</SelectItem>
                      <SelectItem value="Admission ICU">🚨 ICU Admission</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">Choose the appropriate next step for patient care</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => setConsultationOpen(false)}
                  className="flex-1"
                >
                  💾 Save & Continue Later
                </Button>
                <Button 
                  onClick={handleEndConsult}
                  disabled={!disposition || !diagnosis}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  ✅ Complete Consultation
                </Button>
              </div>
              
              {(!disposition || !diagnosis) && (
                <p className="text-sm text-amber-600 text-center bg-amber-50 p-2 rounded">
                  ⚠️ Please complete both diagnosis and disposition to finish the consultation
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}