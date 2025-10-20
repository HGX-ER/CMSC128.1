import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { FaUserInjured, FaExclamationTriangle } from "react-icons/fa";

const ESI_COLORS = {
  1: "bg-red-600 text-white",
  2: "bg-orange-500 text-white", 
  3: "bg-yellow-500 text-black",
  4: "bg-green-500 text-white",
  5: "bg-blue-500 text-white"
};

const ESI_DESCRIPTIONS = {
  1: "Resuscitation - Life threatening",
  2: "Emergent - High risk",
  3: "Urgent - Moderate risk", 
  4: "Less Urgent - Low risk",
  5: "Non-urgent - Very low risk"
};

export function TriageInterface({ patients, onUpdatePatient, onMoveToStage, getTotalTime }) {
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedESI, setSelectedESI] = useState("");

  const waitingPatients = patients.filter(p => 
    p.currentStage === 'waiting_triage' || p.currentStage === 'kiosk'
  );

  const handleSelectPatient = (patientId) => {
    setSelectedPatient(patientId);
    setSelectedESI("");
  };

  const handleAssignESI = () => {
    if (selectedPatient && selectedESI) {
      const esiLevel = parseInt(selectedESI);
      onUpdatePatient(selectedPatient, { esiLevel });
      onMoveToStage(selectedPatient, 'waiting_registration');
      setSelectedPatient(null);
      setSelectedESI("");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-lg px-4 py-2">
          Waiting: {waitingPatients.length}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ESI Reference */}
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-lg font-bold">ESI REFERENCE GUIDE</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap md:flex-nowrap justify-center items-start gap-4 overflow-x-auto">
              {Object.entries(ESI_DESCRIPTIONS).map(([level, description]) => (
                <div key={level} className="text-center min-w-[120px]">
                  <Badge className={`${ESI_COLORS[level]} mb-2`}>
                    ESI {level}
                  </Badge>
                  <p className="text-sm">{description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Patient List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-left text-lg font-bold">Patients Waiting for Triage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {waitingPatients.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No patients waiting for triage</p>
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

        {/* ESI Classification */}
        <Card>
          <CardHeader>
            <CardTitle className="text-left text-lg font-bold">Emergency Severity Index (ESI)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedPatient ? (
              <>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p>Selected Patient: <span className="font-mono">{selectedPatient}</span></p>
                </div>

                <div className="space-y-3">
                  <label>Select ESI Level:</label>
                  <Select value={selectedESI} onValueChange={setSelectedESI}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose ESI Level" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ESI_DESCRIPTIONS).map(([level, description]) => (
                        <SelectItem key={level} value={level}>
                          <div className="flex items-center gap-2">
                            <Badge className={ESI_COLORS[level]}>
                              ESI {level}
                            </Badge>
                            <span>{description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  onClick={handleAssignESI}
                  disabled={!selectedESI}
                  className="w-full"
                >
                  Assign ESI Level & Send to Registration
                </Button>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Select a patient above to assign ESI level
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}