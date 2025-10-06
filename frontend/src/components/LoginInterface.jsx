import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Eye, EyeOff, User, Lock, AlertCircle, Heart, Hash, Stethoscope } from 'lucide-react';

const ROLE_INFO = {
  patient: {
    title: 'Patient Access',
    description: 'Track your ED visit progress',
    color: 'bg-blue-100 text-blue-800',
    icon: User
  },
  doctor: {
    title: 'Doctor Portal',
    description: 'Patient consultations and medical decisions',
    color: 'bg-purple-100 text-purple-800',
    icon: Stethoscope
  },
  nurse: {
    title: 'Nursing Station',
    description: 'Triage and patient registration',
    color: 'bg-green-100 text-green-800',
    icon: User
  },
  ed_manager: {
    title: 'ED Manager Dashboard',
    description: 'Patient flow monitoring and analytics',
    color: 'bg-orange-100 text-orange-800',
    icon: User
  }
};

const DEMO_CREDENTIALS = [
  { username: 'dr.smith', password: 'doctor123', role: 'doctor' },
  { username: 'nurse.jones', password: 'nurse123', role: 'nurse' },
  { username: 'manager.wilson', password: 'manager123', role: 'ed_manager' }
];

const DEMO_QUEUE_NUMBERS = [
  'ED20241223140001',
  'ED20241223141002', 
  'ED20241223142003'
];

export function LoginInterface({ onLogin, onQueueLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [queueNumber, setQueueNumber] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDemo, setShowDemo] = useState(false);
  const [activeTab, setActiveTab] = useState('staff');

  const handleStaffSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await onLogin(username, password);
      if (!result.success) {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePatientSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await onQueueLogin(queueNumber);
      if (!result.success) {
        setError(result.error || 'Queue number not found');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = (credentials) => {
    setUsername(credentials.username);
    setPassword(credentials.password);
    setError('');
  };

  const handleDemoQueueLogin = (queueNum) => {
    setQueueNumber(queueNum);
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Main Login Card */}
        <Card className="shadow-lg">
          <CardHeader className="text-center space-y-2">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl">ED Management System</CardTitle>
            <CardDescription>
              Sign in to access the Emergency Department portal
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="staff" className="flex items-center gap-2">
                  <Stethoscope className="w-4 h-4" />
                  Healthcare Staff
                </TabsTrigger>
                <TabsTrigger value="patient" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Patient Portal
                </TabsTrigger>
              </TabsList>

              <TabsContent value="staff" className="space-y-4">
                <form onSubmit={handleStaffSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="username"
                        type="text"
                        placeholder="Enter your username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading || !username || !password}
                  >
                    {isLoading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="patient" className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Hash className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-blue-800">Patient Login</span>
                  </div>
                  <p className="text-sm text-blue-600">
                    Enter your queue number to track your ED visit progress automatically
                  </p>
                </div>

                <form onSubmit={handlePatientSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="queueNumber">Queue Number</Label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="queueNumber"
                        type="text"
                        placeholder="Enter your queue number (e.g., ED20241223140001)"
                        value={queueNumber}
                        onChange={(e) => setQueueNumber(e.target.value.toUpperCase())}
                        className="pl-10 font-mono"
                        required
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-blue-600 hover:bg-blue-700" 
                    disabled={isLoading || !queueNumber}
                  >
                    {isLoading ? 'Checking...' : 'Access My Visit Status'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="text-center">
              <Button
                variant="link"
                onClick={() => setShowDemo(!showDemo)}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                View demo credentials
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Role Information */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">System Access Levels</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(ROLE_INFO).map(([role, info]) => {
              const Icon = info.icon;
              return (
                <div key={role} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Icon className="w-5 h-5 text-gray-600" />
                  <div className="flex-1">
                    <div className="font-medium">{info.title}</div>
                    <div className="text-sm text-gray-600">{info.description}</div>
                  </div>
                  <Badge className={info.color}>
                    {role.replace('_', ' ')}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Demo Credentials */}
        {showDemo && (
          <Card className="shadow-lg border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-lg text-blue-800">Demo Credentials</CardTitle>
              <CardDescription className="text-blue-600">
                Click any credential to auto-fill the login form
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium text-blue-800 mb-2">Staff Login</h4>
                <div className="space-y-2">
                  {DEMO_CREDENTIALS.map((cred, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-white rounded-lg cursor-pointer hover:bg-blue-100 transition-colors border border-blue-200"
                      onClick={() => {
                        setActiveTab('staff');
                        handleDemoLogin(cred);
                      }}
                    >
                      <div>
                        <div className="font-mono text-sm">{cred.username}</div>
                        <div className="font-mono text-xs text-gray-500">{cred.password}</div>
                      </div>
                      <Badge className={ROLE_INFO[cred.role].color}>
                        {cred.role.replace('_', ' ')}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-blue-800 mb-2">Patient Queue Numbers</h4>
                <div className="space-y-2">
                  {DEMO_QUEUE_NUMBERS.map((queueNum, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-white rounded-lg cursor-pointer hover:bg-blue-100 transition-colors border border-blue-200"
                      onClick={() => {
                        setActiveTab('patient');
                        handleDemoQueueLogin(queueNum);
                      }}
                    >
                      <div className="font-mono text-sm">{queueNum}</div>
                      <Badge className="bg-blue-100 text-blue-800">
                        patient
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          <p>Emergency Department Management System</p>
          <p>Secure healthcare portal • {new Date().getFullYear()}</p>
        </div>
      </div>
    </div>
  );
}