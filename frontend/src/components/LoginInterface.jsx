import { useState, useRef, useEffect } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Eye,
  EyeOff,
  User,
  Shield,
  AlertCircle,
  Hash,
  Stethoscope,
  Camera,
  X,
  Hospital,
} from "lucide-react";

const ROLE_INFO = {
  patient: {
    title: "Patient Access",
    description: "Track your ED visit progress",
    color: "bg-blue-100 text-[#004f61]",
    icon: User,
  },
  doctor: {
    title: "Doctor Portal",
    description: "Patient consultations and medical decisions",
    color: "bg-purple-100 text-purple-800",
    icon: Stethoscope,
  },
  nurse: {
    title: "Nursing Station",
    description: "Triage and patient registration",
    color: "bg-green-100 text-green-800",
    icon: User,
  },
  ed_manager: {
    title: "ED Manager Dashboard",
    description: "Patient flow monitoring and analytics",
    color: "bg-orange-100 text-orange-800",
    icon: User,
  },
};

export function LoginInterface({ onLogin, onQueueLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [queueNumber, setQueueNumber] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("patient");
  const [showScanner, setShowScanner] = useState(false);

  const qrRegionId = "qr-reader";

  useEffect(() => {
    let html5QrCode;
    if (showScanner) {
      html5QrCode = new Html5Qrcode(qrRegionId);
      html5QrCode
        .start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            console.log("Scanned:", decodedText);
            setQueueNumber(decodedText.trim());
            setShowScanner(false);
            html5QrCode.stop();
          },
          (errorMsg) => {}
        )
        .catch((err) => console.error("QR start failed:", err));
    }
    return () => {
      if (html5QrCode) html5QrCode.stop().catch(() => {});
    };
  }, [showScanner]);

  const handleStaffSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const result = await onLogin(username, password);
      if (!result.success) setError(result.error || "Login failed");
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePatientSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const result = await onQueueLogin(queueNumber);
      if (!result.success) setError(result.error || "Queue number not found");
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseScanner = () => setShowScanner(false);

  return (
    <div
      className="min-h-screen bg-cover bg-center flex items-center justify-center p-4"
      style={{
        backgroundImage:
          "url('https://xmple.com/wallpaper/white-gradient-blue-linear-3840x2160-c2-add8e6-ffffff-a-285-f-14.svg')",
      }}
    >
      <div className="w-full max-w-md space-y-6">
        <Card className="shadow-lg">
          <CardHeader className="text-center flex flex-col items-center gap-">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "#96cfe0" }}
            >
              <Hospital className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-4xl font-bold -mt-1">ERIS</CardTitle>
            <p className="text-lg mt-0">
              Emergency Response Information System
            </p>
          </CardHeader>

          <CardContent className="space-y-4">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
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

              {activeTab === "staff" && (
                <p className="text-sm text-gray-600 text-center mb-2">
                  Sign in with your hospital account to access the staff
                  dashboard.
                </p>
              )}

              {/* Staff Login */}
              <TabsContent value="staff" className="space-y-4">
                <form onSubmit={handleStaffSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <div className="relative flex items-center">
                      <User
                        className="absolute text-gray-400 w-4 h-4"
                        style={{
                          left: "1rem",
                          top: "50%",
                          transform: "translateY(-50%)",
                        }}
                      />
                      <Input
                        id="username"
                        type="text"
                        placeholder="Enter your username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        style={{ paddingLeft: "2.75rem" }}
                        required
                      />
                    </div>
                  </div>

                  <Label htmlFor="password">Password</Label>
                  <div className="relative flex items-center">
                    <Shield
                      className="absolute text-gray-400 w-4 h-4"
                      style={{
                        left: "1rem",
                        top: "50%",
                        transform: "translateY(-50%)",
                      }}
                    />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      style={{
                        paddingLeft: "2.75rem",
                        paddingRight: "2.5rem",
                      }}
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
                      backgroundColor: "#47a1bd",
                      color: "#fff",
                    }}
                    className="w-full text-base font-semibold"
                    disabled={isLoading || !username || !password}
                  >
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </TabsContent>

              {/* Patient Login */}
              <TabsContent value="patient" className="space-y-4">
                <div
                  className="p-4 border rounded-lg"
                  style={{
                    backgroundColor: "#d6eef5",
                    borderColor: "#96cfe0",
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Hash className="w-4 h-4" style={{ color: "#96cfe0" }} />
                    <span
                      className="font-medium"
                      style={{ color: "#004f61" }}
                    >
                      Patient Portal
                    </span>
                  </div>
                  <p className="text-sm" style={{ color: "#004f61" }}>
                    You can scan your QR code or type your queue number manually
                    to access your visit status.
                  </p>
                </div>

                {/* QR Scanner */}
                {showScanner ? (
                  <div
                    className="p-4 border-2 rounded-lg bg-white shadow-lg"
                    style={{ borderColor: "#96cfe0" }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4
                        className="font-medium"
                        style={{ color: "#004f61" }}
                      >
                        Scan Your QR Code
                      </h4>
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

                    <div
                      id={qrRegionId}
                      className="w-full aspect-square max-w-sm mx-auto rounded-lg border-2 border-[#96cfe0]"
                    />
                    <p className="text-center text-sm text-gray-600 mt-3">
                      Position the QR code within the frame
                    </p>
                  </div>
                ) : (
                  <Button
                    type="button"
                    onClick={() => setShowScanner(true)}
                    className="w-full"
                    style={{
                      backgroundColor: "#47a1bdff",
                      hover: { backgroundColor: "#7ec2d7" },
                    }}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Scan QR Code
                  </Button>
                )}

                <form onSubmit={handlePatientSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="queueNumber">Or Enter Queue Number</Label>
                    <div className="relative flex items-center">
                      <Hash
                        className="absolute text-gray-400 w-4 h-4"
                        style={{
                          left: "1rem",
                          top: "50%",
                          transform: "translateY(-50%)",
                        }}
                      />
                      <Input
                        id="queueNumber"
                        type="text"
                        placeholder="Enter your queue number manually"
                        value={queueNumber}
                        onChange={(e) =>
                          setQueueNumber(e.target.value.toUpperCase())
                        }
                        style={{ paddingLeft: "2.75rem" }}
                        className="font-mono"
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    style={{
                      backgroundColor: "#47a1bdff",
                      hover: { backgroundColor: "#7ec2d7" },
                    }}
                    disabled={isLoading || !queueNumber}
                  >
                    {isLoading ? "Checking..." : "Access My Visit Status"}
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

        {/* Role Info */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">System Access Levels</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(ROLE_INFO).map(([role, info]) => {
              const Icon = info.icon;
              return (
                <div
                  key={role}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <Icon className="w-5 h-5 text-gray-600" />
                  <div className="flex-1">
                    <div className="font-medium">{info.title}</div>
                    <div className="text-sm text-gray-600">
                      {info.description}
                    </div>
                  </div>
                  <Badge className={info.color}>
                    {role.replace("_", " ")}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="text-center text-sm text-gray-500">
          <p>Emergency Response Information System</p>
          <p>ERIS • {new Date().getFullYear()}</p>
        </div>
      </div>
    </div>
  );
}
