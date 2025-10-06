import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

export function KioskInterface({ onGenerateId }) {
  const handleGenerateId = () => {
    const id = onGenerateId();
    // Show success message or feedback
  };

  return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl text-blue-600">Emergency Department</CardTitle>
          <CardDescription className="text-lg">
            Welcome to the ED Queue System
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <div className="space-y-2">
            <p className="text-gray-600">Click the button below to receive your queue number</p>
            <p className="text-sm text-gray-500">
              Please keep your number safe - you will need it for registration
            </p>
          </div>
          
          <Button 
            onClick={handleGenerateId}
            size="lg"
            className="w-full h-16 text-xl bg-blue-600 hover:bg-blue-700"
          >
            Generate Queue Number
          </Button>
          
          <div className="text-xs text-gray-500 space-y-1">
            <p>Current Time: {new Date().toLocaleString()}</p>
            <p>Please proceed to Triage after receiving your number</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}