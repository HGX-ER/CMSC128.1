import { useState } from "react";
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
  Hospital,
  Ticket,
  Printer,
  CheckCircle,
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
  const [generatedQueueNumber, setGeneratedQueueNumber] = useState("");
  const [showGenerator, setShowGenerator] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

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

  // Generate queue number via backend
  const generateQueueNumber = async () => {
    setIsGenerating(true);
    setError("");
    try {
      console.log("Attempting to generate queue number...");
      
      const response = await fetch("http://localhost:5000/api/registration/new", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      console.log("Response status:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response:", errorText);
        throw new Error(`Failed to generate queue number: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Success data:", data);
      
      if (data.success) {
        setGeneratedQueueNumber(data.queueNumber);
        setShowGenerator(true);

        setTimeout(() => {
          handleUseGeneratedNumber(true, data.queueNumber);
        }, 5000);
      } else {
        throw new Error(data.error || "Failed to generate queue number");
      }
    } catch (err) {
      console.error("Full error:", err);
      setError(err.message || "Failed to generate queue number");
    } finally {
      setIsGenerating(false);
    }
  };

  // Use the generated number and automatically check status
  const handleUseGeneratedNumber = async (autoCheck = false, newQueue) => {
    const numToUse = newQueue || generatedQueueNumber;

    if (autoCheck) {
      setQueueNumber(numToUse);
      setShowGenerator(false);

      setTimeout(async () => {
        setIsLoading(true);
        setError("");

        try {
          const result = await onQueueLogin(numToUse);
          if (!result.success) setError(result.error);
        } catch {
          setError("An unexpected error occurred");
        } finally {
          setIsLoading(false);
        }
      }, 2000);
    } else {
      setQueueNumber(numToUse);
      setShowGenerator(false);
    }
  };

  const handlePrintQueueNumber = () => {
    const printWindow = window.open('', '', 'width=400,height=600');
    printWindow.document.write(`
      <html>
        <head>
          <title>ED Queue Number</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              text-align: center;
            }
            .header {
              color: #004f61;
              margin-bottom: 20px;
            }
            .queue-number {
              font-size: 32px;
              font-weight: bold;
              color: #47a1bd;
              padding: 20px;
              border: 3px solid #96cfe0;
              border-radius: 10px;
              margin: 20px 0;
              letter-spacing: 2px;
            }
            .info {
              color: #666;
              margin-top: 20px;
              line-height: 1.6;
            }
            .footer {
              margin-top: 30px;
              color: #999;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1><b> ED Sats </b></h1>
            <h2>Queue Number</h2>
          </div>
          <div class="queue-number">${generatedQueueNumber}</div>
          <div class="info">
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            <p><strong>Time:</strong> ${new Date().toLocaleTimeString()}</p>
            <p>Please keep this number safe.</p>
            <p>You will need it to check your visit status.</p>
          </div>
          <div class="footer">
            <p>Emergency Department Real-Time Patient Tracking System</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div
      className="min-h-screen bg-cover bg-center flex items-center justify-center p-4"
      style={{
        backgroundImage: "url('https://xmple.com/wallpaper/white-gradient-blue-linear-3840x2160-c2-add8e6-ffffff-a-285-f-14.svg')"
      }}
    >
      <div className="w-full max-w-md space-y-6">
        <Card className="shadow-lg">
          <CardHeader className="text-center flex flex-col items-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
              style={{ backgroundColor: "#96cfe0" }}
            >
              <Hospital className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-4xl font-bold" style={{ color: "#004f61" }}>ED Sats</CardTitle>
            <CardDescription className="text-lg mt-2">
              Emergency Department Real-Time Patient Tracking and Satisfaction Monitoring System 
            </CardDescription>
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
                <CardDescription className="text-sm text-center mb-2">
                  Sign in with your hospital account to access the staff dashboard.
                </CardDescription>
              )}

              {/* Staff Login */}
              <TabsContent value="staff" className="space-y-4">
                <form onSubmit={handleStaffSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <div className="relative">
                      <User className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="username"
                        type="text"
                        placeholder="Enter your username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        style={{ paddingLeft: "4rem" }} 
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Shield className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={{ paddingLeft: "4rem", paddingRight: "2.5rem" }} 
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                    </div>
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
                    <span className="font-medium" style={{ color: "#004f61" }}>
                      Patient Portal
                    </span>
                  </div>
                  <p className="text-sm" style={{ color: "#004f61" }}>
                    Generate a new queue number for your ED visit, or enter your existing number to check your status.
                  </p>
                </div>

                {/* Queue Number Generator */}
                {!showGenerator ? (
                  <div className="space-y-3">
                    <div className="text-center">
                      <Button
                        type="button"
                        onClick={generateQueueNumber}
                        className="w-full"
                        style={{
                          backgroundColor: "#4CAF50",
                          color: "white",
                        }}
                        disabled={isGenerating}
                      >
                        <Ticket className="w-4 h-4 mr-2" />
                        {isGenerating ? "Generating..." : "Generate Queue Number"}
                      </Button>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                          Or enter queue number
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Card style={{ backgroundColor: "#f0f9ff", borderColor: "#47a1bd" }}>
                    <CardContent className="p-6">
                      <div className="text-center space-y-4">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <CheckCircle className="w-6 h-6 text-green-600" />
                          <h3 className="font-semibold text-lg" style={{ color: "#004f61" }}>
                            Queue Number Generated!
                          </h3>
                        </div>
                        <div
                          className="p-4 border-2 rounded-lg"
                          style={{
                            backgroundColor: "white",
                            borderColor: "#47a1bd",
                          }}
                        >
                          <p className="text-sm text-gray-600 mb-2">Your Queue Number:</p>
                          <p
                            className="text-3xl font-mono tracking-wider"
                            style={{ color: "#47a1bd" }}
                          >
                            {generatedQueueNumber}
                          </p>
                        </div>
                        <p className="text-sm text-gray-600">
                          Please save this number. You'll need it to check your visit status.
                        </p>
                        <p className="text-xs text-gray-500">
                          The generated queue number will be displayed for 5 seconds and automatically logins.
                        </p>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            onClick={handlePrintQueueNumber}
                            variant="outline"
                            className="flex-1"
                            style={{ borderColor: "#47a1bd", color: "#47a1bd" }}
                          >
                            <Printer className="w-4 h-4 mr-2" />
                            Print
                          </Button>
                          <Button
                            type="button"
                            onClick={() => handleUseGeneratedNumber(false)}
                            className="flex-1"
                            style={{
                              backgroundColor: "#47a1bd",
                              color: "white",
                            }}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Use This Number
                          </Button>
                        </div>
                        <div className="text-center">
                          <Button
                            type="button"
                            onClick={() => handleUseGeneratedNumber(true)}
                            variant="outline"
                            className="w-full"
                            style={{ borderColor: "#4CAF50", color: "#4CAF50" }}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Check Status Now
                          </Button>
                        </div>
                        <Button
                          type="button"
                          onClick={() => setShowGenerator(false)}
                          variant="ghost"
                          className="w-full text-sm"
                        >
                          Cancel
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <form onSubmit={handlePatientSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="queueNumber">Enter Queue Number</Label>
                    <div className="relative">
                      <Hash className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="queueNumber"
                        type="text"
                        placeholder="Enter your queue number"
                        value={queueNumber}
                        onChange={(e) => setQueueNumber(e.target.value.toUpperCase())}
                        className="!pl-14 font-mono"
                        style={{ paddingLeft: "4rem", paddingRight: "2.5rem" }} 
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    style={{
                      backgroundColor: "#47a1bd",
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
          <p>Emergency Department Real-Time Patient Tracking and Satisfaction Monitoring System</p>
          <p>ED Sats • {new Date().getFullYear()}</p>
        </div>
      </div>
    </div>
  );
}