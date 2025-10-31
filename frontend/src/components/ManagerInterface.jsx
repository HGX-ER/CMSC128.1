// frontend/src/components/ManagerInterface.jsx
import { useEffect, useMemo, useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { AlertTriangle, Clock } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";

// Label map used in the Manager UI
const STAGE_LABELS = {
  kiosk: 'At Kiosk',
  waiting_triage: 'Waiting for Triage',
  triage: 'In Triage',
  waiting_registration: 'Waiting for Registration',
  registration: 'In Registration',
  waiting_doctor: 'Waiting to be seen by Doctor',
  consultation: 'In Consultation',
  waiting_admission: 'For Admission',
  waiting_observation: 'For Observation',
  waiting_discharge: 'For Discharge',
  admission_orders: 'Admitting Orders In',
  awaiting_non_icu: 'Awaiting transfer to Non-ICU',
  awaiting_icu: 'Awaiting transfer to ICU',
  discharge_documents: 'Discharge Documents In',
  awaiting_departure: 'Awaiting Departure from ED',
  departed: 'Departed'
};

const ESI_COLORS = {
  1: "bg-red-600 text-white",
  2: "bg-orange-500 text-white",
  3: "bg-yellow-500 text-black",
  4: "bg-green-500 text-white",
  5: "bg-blue-500 text-white"
};

// minutes threshold to flag
const TIME_THRESHOLDS = {
  waiting_triage: 15,
  registration: 30,
  waiting_doctor: 60,
  consultation: 120,
  admission_orders: 60,
  awaiting_non_icu: 240,
  awaiting_icu: 60,
  discharge_documents: 30,
  awaiting_departure: 30
};

// Small helper to safely Date-ify ISO/null
const asDate = (iso) => (iso ? new Date(iso) : null);

// Heuristic: try to derive a reasonable "stage start" from available columns
function pickStageStart(p) {
  const stage = p.currentStage;
  // choose the most relevant timestamp available for that stage
  switch (stage) {
    case "triage":
      return asDate(p.triageTime) || asDate(p.arrivalTime);
    case "registration":
      // you might add registration start if you later store it;
      return asDate(p.triageTime) || asDate(p.arrivalTime);
    case "waiting_doctor":
      return asDate(p.roomTime) || asDate(p.triageTime) || asDate(p.arrivalTime);
    case "consultation":
      return asDate(p.providerStartTime) || asDate(p.roomTime) || asDate(p.triageTime) || asDate(p.arrivalTime);
    case "waiting_observation":
    case "waiting_admission":
    case "waiting_discharge":
      // after consult completes we don’t have a separate time column;
      // use providerStartTime as the nearest pivot if available
      return asDate(p.providerStartTime) || asDate(p.triageTime) || asDate(p.arrivalTime);
    default:
      return asDate(p.arrivalTime);
  }
}

function minutesSince(date) {
  if (!date) return 0;
  return Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
}

export function ManagerInterface() {
  const [boardPatients, setBoardPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);

  // Fetch from backend whiteboard, poll every 5s
  useEffect(() => {
    let dead = false;

    async function load() {
      try {
        const res = await fetch("http://localhost:5000/api/whiteboard");
        const data = res.ok ? await res.json() : [];
        if (dead) return;

        // Normalize date objects for FE computations
        const normalized = (data || []).map((r) => ({
          ...r,
          arrivalTime: asDate(r.arrivalTime),
          triageTime: asDate(r.triageTime),
          roomTime: asDate(r.roomTime),
          providerStartTime: asDate(r.providerStartTime),
        }));

        setBoardPatients(normalized);
      } catch (e) {
        console.error("❌ /api/whiteboard failed:", e);
        if (!dead) setBoardPatients([]);
      }
    }

    load();
    const t = setInterval(load, 5000);
    return () => {
      dead = true;
      clearInterval(t);
    };
  }, []);

  // Derived helpers (pure FE)
  const getTotalTime = (p) => minutesSince(p.arrivalTime);
  const getStageTime = (p) => minutesSince(pickStageStart(p));

  // “Active” = everything not departed
  const activePatients = useMemo(
    () => boardPatients.filter((p) => p.currentStage !== "departed"),
    [boardPatients]
  );

  const getPatientsByStage = (stage) =>
    activePatients.filter((p) => p.currentStage === stage);

  const getPatientAge = (p) => {
    if (p.age) return `${p.age}y`;
    if (p.dateOfBirth) {
      const dob = new Date(p.dateOfBirth);
      let a = new Date().getFullYear() - dob.getFullYear();
      const m = new Date().getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && new Date().getDate() < dob.getDate())) a--;
      return `${a}y`;
    }
    return "Unknown";
  };

  const isOverThreshold = (p) => {
    const threshold = TIME_THRESHOLDS[p.currentStage];
    if (!threshold) return false;
    return getStageTime(p) > threshold;
  };

  // Alerts from current dataset
  const alerts = useMemo(() => {
    const out = [];
    activePatients.forEach((p) => {
      const t = TIME_THRESHOLDS[p.currentStage];
      if (t && getStageTime(p) > t) {
        out.push({
          type: "time",
          message: `${p.full_name || p.name || p.queue_number} has been in ${STAGE_LABELS[p.currentStage] || p.currentStage
            } for ${getStageTime(p)} minutes (threshold: ${t}m)`,
        });
      }
      if ((p.esiLevel === 1 || p.esiLevel === 2) && getTotalTime(p) > 30) {
        out.push({
          type: "priority",
          message: `High priority ${p.full_name || p.name || p.queue_number} (ESI ${p.esiLevel}) has waited ${getTotalTime(p)} minutes`,
        });
      }
    });
    return out;
  }, [activePatients]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-lg px-4 py-2">
          Active Patients: {activePatients.length}
        </Badge>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <AlertTriangle className="h-5 w-5" />
              Active Alerts ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.map((a, i) => (
              <Alert key={i} className="border-orange-200">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{a.message}</AlertDescription>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="whiteboard">Whiteboard</TabsTrigger>
          <TabsTrigger value="stages">Stage Management</TabsTrigger>
        </TabsList>

        {/* Overview – quick counts per stage */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Object.entries(STAGE_LABELS).map(([stage, label]) => {
              const count = getPatientsByStage(stage).length;
              if (
                count === 0 &&
                ![
                  "waiting_triage",
                  "waiting_registration",
                  "waiting_doctor",
                  "waiting_admission",
                  "waiting_observation",
                  "waiting_discharge",
                ].includes(stage)
              )
                return null;

              return (
                <Card key={stage}>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold">{count}</div>
                    <div className="text-sm text-gray-600">{label}</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Recently registered (simple example—uses whatever name is available) */}
          <Card>
            <CardHeader>
              <CardTitle>Recently Active Patients</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activePatients.slice(0, 10).map((p) => (
                  <div
                    key={p.id}
                    className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <div className="font-medium">
                        {p.full_name || p.name || p.queue_number}
                      </div>
                      <div className="text-sm text-gray-600">
                        {getPatientAge(p)} • {p.sex || "—"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {p.esiLevel && (
                        <Badge className={ESI_COLORS[p.esiLevel]}>
                          ESI {p.esiLevel}
                        </Badge>
                      )}
                      <Badge variant="outline">
                        {STAGE_LABELS[p.currentStage] || p.currentStage}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Whiteboard table */}
        <TabsContent value="whiteboard" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Patient Whiteboard</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time Arrival</TableHead>
                    <TableHead>Total Elapsed</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>Sex</TableHead>
                    <TableHead>Chief Complaint</TableHead>
                    <TableHead>Diagnosis</TableHead>
                    <TableHead>Stage of Care</TableHead>
                    <TableHead>Stage Time</TableHead>
                    <TableHead>Alerts</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activePatients.map((p) => (
                    <TableRow key={p.id} onClick={() => setSelectedPatient(p)}>
                      <TableCell>
                        {p.arrivalTime ? p.arrivalTime.toLocaleTimeString() : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getTotalTime(p)}m</Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {p.full_name || p.name || p.queue_number}
                      </TableCell>
                      <TableCell>{getPatientAge(p)}</TableCell>
                      <TableCell>{p.sex || "-"}</TableCell>
                      <TableCell className="max-w-xs truncate">{p.chiefComplaint ?? '-'}</TableCell>
                      <TableCell className="max-w-xs truncate">{p.diagnosis ?? '-'}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant="outline">
                            {STAGE_LABELS[p.currentStage] || p.currentStage}
                          </Badge>
                          {p.esiLevel && (
                            <Badge className={ESI_COLORS[p.esiLevel]}>
                              ESI {p.esiLevel}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={isOverThreshold(p) ? "destructive" : "outline"}>
                          {getStageTime(p)}m
                        </Badge>
                      </TableCell>
                      <TableCell className="flex gap-2">
                        {(p.esiLevel === 1 || p.esiLevel === 2) &&
                          getTotalTime(p) > 30 && (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          )}
                        {isOverThreshold(p) && (
                          <Clock className="h-4 w-4 text-orange-500" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stage Management board */}
        <TabsContent value="stages" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(STAGE_LABELS).map(([stage, label]) => {
              const list = getPatientsByStage(stage);
              if (list.length === 0) return null;

              return (
                <Card key={stage}>
                  <CardHeader>
                    <CardTitle className="text-lg">{label}</CardTitle>
                    <Badge variant="outline">{list.length} patients</Badge>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {list.map((p) => (
                      <div key={p.id} className="p-2 bg-gray-50 rounded text-sm">
                        <div className="font-medium">
                          {p.full_name || p.name || p.queue_number}
                        </div>
                        <div className="text-gray-600">
                          {getStageTime(p)}m in stage • {getTotalTime(p)}m total
                        </div>
                        {p.esiLevel && (
                          <Badge className="mt-1" variant="outline">
                            ESI {p.esiLevel}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
