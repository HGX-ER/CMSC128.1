import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { DEMO_USERS } from "../types/auth.js";
import { 
  Hash,
  ClipboardList,
  CheckCircle,
  Users,
  Clock,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';

const ESI_COLORS = {
  1: "bg-red-600 text-white",
  2: "bg-orange-500 text-white", 
  3: "bg-yellow-500 text-black",
  4: "bg-green-500 text-white",
  5: "bg-blue-500 text-white"
};

export function RegistrationInterface({ patients, onUpdatePatient, onMoveToStage, getTotalTime, onAddPatient }) {
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    dateOfBirth: "",
    sex: "",
    chiefComplaint: "",
    assignedDoctor: ""
  });
  

  // Registration state
  const [registrationQueueNumber, setRegistrationQueueNumber] = useState('');
  const [registrationData, setRegistrationData] = useState({
    name: '',
    dateOfBirth: '',
    age: '',
    sex: '',
    chiefComplaint: '',
    contactNumber: '',
    emergencyContact: '',
    insuranceInfo: '',
    address: ''
  });

  // Get available doctors
  const availableDoctors = Object.values(DEMO_USERS)
    .filter(user => user.user.role === 'doctor')
    .map(user => user.user);

  const waitingPatients = patients.filter(p => p.currentStage === 'waiting_registration');
  const selectedPatientData = patients.find(p => p.id === selectedPatient);

  const handleSelectPatient = (patientId) => {
    setSelectedPatient(patientId);
    const patient = patients.find(p => p.id === patientId);
    if (patient) {
      setFormData({
        name: patient.name || "",
        age: patient.age?.toString() || "",
        dateOfBirth: patient.dateOfBirth || "",
        sex: patient.sex || "",
        chiefComplaint: patient.chiefComplaint || "",
        assignedDoctor: patient.assignedDoctor || ""
      });
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmitRegistration = () => {
    if (selectedPatient && formData.name && formData.age && formData.dateOfBirth && formData.sex && formData.chiefComplaint && formData.assignedDoctor) {
      onUpdatePatient(selectedPatient, {
        name: formData.name,
        age: formData.age,
        dateOfBirth: formData.dateOfBirth,
        sex: formData.sex,
        chiefComplaint: formData.chiefComplaint,
        assignedDoctor: formData.assignedDoctor,
        isRegistered: true
      });
      onMoveToStage(selectedPatient, 'waiting_doctor');
      setSelectedPatient(null);
      setFormData({
        name: "",
        age: "",
        dateOfBirth: "",
        sex: "",
        chiefComplaint: "",
        assignedDoctor: ""
      });
    }
  };



  const handleRegisterPatient = () => {
    const patient = patients.find(p => p.id === registrationQueueNumber);
    if (!patient) {
      alert('Queue number not found. Please check the queue number.');
      return;
    }

    if (!registrationData.name || !registrationData.dateOfBirth || !registrationData.sex) {
      alert('Please fill in all required fields (Name, Date of Birth, Sex).');
      return;
    }

    // Calculate age if not provided
    let calculatedAge = registrationData.age;
    if (!calculatedAge && registrationData.dateOfBirth) {
      const birthDate = new Date(registrationData.dateOfBirth);
      const today = new Date();
      calculatedAge = (today.getFullYear() - birthDate.getFullYear()).toString();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge = (parseInt(calculatedAge) - 1).toString();
      }
    }

    const updates = {
      name: registrationData.name,
      dateOfBirth: registrationData.dateOfBirth,
      age: calculatedAge || registrationData.age,
      sex: registrationData.sex,
      chiefComplaint: registrationData.chiefComplaint,
      contactNumber: registrationData.contactNumber,
      emergencyContact: registrationData.emergencyContact,
      insuranceInfo: registrationData.insuranceInfo,
      address: registrationData.address,
      isRegistered: true
    };

    onUpdatePatient(patient.id, updates);
    onMoveToStage(patient.id, 'waiting_doctor');

    // Reset registration form
    setRegistrationQueueNumber('');
    setRegistrationData({
      name: '',
      dateOfBirth: '',
      age: '',
      sex: '',
      chiefComplaint: '',
      contactNumber: '',
      emergencyContact: '',
      insuranceInfo: '',
      address: ''
    });
  };

  const findPatientByQueueNumber = (queueNumber) => {
    return patients.find(p => p.id === queueNumber);
  };

  return (
    <div className="p-6 space-y-6">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 className="text-3xl">Registration Center</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Badge variant="outline" className="text-lg px-4 py-2" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users style={{ width: '1rem', height: '1rem' }} />
            Waiting: {waitingPatients.length}
          </Badge>
          <Badge variant="outline" className="text-lg px-4 py-2" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock style={{ width: '1rem', height: '1rem' }} />
            Active: {patients.filter(p => p.isActive).length}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="pending-logins" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pending-logins">Pending Patient Logins</TabsTrigger>
          <TabsTrigger value="patient-registration">Patient Registration</TabsTrigger>
        </TabsList>

        {/* Pending Patient Logins Tab */}
        <TabsContent value="pending-logins" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users style={{ width: '1.25rem', height: '1.25rem' }} />
                Patients Who Have Logged In
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <AlertTriangle style={{ width: '1rem', height: '1rem', color: '#2563eb' }} />
                    <span className="font-medium text-blue-800">Patient Login Queue</span>
                  </div>
                  <p className="text-sm text-blue-600">
                    These patients have logged in through the patient portal and are waiting to be registered. Click on a patient to complete their registration.
                  </p>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-blue-50">
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {patients.filter(p => p.isActive && !p.isRegistered).length}
                      </div>
                      <div className="text-sm text-gray-600">Awaiting Registration</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-green-50">
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {patients.filter(p => p.isActive && p.isRegistered).length}
                      </div>
                      <div className="text-sm text-gray-600">Registered Today</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-purple-50">
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {patients.filter(p => p.isActive).length}
                      </div>
                      <div className="text-sm text-gray-600">Total Active</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Pending Patient Logins List */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Patients Awaiting Registration</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {patients.filter(p => p.isActive && !p.isRegistered).length === 0 ? (
                      <div className="text-center py-8">
                        <CheckCircle style={{ 
                          width: '3rem', 
                          height: '3rem', 
                          color: '#22c55e',
                          margin: '0 auto 0.5rem'
                        }} />
                        <div className="text-gray-500">No patients pending registration</div>
                        <p className="text-sm text-gray-400 mt-2">
                          Patients who log in via the patient portal will appear here
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {patients
                          .filter(p => p.isActive && !p.isRegistered)
                          .sort((a, b) => a.arrivalTime - b.arrivalTime)
                          .map((patient, index) => (
                            <div 
                              key={patient.id}
                              className={`p-4 border-2 rounded-lg transition-all hover:shadow-md cursor-pointer ${
                                registrationQueueNumber === patient.id 
                                  ? 'border-blue-500 bg-blue-50' 
                                  : 'border-yellow-300 bg-yellow-50 hover:bg-yellow-100'
                              }`}
                              onClick={() => {
                                setRegistrationQueueNumber(patient.id);
                                setRegistrationData(prev => ({
                                  ...prev,
                                  name: patient.name || '',
                                  age: patient.age || '',
                                  dateOfBirth: patient.dateOfBirth || '',
                                  sex: patient.sex || '',
                                  chiefComplaint: patient.chiefComplaint || ''
                                }));
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                  <Badge className="bg-orange-100 text-orange-800 border-orange-200 px-3 py-1">
                                    #{index + 1}
                                  </Badge>
                                  <div>
                                    <div className="font-mono text-lg font-semibold">{patient.id}</div>
                                    {patient.esiLevel && (
                                      <Badge className={ESI_COLORS[patient.esiLevel]}>
                                        ESI {patient.esiLevel}
                                      </Badge>
                                    )}
                                    <div className="text-sm text-gray-600 mt-1">
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        <Clock style={{ width: '0.875rem', height: '0.875rem' }} />
                                        Logged in: {patient.arrivalTime.toLocaleTimeString()}
                                      </div>
                                    </div>
                                    <div className="text-sm text-gray-600">
                                      Current Stage: <Badge variant="outline">{patient.currentStage}</Badge>
                                    </div>
                                  </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                                  <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                                    Waiting {getTotalTime(patient)}m
                                  </Badge>
                                  <Button 
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setRegistrationQueueNumber(patient.id);
                                      setRegistrationData(prev => ({
                                        ...prev,
                                        name: patient.name || '',
                                        age: patient.age || '',
                                        dateOfBirth: patient.dateOfBirth || '',
                                        sex: patient.sex || '',
                                        chiefComplaint: patient.chiefComplaint || ''
                                      }));
                                      // Auto-switch to registration tab
                                      document.querySelector('[value="patient-registration"]')?.click();
                                    }}
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                  >
                                    <ArrowRight style={{ width: '1rem', height: '1rem', marginRight: '0.25rem' }} />
                                    Register Now
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Patient Registration Tab */}
        <TabsContent value="patient-registration" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ClipboardList style={{ width: '1.25rem', height: '1.25rem', flexShrink: 0 }} />
                Complete Patient Registration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Queue Number Input */}
                <div className="space-y-2">
                  <Label htmlFor="queue-number">Queue Number</Label>
                  <div className="flex gap-2">
                    <Input
                      id="queue-number"
                      type="text"
                      placeholder="Enter queue number (e.g., ED20241223140001)"
                      value={registrationQueueNumber}
                      onChange={(e) => setRegistrationQueueNumber(e.target.value.toUpperCase())}
                      className="font-mono"
                    />
                    <Button 
                      variant="outline"
                      onClick={() => {
                        const patient = findPatientByQueueNumber(registrationQueueNumber);
                        if (patient) {
                          setRegistrationData(prev => ({
                            ...prev,
                            name: patient.name || '',
                            age: patient.age || '',
                            dateOfBirth: patient.dateOfBirth || '',
                            sex: patient.sex || '',
                            chiefComplaint: patient.chiefComplaint || ''
                          }));
                        }
                      }}
                    >
                      Load Patient
                    </Button>
                  </div>
                  {registrationQueueNumber && findPatientByQueueNumber(registrationQueueNumber) && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-green-800">Patient found: {findPatientByQueueNumber(registrationQueueNumber)?.currentStage}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Registration Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="patient-name">Full Name *</Label>
                      <Input
                        id="patient-name"
                        type="text"
                        placeholder="Enter patient's full name"
                        value={registrationData.name}
                        onChange={(e) => setRegistrationData(prev => ({ ...prev, name: e.target.value }))}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="dob">Date of Birth *</Label>
                      <Input
                        id="dob"
                        type="date"
                        value={registrationData.dateOfBirth}
                        onChange={(e) => setRegistrationData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="age">Age</Label>
                      <Input
                        id="age"
                        type="number"
                        placeholder="Age (will be calculated from DOB if empty)"
                        value={registrationData.age}
                        onChange={(e) => setRegistrationData(prev => ({ ...prev, age: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Sex *</Label>
                      <RadioGroup 
                        value={registrationData.sex} 
                        onValueChange={(value) => setRegistrationData(prev => ({ ...prev, sex: value }))}
                        className="flex gap-6"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="Male" id="male" />
                          <Label htmlFor="male">Male</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="Female" id="female" />
                          <Label htmlFor="female">Female</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="Other" id="other" />
                          <Label htmlFor="other">Other</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="contact">Contact Number</Label>
                      <Input
                        id="contact"
                        type="tel"
                        placeholder="Phone number"
                        value={registrationData.contactNumber}
                        onChange={(e) => setRegistrationData(prev => ({ ...prev, contactNumber: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="emergency-contact">Emergency Contact</Label>
                      <Input
                        id="emergency-contact"
                        type="text"
                        placeholder="Emergency contact name and number"
                        value={registrationData.emergencyContact}
                        onChange={(e) => setRegistrationData(prev => ({ ...prev, emergencyContact: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="insurance">Insurance Information</Label>
                      <Input
                        id="insurance"
                        type="text"
                        placeholder="Insurance provider and policy number"
                        value={registrationData.insuranceInfo}
                        onChange={(e) => setRegistrationData(prev => ({ ...prev, insuranceInfo: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address">Address</Label>
                      <Textarea
                        id="address"
                        placeholder="Home address"
                        value={registrationData.address}
                        onChange={(e) => setRegistrationData(prev => ({ ...prev, address: e.target.value }))}
                        rows={3}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="chief-complaint">Chief Complaint</Label>
                  <Textarea
                    id="chief-complaint"
                    placeholder="Describe the main reason for the visit"
                    value={registrationData.chiefComplaint}
                    onChange={(e) => setRegistrationData(prev => ({ ...prev, chiefComplaint: e.target.value }))}
                    rows={4}
                  />
                </div>

                <div className="flex justify-center pt-4">
                  <Button 
                    onClick={handleRegisterPatient}
                    disabled={!registrationQueueNumber || !registrationData.name || !registrationData.dateOfBirth || !registrationData.sex}
                    size="lg"
                    className="px-8"
                  >
                    Complete Registration
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Traditional Registration Flow Tab */}
        <TabsContent value="traditional-registration" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Patient List */}
            <Card>
              <CardHeader>
                <CardTitle>Patients Waiting for Registration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {waitingPatients.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No patients waiting for registration</p>
                ) : (
                  waitingPatients.map((patient) => (
                    <div
                      key={patient.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedPatient === patient.id 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => handleSelectPatient(patient.id)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-mono text-lg">{patient.id}</div>
                          {patient.esiLevel && (
                            <Badge className={ESI_COLORS[patient.esiLevel]}>
                              ESI {patient.esiLevel}
                            </Badge>
                          )}
                          <div className="text-sm text-gray-500">
                            Arrived: {patient.arrivalTime.toLocaleTimeString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline">
                            {getTotalTime(patient)}m
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Registration Form */}
            <Card>
              <CardHeader>
                <CardTitle>Patient Registration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedPatient ? (
                  <>
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p>Selected Patient: <span className="font-mono">{selectedPatient}</span></p>
                      {selectedPatientData?.esiLevel && (
                        <div className="mt-2">
                          <Badge className={ESI_COLORS[selectedPatientData.esiLevel]}>
                            ESI Level {selectedPatientData.esiLevel}
                          </Badge>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          placeholder="Enter patient's full name"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="age">Age</Label>
                          <Input
                            id="age"
                            type="number"
                            value={formData.age}
                            onChange={(e) => handleInputChange('age', e.target.value)}
                            placeholder="Age"
                          />
                        </div>
                        <div>
                          <Label htmlFor="dob">Date of Birth</Label>
                          <Input
                            id="dob"
                            type="date"
                            value={formData.dateOfBirth}
                            onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                          />
                        </div>
                      </div>

                      <div>
                        <Label>Sex</Label>
                        <Select value={formData.sex} onValueChange={(value) => handleInputChange('sex', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select sex" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Female">Female</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="chiefComplaint">Chief Complaint</Label>
                        <Textarea
                          id="chiefComplaint"
                          value={formData.chiefComplaint}
                          onChange={(e) => handleInputChange('chiefComplaint', e.target.value)}
                          placeholder="Describe the main reason for the visit"
                          rows={4}
                        />
                      </div>

                      <div>
                        <Label>Assign Doctor</Label>
                        <Select value={formData.assignedDoctor} onValueChange={(value) => handleInputChange('assignedDoctor', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a doctor" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableDoctors.map((doctor) => (
                              <SelectItem key={doctor.username} value={doctor.username}>
                                {doctor.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <Button 
                        onClick={handleSubmitRegistration}
                        disabled={!formData.name || !formData.age || !formData.dateOfBirth || !formData.sex || !formData.chiefComplaint || !formData.assignedDoctor}
                        className="w-full"
                      >
                        Complete Registration & Send to Doctor
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Select a patient to begin registration
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}