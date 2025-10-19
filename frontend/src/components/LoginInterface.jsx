import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Eye, EyeOff, User, Shield, AlertCircle, Heart, Hash, Stethoscope, Camera, X, QrCode } from 'lucide-react';



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

export function LoginInterface({ onLogin, onQueueLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [queueNumber, setQueueNumber] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('staff');
  const [showScanner, setShowScanner] = useState(false);



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
  

  const videoRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState('');

  useEffect(() => {
    let stream = null;

    const startCamera = async () => {
      if (showScanner && videoRef.current) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } 
          });
          videoRef.current.srcObject = stream;
          setIsScanning(true);
          setCameraError('');
        } catch (err) {
          console.error('Camera access error:', err);
          setCameraError('Camera access denied or not available');
          setIsScanning(false);
        }
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [showScanner]);


  const handleCloseScanner = () => {
    setShowScanner(false);
    setIsScanning(false);
    setCameraError('');
  }

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
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
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
                       <Label htmlFor="username">Password</Label>
                  <div className="relative">
                   
                    {/* Pass icon */}
                      <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />

                    {/* Input field */}
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-12 pr-12 h-10"
                        required
                      />

                    {/* Eye toggle button */}
                      <button
                        type="button"
                        variant="ghost"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5"
                      >
                        {showPassword ? (
                          <EyeOff className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 w-5 h-5" />
                        ) : (
                          <Eye className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 w-5 h-5" />
                        )}
                      </button>
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
                {/* Info box */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Hash className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-blue-800">Patient Portal</span>
                  </div>
                  <p className="text-sm text-blue-600">
                    You can scan your QR code or type your queue number manually to access your visit status.
                  </p>
                </div>

                {/* QR Scanner */}
                {showScanner ? (
                  <div className="p-4 border-2 border-blue-500 rounded-lg bg-white shadow-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-blue-700">Scan Your QR Code</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleCloseScanner}
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="relative w-full aspect-square max-w-sm mx-auto overflow-hidden rounded-lg border-2 border-blue-300 bg-gray-900">
                        {cameraError ? (
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4">
                            <Camera className="w-12 h-12 mb-2 text-gray-400" />
                            <p className="text-sm text-center">{cameraError}</p>
                            <p className="text-xs text-gray-400 mt-2 text-center">
                              Make sure that the photo is clear
                            </p>
                          </div>
                        ) : (
                          <>
                            <video
                              ref={videoRef}
                              autoPlay
                              playsInline
                              muted
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <div className="w-3/4 h-3/4 border-2 border-white rounded-lg relative">
                                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl-lg"></div>
                                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr-lg"></div>
                                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl-lg"></div>
                                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br-lg"></div>
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="text-center text-sm text-gray-600">
                        Position the QR code within the frame
                      </div>

                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    onClick={() => setShowScanner(true)}
                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Scan QR Code
                  </Button>
                )}

                {/* Manual input (optional) */}
                <form onSubmit={handlePatientSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="queueNumber">Or Enter Queue Number</Label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="queueNumber"
                        type="text"
                        placeholder="Enter your queue number manually"
                        value={queueNumber}
                        onChange={(e) => setQueueNumber(e.target.value.toUpperCase())}
                        className="pl-10 font-mono"
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

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          <p>Emergency Department Management System</p>
          <p>Secure healthcare portal • {new Date().getFullYear()}</p>
        </div>
      </div>
    </div>
  );
}