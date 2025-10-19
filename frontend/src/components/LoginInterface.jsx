import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Eye, EyeOff, User, Shield, AlertCircle, Heart, Hash, Stethoscope, Camera, X, QrCode, Hospital } from 'lucide-react';

const ROLE_INFO = {
  patient: {
    title: 'Patient Access',
    description: 'Track your ED visit progress',
    color: 'bg-blue-100 text-[#004f61]',
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
  const [activeTab, setActiveTab] = useState('patient');
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
    <div
      className="min-h-screen bg-cover bg-center flex items-center justify-center p-4"
      style={{ backgroundImage: "url('https://xmple.com/wallpaper/white-gradient-blue-linear-3840x2160-c2-add8e6-ffffff-a-285-f-14.svg')" }}
    >
      <div className="w-full max-w-md space-y-6">
        {/* Main Login Card */}
        <Card className="shadow-lg">
          <CardHeader className="text-center flex flex-col items-center gap-">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#96cfe0' }}
            >
              <Hospital className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-4xl font-bold -mt-1">ERIS</CardTitle>
            <p className="text-lg mt-0">Emergency Response Information System</p>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-2">
                <TabsTrigger value="patient" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Patient Portal
                </TabsTrigger>
                <TabsTrigger value="staff" className="flex items-center gap-2">
                  <Stethoscope className="w-4 h-4" />
                  Healthcare Staff
                </TabsTrigger>
              </TabsList>

                {activeTab === 'staff' && (
                  <p className="text-sm text-gray-600 text-center mb-2">
                    Sign in with your hospital account to access the staff dashboard.
                  </p>
                )}

              <TabsContent value="staff" className="space-y-4">
                <form onSubmit={handleStaffSubmit} className="space-y-4">
                  {/* Username field */}
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <div className="relative flex items-center">
                        {/* move icon right by giving it explicit px spacing */}
                        <User
                          className="absolute text-gray-400 w-4 h-4"
                          style={{ left: '1rem', top: '50%', transform: 'translateY(-50%)' }}
                        />
                        <Input
                          id="username"
                          type="text"
                          placeholder="Enter your username"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          style={{ paddingLeft: '2.75rem' }}
                          required
                        />
                      </div>
                    </div>

                    {/* Password field */}
                    <Label htmlFor="password">Password</Label>
                    <div className="relative flex items-center">
                      <Shield
                        className="absolute text-gray-400 w-4 h-4"
                        style={{ left: '1rem', top: '50%', transform: 'translateY(-50%)' }}
                      />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={{ paddingLeft: '2.75rem', paddingRight: '2.5rem' }}
                        className="h-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5"
                      >
                        {showPassword ? (
                          <EyeOff className="text-gray-400 hover:text-gray-600 w-5 h-5" />
                        ) : (
                          <Eye className="text-gray-400 hover:text-gray-600 w-5 h-5" />
                        )}
                      </button>
                    </div>

                  <Button 
                    type="submit" 
                      style={{
                        backgroundColor: '#47a1bd',
                        color: '#fff'
                      }}
                    className="w-full text-base font-semibold" 
                    disabled={isLoading || !username || !password}
                  >
                    {isLoading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="patient" className="space-y-4">
                {/* Info box */}
                <div className="p-4 border rounded-lg" style={{ backgroundColor: '#d6eef5', borderColor: '#96cfe0' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Hash className="w-4 h-4" style={{ color: '#96cfe0' }} />
                    <span className="font-medium" style={{ color: '#004f61' }}>Patient Portal</span>
                  </div>
                  <p className="text-sm" style={{ color: '#004f61' }}>
                    You can scan your QR code or type your queue number manually to access your visit status.
                  </p>
                </div>

                {/* QR Scanner */}
                {showScanner ? (
                  <div className="p-4 border-2 rounded-lg bg-white shadow-lg" style={{ borderColor: '#96cfe0' }}>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium" style={{ color: '#004f61' }}>Scan Your QR Code</h4>
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
                      <div className="relative w-full aspect-square max-w-sm mx-auto overflow-hidden rounded-lg border-2 bg-gray-900"
                        style={{ borderColor: '#96cfe0' }}>
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
                              <div className="w-3/4 h-3/4 border-2 rounded-lg relative"
                                style={{ borderColor: 'white' }}>
                                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 rounded-tl-lg"
                                  style={{ borderColor: '#96cfe0' }}></div>
                                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 rounded-tr-lg"
                                  style={{ borderColor: '#96cfe0' }}></div>
                                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 rounded-bl-lg"
                                  style={{ borderColor: '#96cfe0' }}></div>
                                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 rounded-br-lg"
                                  style={{ borderColor: '#96cfe0' }}></div>
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
                    className="w-full"
                    style={{ backgroundColor: '#47a1bdff', hover: { backgroundColor: '#7ec2d7' } }}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Scan QR Code
                  </Button>
                )}

                {/* Manual input (optional) */}
                <form onSubmit={handlePatientSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="queueNumber">Or Enter Queue Number</Label>
                    <div className="relative flex items-center">
                      <Hash
                        className="absolute text-gray-400 w-4 h-4"
                        style={{ left: '1rem', top: '50%', transform: 'translateY(-50%)' }}
                      />
                      <Input
                        id="queueNumber"
                        type="text"
                        placeholder="Enter your queue number manually"
                        value={queueNumber}
                        onChange={(e) => setQueueNumber(e.target.value.toUpperCase())}
                        style={{ paddingLeft: '2.75rem' }}
                        className="font-mono"
                        required
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    style={{ backgroundColor: '#47a1bdff', hover: { backgroundColor: '#7ec2d7' } }} 
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
          <p>Emergency Response Information System</p>
          <p>ERIS • {new Date().getFullYear()}</p>
        </div>
      </div>
    </div>
  );
}
