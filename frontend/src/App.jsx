import { useState, useEffect } from 'react';
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
import { AdminInterface } from './components/AdminInterface';
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
  Hospital,
  LogOut,
  User
} from 'lucide-react';
import { ShieldCheck } from "lucide-react";

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
  },
  admin: {
    title: 'Admin Panel',
    icon: ShieldCheck,
    color: 'bg-red-700 hover:bg-red-800',
    description: 'Manage user accounts and system settings'
  }
};

export default function App() {
  const [currentRole, setCurrentRole] = useState(null);
  const patientManagement = usePatientManagement();
  const auth = useAuth();

  // Reset currentRole when user logs out or user changes
  useEffect(() => {
    if (!auth.isAuthenticated) {
      setCurrentRole(null);
    }
  }, [auth.isAuthenticated]);

  // Reset currentRole when a different user logs in
  useEffect(() => {
    if (auth.user) {
      setCurrentRole(null);
    }
  }, [auth.user?.username, auth.user?.role]);

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
      ed_manager: ['manager', 'dashboard'],
      admin: ['admin']
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
      <div
        className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://xmple.com/wallpaper/white-gradient-blue-linear-3840x2160-c2-add8e6-ffffff-a-285-f-14.svg')",
        }}
      >
        <Card className="w-full max-w-md sm:max-w-lg md:max-w-xl shadow-lg">
          <CardContent className="p-6">
            <div className="flex flex-col items-center mb-8 text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mb-3"
                style={{ backgroundColor: "#96cfe0" }}
              >
                <Hospital className="w-8 h-8 text-white" />
              </div>

              <h1 className="text-4xl font-bold" style={{ color: "#004f61" }}>
                ED Sats
              </h1>
              <p className="text-lg mt-2 text-gray-600">
                Emergency Department Real-Time Patient Tracking and Satisfaction Monitoring System
              </p>
            </div>

            <div className="flex flex-col items-center w-full max-w-sm mx-auto">
              {availableRoles.map((role) => {
                const config = ROLE_CONFIGS[role];
                const Icon = config.icon;
                return (
                  <div key={role} className="w-full mb-4">        
                    <Button
                      onClick={() => setCurrentRole(role)}
                      className={`${config.color} w-full sm:w-56 md:w-60 lg:w-64 h-28 flex flex-col items-center justify-center text-white shadow-lg transition-transform duration-200 hover:scale-105`}
                    >
                      <Icon className="h-12 w-12 mb-0" />      
                      <div className="text-lg font-semibold mt-2">{config.title}</div>  
                      <div className="text-sm opacity-90 mt-0.5 text-center px-2">
                        {config.description}
                      </div>
                    </Button>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-between text-sm text-gray-600 gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>
                    Active Patients:{" "}
                    {patientManagement.patients.filter((p) => p.isActive).length}
                  </span>
                </div>
                <Badge variant="outline">{new Date().toLocaleString()}</Badge>
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
      
      case 'admin':
        return (
          <AdminInterface/>
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
            {currentRole !== 'doctor' && (
              <Button
                variant="outline"
                onClick={() => setCurrentRole(null)}
                className="text-sm"
              >
                ← Back
              </Button>
            )}
            <div className="flex items-center gap-2">
              {(() => {
                const config = ROLE_CONFIGS[currentRole];
                const Icon = config.icon;
                return (
                  <div className="flex items-center gap-2" style={{ color: "#004f61" }}>
                    <Icon className="h-5 w-5" />
                    <h2 className="text-xl font-bold">{config.title}</h2>
                  </div>
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