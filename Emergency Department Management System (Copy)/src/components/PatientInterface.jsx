import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { StageHistory } from './StageHistory';
import { SatisfactionModal } from './SatisfactionModal';
import { HospitalAnnouncements } from './HospitalAnnouncements';
import { MedicalTrivia } from './MedicalTrivia';
import { HealthTips } from './HealthTips';
import { RelaxationExercises } from './RelaxationExercises';
import { HospitalServices } from './HospitalServices';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs.jsx';
import { Clock, Timer, Heart, Activity, Stethoscope, UserCheck, CheckCircle, MapPin, Loader2, History, Newspaper, Brain, Lightbulb, Wind, Building } from 'lucide-react';

export function PatientInterface({ patients, currentPatientId, getTotalTime, getCurrentStageTime, onAddSatisfactionFeedback }) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [satisfactionModal, setSatisfactionModal] = useState(null);
  
  const patient = patients.find(p => p.id === currentPatientId);
  
  // Update timer every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

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
    const staffNames = {
      'dr.smith': 'Dr. Sarah Smith',
      'dr.johnson': 'Dr. Michael Johnson',
      'dr.davis': 'Dr. Emily Davis',
      'dr.brown': 'Dr. James Brown',
      'nurse.williams': 'Nurse Jennifer Williams',
      'nurse.thompson': 'Nurse Robert Thompson',
      'nurse.davis': 'Nurse Lisa Davis',
      'nurse.wilson': 'Nurse Mark Wilson',
      'nurse.martinez': 'Nurse Maria Martinez'
    };
    return staffNames[username] || username;
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
    const stages = [
      'kiosk', 'waiting_triage', 'triage', 'waiting_registration', 
      'registration', 'waiting_doctor', 'consultation', 'waiting_discharge',
      'discharge_documents', 'awaiting_departure', 'departed'
    ];
    
    const currentIndex = stages.indexOf(patient.currentStage);
    if (currentIndex === -1) return 0;
    return Math.round((currentIndex / (stages.length - 1)) * 100);
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
                    <UserCheck className="w-8 h-8 text-purple-600" />
                    <div>
                      <div className="font-medium text-purple-800">Assigned Nurse</div>
                      <div className="text-purple-700">{getStaffDisplayName(patient.assignedNurse)}</div>
                    </div>
                  </div>
                )}
                
                {patient.assignedDoctor && (
                  <div className="flex items-center gap-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <Stethoscope className="w-8 h-8 text-purple-600" />
                    <div>
                      <div className="font-medium text-purple-800">Assigned Doctor</div>
                      <div className="text-purple-700">{getStaffDisplayName(patient.assignedDoctor)}</div>
                    </div>
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
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="tips" className="flex items-center gap-1 text-xs">
              <Lightbulb className="w-3 h-3" />
              <span className="hidden sm:inline">Health Tips</span>
              <span className="sm:hidden">Tips</span>
            </TabsTrigger>
            <TabsTrigger value="news" className="flex items-center gap-1 text-xs">
              <Newspaper className="w-3 h-3" />
              <span className="hidden sm:inline">News</span>
              <span className="sm:hidden">News</span>
            </TabsTrigger>
            <TabsTrigger value="trivia" className="flex items-center gap-1 text-xs">
              <Brain className="w-3 h-3" />
              <span className="hidden sm:inline">Trivia</span>
              <span className="sm:hidden">Quiz</span>
            </TabsTrigger>
            <TabsTrigger value="relax" className="flex items-center gap-1 text-xs">
              <Wind className="w-3 h-3" />
              <span className="hidden sm:inline">Relax</span>
              <span className="sm:hidden">Calm</span>
            </TabsTrigger>
            <TabsTrigger value="services" className="flex items-center gap-1 text-xs">
              <Building className="w-3 h-3" />
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