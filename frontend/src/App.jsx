import { useState } from 'react';
import { usePatientManagement } from './hooks/usePatientManagement';
import { useAuth } from './hooks/useAuth';
import { LoginInterface } from './components/LoginInterface';
import { PatientInterface } from './components/PatientInterface';
import { KioskInterface } from './components/KioskInterface';
import { TriageInterface } from './components/TriageInterface';
import { RegistrationInterface } from './components/RegistrationInterface';
import { NurseInterface } from './components/NurseInterface';
import { DoctorInterface } from './components/DoctorInterface';
import { ManagerInterface } from './components/ManagerInterface';
import { DashboardInterface } from './components/DashboardInterface';
import { Button } from './components/ui/button';
import { Card, CardContent } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { 
  Users, 
  Stethoscope, 
  ClipboardList, 
  UserCheck, 
  Settings, 
  BarChart3,
  Monitor,
  LogOut,
  User
} from 'lucide-react';

const ROLE_CONFIGS = {
  triage: {
    title: 'Triage Station',
    icon: UserCheck,
    color: 'bg-red-600 hover:bg-red-700',
    description: 'Assign ESI levels to patients'
  },
  registration: {
    title: 'Registration Center',
    icon: ClipboardList,
    color: 'bg-green-600 hover:bg-green-700',
    description: 'Generate queues and register patient information'
  },
  nurse: {
    title: 'Nurse Dashboard',
    icon: Users,
    color: 'bg-teal-600 hover:bg-teal-700',
    description: 'Assign doctors and manage patient flow'
  },
  doctor: {
    title: 'Doctor Interface',
    icon: Stethoscope,
    color: 'bg-purple-600 hover:bg-purple-700',
    description: 'Patient consultations and diagnosis'
  },
  manager: {
    title: 'ED Manager',
    icon: Settings,
    color: 'bg-orange-600 hover:bg-orange-700',
    description: 'Monitor patient flow and stages'
  },
  dashboard: {
    title: 'Analytics Dashboard',
    icon: BarChart3,
    color: 'bg-indigo-600 hover:bg-indigo-700',
    description: 'View ED analytics and reports'
  }
};

export default function App() {
  const [currentRole, setCurrentRole] = useState(null);
  const patientManagement = usePatientManagement();
  const auth = useAuth();

  // Show login screen if not authenticated
  if (!auth.isAuthenticated) {
    return (
      <LoginInterface 
        onLogin={auth.login}
        onQueueLogin={(queueNumber) => auth.loginWithQueueNumber(queueNumber, patientManagement.patients)}
      />
    );
  }

  // Get available roles based on user's login role
  const getAvailableRoles = () => {
    if (!auth.user) return [];
    
    const roleAccess = {
      patient: [], // Patients no longer need kiosk access
      nurse: ['triage', 'registration', 'nurse'],
      doctor: ['doctor'],
      ed_manager: ['manager', 'dashboard']
    };
    
    return roleAccess[auth.user.role] || [];
  };

  const availableRoles = getAvailableRoles();

  // If user has only one role, auto-select it
  if (availableRoles.length === 1 && !currentRole) {
    setCurrentRole(availableRoles[0]);
  }

  // For patients, show patient interface directly
  if (auth.user?.role === 'patient') {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-semibold">Patient Portal</h2>
            </div>
            
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="px-3 py-1">
                Welcome, {auth.user.name}
              </Badge>
              <Button
                variant="outline"
                onClick={auth.logout}
                size="sm"
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>

        <PatientInterface
          patients={patientManagement.patients}
          currentPatientId={auth.user.queueNumber || auth.user.id}
          getTotalTime={patientManagement.getTotalPatientTime}
          getCurrentStageTime={patientManagement.getCurrentStageTime}
          onAddSatisfactionFeedback={patientManagement.addSatisfactionFeedback}
        />
      </div>
    );
  }

  // If patient has no available roles, show message
  if (auth.user?.role === 'patient' && availableRoles.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <User className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Patient Access</h2>
            <p className="text-gray-600 mb-6">
              Please visit the registration desk to get your queue number and access your patient portal.
            </p>
            <Button
              variant="outline"
              onClick={auth.logout}
              className="flex items-center gap-2 mx-auto"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentRole) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-4xl">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <h1 className="text-4xl mb-4">Emergency Department Management System</h1>
              <p className="text-xl text-gray-600">Welcome, {auth.user?.name}</p>
              <p className="text-lg text-gray-500 mt-2">Select a function to access</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {availableRoles.map((role) => {
                const config = ROLE_CONFIGS[role];
                const Icon = config.icon;
                return (
                  <Button
                    key={role}
                    onClick={() => setCurrentRole(role)}
                    className={`${config.color} h-32 flex flex-col items-center justify-center text-white shadow-lg transition-all duration-200 hover:scale-105`}
                  >
                    <Icon className="h-12 w-12 mb-3" />
                    <div className="text-lg font-semibold">{config.title}</div>
                    <div className="text-sm opacity-90 mt-1 text-center px-2">
                      {config.description}
                    </div>
                  </Button>
                );
              })}
            </div>

            <div className="mt-8 flex items-center justify-between">
              <div className="flex items-center gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>Active Patients: {patientManagement.patients.filter(p => p.isActive).length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {new Date().toLocaleString()}
                  </Badge>
                </div>
              </div>
              
              <Button
                variant="outline"
                onClick={auth.logout}
                size="sm"
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderInterface = () => {
    switch (currentRole) {
      case 'triage':
        return (
          <TriageInterface
            patients={patientManagement.patients}
            onUpdatePatient={patientManagement.updatePatient}
            onMoveToStage={patientManagement.movePatientToStage}
            getTotalTime={patientManagement.getTotalPatientTime}
          />
        );
      
      case 'registration':
        return (
          <RegistrationInterface
            patients={patientManagement.patients}
            onUpdatePatient={patientManagement.updatePatient}
            onMoveToStage={patientManagement.movePatientToStage}
            getTotalTime={patientManagement.getTotalPatientTime}
            onAddPatient={patientManagement.addPatient}
          />
        );
      
      case 'nurse':
        return (
          <NurseInterface
            patients={patientManagement.patients}
            onUpdatePatient={patientManagement.updatePatient}
            onMoveToStage={patientManagement.movePatientToStage}
            getTotalTime={patientManagement.getTotalPatientTime}
            getCurrentStageTime={patientManagement.getCurrentStageTime}
            onAdjustStageTime={patientManagement.adjustStageTime}
          />
        );
      
      case 'doctor':
        return (
          <DoctorInterface
            patients={patientManagement.patients}
            onUpdatePatient={patientManagement.updatePatient}
            onMoveToStage={patientManagement.movePatientToStage}
            getTotalTime={patientManagement.getTotalPatientTime}
            currentDoctorUsername={auth.user?.username || ''}
          />
        );
      
      case 'manager':
        return (
          <ManagerInterface
            patients={patientManagement.patients}
            onUpdatePatient={patientManagement.updatePatient}
            onMoveToStage={patientManagement.movePatientToStage}
            onRemovePatient={patientManagement.removePatient}
            getTotalTime={patientManagement.getTotalPatientTime}
            getStageTime={patientManagement.getPatientStageTime}
          />
        );
      
      case 'dashboard':
        return (
          <DashboardInterface
            patients={patientManagement.patients}
            getTotalTime={patientManagement.getTotalPatientTime}
            getStageTime={patientManagement.getPatientStageTime}
          />
        );
      
      default:
        return <div>Invalid role</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => setCurrentRole(null)}
              className="text-sm"
            >
              ← Back
            </Button>
            <div className="flex items-center gap-2">
              {(() => {
                const config = ROLE_CONFIGS[currentRole];
                const Icon = config.icon;
                return (
                  <>
                    <Icon className="h-5 w-5" />
                    <h2 className="text-xl font-semibold">{config.title}</h2>
                  </>
                );
              })()}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="px-3 py-1">
              {auth.user?.name} ({auth.user?.role.replace('_', ' ')})
            </Badge>
            <Badge variant="outline" className="px-3 py-1">
              Active Patients: {patientManagement.patients.filter(p => p.isActive).length}
            </Badge>
            <Badge variant="outline" className="px-3 py-1">
              {new Date().toLocaleTimeString()}
            </Badge>
            <Button
              variant="outline"
              onClick={auth.logout}
              size="sm"
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        {renderInterface()}
      </div>
    </div>
  );
}