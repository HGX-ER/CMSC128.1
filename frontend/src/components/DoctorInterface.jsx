import { useEffect, useMemo, useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { DoctorPatientCard } from "./DoctorPatientCard";
import { Stethoscope, Activity } from "lucide-react";

const ESI_COLORS = {
  1: "bg-red-600 text-white",
  2: "bg-orange-500 text-white",
  3: "bg-yellow-500 text-black",
  4: "bg-green-500 text-white",
  5: "bg-blue-500 text-white",
};

function ageFromDOB(dob) {
  if (!dob) return "Unknown";
  const d = new Date(dob);
  const today = new Date();
  let a = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) a--;
  return `${a}y`;
}

export function DoctorInterface({
  patients: _unused,             // we fetch our own
  onUpdatePatient,               // optional callback to parent
  onMoveToStage,                 // optional callback to parent
  getTotalTime,                  // optional util
  currentDoctorUsername,         // e.g., "dr.sarahsmith" or similar from DB
}) {
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [consultationOpen, setConsultationOpen] = useState(false);
  const [diagnosis, setDiagnosis] = useState("");
  const [disposition, setDisposition] = useState("");
  const [consultationStartTime, setConsultationStartTime] = useState(null);

  const [doctor, setDoctor] = useState({
    full_name: "",
    specialty: "Emergency Medicine",
    room: "200",
    floor: "2nd Floor",
  });
  const [doctorPatients, setDoctorPatients] = useState([]);

  // Fetch doctor profile + patients, with auto-refresh
  useEffect(() => {
    let stop = false;

    async function load() {
      try {
        const prof = await fetch(
          `https://cmsc1281-production.up.railway.app/api/doctor/${encodeURIComponent(currentDoctorUsername)}`
        ).then((r) => (r.ok ? r.json() : null));
        if (!stop && prof) setDoctor(prof);
      } catch (e) {
        console.warn("doctor profile load failed:", e);
      }

      try {
        const list = await fetch(
          `https://cmsc1281-production.up.railway.app/api/doctor/${encodeURIComponent(currentDoctorUsername)}/patients`
        ).then((r) => (r.ok ? r.json() : []));
        const normalized = (list || []).map((p) => ({
          ...p,
          arrivalTime: p.arrivalTime ? new Date(p.arrivalTime) : (p.arrival_time ? new Date(p.arrival_time) : null),
          currentStage: (p.currentStage || p.stage || p.status || "").toString().toLowerCase().replace(/[\s-]+/g, "_"),
        }));
        if (!stop) setDoctorPatients(normalized);
      } catch (e) {
        console.warn("doctor patient list load failed:", e);
      }
    }

    load();
    const t = setInterval(load, 5000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [currentDoctorUsername]);

  // Groups for UI
  const waitingPatients = useMemo(
    () => doctorPatients.filter((p) => p.currentStage === "waiting_doctor"),
    [doctorPatients]
  );
  const consultingPatients = useMemo(
    () => doctorPatients.filter((p) => p.currentStage === "consultation"),
    [doctorPatients]
  );
  const completedPatients = useMemo(
    () =>
      doctorPatients.filter(
        (p) =>
          p.disposition &&
          !["waiting_doctor", "consultation"].includes(p.currentStage)
      ),
    [doctorPatients]
  );

  const selectedPatientData = useMemo(
    () => doctorPatients.find((p) => p.id === selectedPatient),
    [doctorPatients, selectedPatient]
  );

  const motivationalPhrases = [
    "Healing starts with you – make today count! 💙",
    "Every patient is a chance to change a life. 🌟",
    "Your skill and compassion save lives – keep going! 🩺",
    "A calm mind and caring heart create miracles every day.",
    "Today is another opportunity to make a difference!",
  ];
  const randomMotivation = useMemo(() => {
    return motivationalPhrases[Math.floor(Math.random() * motivationalPhrases.length)];
  }, []); 

  // Actions
  const handleSelectPatient = (id) => setSelectedPatient(id);

  const startConsult = async () => {
    if (!selectedPatient) return;
    try {
      const res = await fetch(
        `https://cmsc1281-production.up.railway.app/api/doctor/encounters/${selectedPatient}/start`,
        { method: "POST", headers: { "Content-Type": "application/json" } }
      );
      if (!res.ok) throw new Error("start failed");

      // optimistically flip stage locally
      setDoctorPatients((prev) =>
        prev.map((p) =>
          p.id === selectedPatient ? { ...p, currentStage: "consultation" } : p
        )
      );

      setConsultationOpen(true);
      setConsultationStartTime(new Date());
    } catch (e) {
      console.error(e);
      alert("Failed to start consultation.");
    }
  };

  const completeConsult = async () => {
    if (!selectedPatient || !diagnosis || !disposition) return;
    try {
      const res = await fetch(
        `https://cmsc1281-production.up.railway.app/api/doctor/encounters/${selectedPatient}/complete`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ diagnosis, disposition }),
        }
      );
      if (!res.ok) throw new Error("complete failed");

      onUpdatePatient?.(selectedPatient, { diagnosis, disposition });

      // Refresh immediately
      const list = await fetch(
        `https://cmsc1281-production.up.railway.app/api/doctor/${encodeURIComponent(currentDoctorUsername)}/patients`
      ).then((r) => (r.ok ? r.json() : []));
      const normalized = (list || []).map((p) => ({
        ...p,
        arrivalTime: p.arrivalTime ? new Date(p.arrivalTime) : (p.arrival_time ? new Date(p.arrival_time) : null),
        currentStage: (p.currentStage || p.stage || p.status || "").toString().toLowerCase().replace(/[\s-]+/g, "_"),
      }));
      setDoctorPatients(normalized);

      setConsultationOpen(false);
      setSelectedPatient(null);
      setDiagnosis("");
      setDisposition("");
      setConsultationStartTime(null);
    } catch (e) {
      console.error(e);
      alert("Failed to complete consultation.");
    }
  };

  const getTotalTimeOrFallback = (p) =>
    typeof getTotalTime === "function"
      ? getTotalTime(p)
      : p.arrivalTime
      ? Math.max(0, Math.round((Date.now() - p.arrivalTime.getTime()) / 60000))
      : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header with Doctor Info */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl">
            Hey, {doctor.full_name ? `Dr. ${doctor.full_name.split(" ").slice(-1)[0]}` : "Doc"}! 👋
          </h1>
          <p className="text-gray-600 mt-1">{randomMotivation}</p>
        </div>
        <div className="flex gap-4">
          <Badge variant="outline" className="text-lg px-4 py-2">
            Waiting: {waitingPatients.length}
          </Badge>
          <Badge variant="outline" className="text-lg px-4 py-2 bg-yellow-100">
            In Consultation: {consultingPatients.length}
          </Badge>
          <Badge variant="outline" className="text-lg px-4 py-2 bg-green-100">
            Completed: {completedPatients.length}
          </Badge>
        </div>
      </div>

      {/* Casual Location Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white text-xl">
                📍
              </div>
              <div>
                <p className="text-sm text-gray-600">You're working from</p>
                <p className="font-semibold text-lg text-blue-900">
                  Room {doctor.room || "200"}, {doctor.floor || "2nd Floor"}
                </p>
              </div>
            </div>
            <div className="text-right">
              <Badge className="bg-blue-500 text-white text-sm px-3 py-1">
                {doctor.specialty || "Emergency Medicine"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Tabs */}
      <Tabs defaultValue="consultation" className="w-full">
        <TabsList className="flex justify-between w-full space-x-3 overflow-x-auto pb-1 bg-transparent border-b pb-2">
          <TabsTrigger
            value="consultation"
            className="
              flex items-center justify-center gap-2 min-w-[120px] px-6 py-3 rounded-xl text-sm sm:text-base font-medium
              text-blue-700 border border-blue-200 bg-white shadow-sm transition-all duration-200
              hover:bg-blue-50 hover:text-blue-700
              dark:hover:bg-gray-800 
              data-[state=active]:!bg-blue-100
              dark:data-[state=active]:!bg-blue-100 
              data-[state=active]:!text-blue-800
              dark:data-[state=active]:!text-blue-800
              data-[state=active]:!border-blue-300
              dark:data-[state=active]:!border-blue-300
              data-[state=active]:shadow-lg
              data-[state=active]:scale-[1.05]
            "
          >
            <Stethoscope className="w-4 h-4" />
            Patient Consultation
          </TabsTrigger>
          
          <TabsTrigger
            value="status"
            className="
              flex items-center justify-center gap-2 min-w-[120px] px-6 py-3 rounded-xl text-sm sm:text-base font-medium
              text-blue-700 border border-blue-200 bg-white shadow-sm transition-all duration-200
              hover:bg-blue-50 hover:text-blue-700
              dark:hover:bg-gray-800 
              data-[state=active]:!bg-blue-100
              dark:data-[state=active]:!bg-blue-100 
              data-[state=active]:!text-blue-800
              dark:data-[state=active]:!text-blue-800
              data-[state=active]:!border-blue-300
              dark:data-[state=active]:!border-blue-300
              data-[state=active]:shadow-lg
              data-[state=active]:scale-[1.05]
            "
          >
            <Activity className="w-4 h-4" />
            Patient Status
          </TabsTrigger>
        </TabsList>

        {/* Patient Consultation Tab */}
        <TabsContent value="consultation" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Waiting Patients */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  ⏰ Patients Waiting for You
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {waitingPatients.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">✨ All caught up!</p>
                    <p className="text-sm text-gray-400 mt-1">No patients waiting right now</p>
                  </div>
                ) : (
                  waitingPatients
                    .sort((a, b) => (a.esiLevel || 5) - (b.esiLevel || 5))
                    .map((patient) => (
                      <DoctorPatientCard
                        key={patient.id}
                        patient={patient}
                        isSelected={selectedPatient === patient.id}
                        onSelect={() => handleSelectPatient(patient.id)}
                        getTotalTime={getTotalTimeOrFallback}
                        doctorRoom={doctor.room || "200"}
                        doctorFloor={doctor.floor || "2nd Floor"}
                      />
                    ))
                )}
              </CardContent>
            </Card>

            {/* Patient Profile & Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">👤 Patient Details</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedPatientData ? (
                  <div className="space-y-4">
                    {/* Patient Details */}
                    <div className="p-4 bg-blue-50 rounded-lg space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-medium">
                            {selectedPatientData.name || selectedPatientData.full_name}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {ageFromDOB(selectedPatientData.dateOfBirth)} • {selectedPatientData.sex}
                          </p>
                          <p className="text-xs text-gray-500 font-mono">
                            ID: {selectedPatientData.id}
                          </p>
                        </div>
                        {selectedPatientData.esiLevel && (
                          <Badge className={ESI_COLORS[selectedPatientData.esiLevel]}>
                            ESI {selectedPatientData.esiLevel}
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
                        <div>
                          <span className="font-medium">Arrival:</span>{" "}
                          {selectedPatientData.arrivalTime
                            ? selectedPatientData.arrivalTime.toLocaleString()
                            : "—"}
                        </div>
                        <div>
                          <span className="font-medium">Total Time:</span>{" "}
                          {getTotalTimeOrFallback(selectedPatientData)}m
                        </div>
                      </div>
                    </div>

                    {/* Room Information */}
                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-purple-800">
                            Consultation Location:
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Badge className="bg-purple-100 text-purple-800">
                            Room {doctor.room || "200"}
                          </Badge>
                          <Badge className="bg-purple-100 text-purple-800">
                            {doctor.floor || "2nd Floor"}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {selectedPatientData.currentStage === "waiting_doctor" ? (
                      <Button onClick={startConsult} className="w-full" size="lg">
                        🩺 START CONSULTATION
                      </Button>
                    ) : selectedPatientData.currentStage === "consultation" ? (
                      <div className="space-y-3">
                        <Badge className="bg-yellow-500 text-white w-full justify-center py-2">
                          Consultation in Progress
                        </Badge>
                        <Button
                          onClick={() => setConsultationOpen(true)}
                          variant="outline"
                          className="w-full"
                        >
                          Continue Consultation
                        </Button>
                        {consultationStartTime && (
                          <p className="text-sm text-gray-600 text-center">
                            Started: {consultationStartTime.toLocaleTimeString()}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <Badge variant="secondary">
                          Patient Status: {selectedPatientData.currentStage?.replace("_", " ")}
                        </Badge>
                        <p className="text-sm text-gray-500 mt-2">Not available for consultation</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>Select a patient to view their profile</p>
                    <p className="text-sm mt-2">Click on any patient card to see their details</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Information Note */}
          <Card className="border-blue-200 bg-blue-50 mt-6">
            <CardContent className="p-4">
              <p className="text-sm text-blue-800">
                💡 <strong>Quick Tip:</strong> Patients are assigned to you by the nursing staff
                during registration. If your queue looks empty, grab a coffee and check with the
                registration desk! ☕
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Patient Status Tab */}
        <TabsContent value="status" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Active Consultations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  🩺 Active Consultations
                  <Badge variant="outline" className="ml-auto">
                    {consultingPatients.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {consultingPatients.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No active consultations</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Patients in consultation will appear here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {consultingPatients.map((p) => (
                      <div
                        key={p.id}
                        className="p-4 border rounded-lg bg-yellow-50 hover:bg-yellow-100 transition-colors"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="font-medium text-lg">{p.name || p.full_name}</div>
                            <Badge className="bg-yellow-500 text-white">In Progress</Badge>
                          </div>
                          <div className="text-sm text-gray-600">
                            {ageFromDOB(p.dateOfBirth)} • {p.sex}
                          </div>
                          <div className="text-xs text-gray-500">
                            <p>
                              <strong>Queue:</strong> {p.queue_number || p.id}
                            </p>
                          </div>
                          {p.esiLevel && (
                            <Badge className={ESI_COLORS[p.esiLevel]}>ESI {p.esiLevel}</Badge>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedPatient(p.id);
                              setConsultationOpen(true);
                            }}
                            className="w-full mt-2"
                          >
                            Continue Consultation →
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Completed Today */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  ✅ Completed Today
                  <Badge variant="outline" className="ml-auto">
                    {completedPatients.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {completedPatients.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No completed consultations yet</p>
                    <p className="text-sm text-gray-400 mt-1">
                      They'll show up here once you're done
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {completedPatients.map((p) => (
                      <div key={p.id} className="p-3 border border-green-200 rounded-lg bg-green-50">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="font-medium text-green-900">{p.name || p.full_name}</div>
                            <Badge className="bg-green-600 text-white text-xs">Done</Badge>
                          </div>
                          <div className="text-sm text-green-700">
                            {ageFromDOB(p.dateOfBirth)} • {p.sex}
                          </div>
                          <div className="text-xs text-green-600 bg-white p-2 rounded border border-green-200">
                            <p>
                              <strong>Disposition:</strong> {p.disposition}
                            </p>
                          </div>
                          {p.esiLevel && (
                            <Badge className={ESI_COLORS[p.esiLevel]}>ESI {p.esiLevel}</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Consultation Dialog */}
      <Dialog open={consultationOpen} onOpenChange={setConsultationOpen}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto w-[95vw]">
          <DialogHeader>
            <DialogTitle className="text-xl">🩺 Patient Consultation</DialogTitle>
            <DialogDescription>
              Complete the patient consultation by providing a diagnosis and determining the
              appropriate disposition for their care.
            </DialogDescription>
          </DialogHeader>

          {selectedPatientData && (
            <div className="space-y-6">
              {/* Patient Summary */}
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-medium text-blue-900">
                      {selectedPatientData.name || selectedPatientData.full_name}
                    </h3>
                    <p className="text-sm text-blue-700">
                      {ageFromDOB(selectedPatientData.dateOfBirth)} • {selectedPatientData.sex} • DOB:{" "}
                      {selectedPatientData.dateOfBirth || "—"}
                    </p>
                    <p className="text-xs text-blue-600 font-mono">
                      Patient ID: {selectedPatientData.id}
                    </p>
                  </div>
                  {selectedPatientData.esiLevel && (
                    <Badge className={ESI_COLORS[selectedPatientData.esiLevel]}>
                      ESI Level {selectedPatientData.esiLevel}
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4 mt-3 text-xs text-blue-700">
                  <div>
                    <span className="font-medium">Arrival:</span>
                    <br />
                    {selectedPatientData.arrivalTime
                      ? selectedPatientData.arrivalTime.toLocaleString()
                      : "—"}
                  </div>
                  <div>
                    <span className="font-medium">Total Time:</span>
                    <br />
                    {getTotalTimeOrFallback(selectedPatientData)} minutes
                  </div>
                  <div>
                    <span className="font-medium">Consultation Start:</span>
                    <br />
                    {consultationStartTime?.toLocaleTimeString() || "Just started"}
                  </div>
                </div>
              </div>

              {/* Consultation Form */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="diagnosis" className="text-base font-medium">
                    Clinical Diagnosis *
                  </Label>
                  <Textarea
                    id="diagnosis"
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    placeholder="Enter comprehensive diagnosis and assessment..."
                    rows={4}
                    className="mt-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Include primary diagnosis and any relevant differential diagnoses
                  </p>
                </div>

                <div>
                  <Label htmlFor="disposition" className="text-base font-medium">
                    Patient Disposition *
                  </Label>
                  <Select value={disposition} onValueChange={setDisposition}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select patient disposition..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Discharge">🏠 Discharge Home</SelectItem>
                      <SelectItem value="Observation">👁️ Observation Unit</SelectItem>
                      <SelectItem value="Admission Non-ICU">🏥 Hospital Admission (General Floor)</SelectItem>
                      <SelectItem value="Admission ICU">🚨 ICU Admission</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">Choose the appropriate next step for patient care</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4 border-t">
                <Button variant="outline" onClick={() => setConsultationOpen(false)} className="flex-1">
                  💾 Save & Continue Later
                </Button>
                <Button
                  onClick={completeConsult}
                  disabled={!disposition || !diagnosis}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  ✅ Complete Consultation
                </Button>
              </div>

              {(!disposition || !diagnosis) && (
                <p className="text-sm text-amber-600 text-center bg-amber-50 p-2 rounded">
                  ⚠️ Please complete both diagnosis and disposition to finish the consultation
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
