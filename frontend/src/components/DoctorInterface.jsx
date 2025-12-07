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
import { toast } from 'sonner';
import { Stethoscope, Activity, Search } from "lucide-react";
import { formatDisposition } from '../types/patient';
import { Input } from "./ui/input";

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
  patients: _unused,
  onUpdatePatient,
  onMoveToStage,
  getTotalTime,
  currentDoctorUsername,
}) {
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [consultationOpen, setConsultationOpen] = useState(false);
  const [diagnosis, setDiagnosis] = useState("");
  const [disposition, setDisposition] = useState("");
  const [consultationStartTime, setConsultationStartTime] = useState(null);
  const [availableDoctors, setAvailableDoctors] = useState([]);
  const [transferDoctor, setTransferDoctor] = useState("");
  const [transferConfirm, setTransferConfirm] = useState(false);
  
  // ✅ UPDATED: ICD-10 search states - now supports multiple codes
  const [icdSearchTerm, setIcdSearchTerm] = useState("");
  const [selectedIcdCodes, setSelectedIcdCodes] = useState([]); // Changed from single string to array
  const [showIcdDropdown, setShowIcdDropdown] = useState(false);
  const [icdResults, setIcdResults] = useState([]);
  const [icdLoading, setIcdLoading] = useState(false);

  const [doctor, setDoctor] = useState({
    full_name: "",
    specialty: "Emergency Medicine",
    room: "200",
    floor: "2nd Floor",
  });
  const [doctorPatients, setDoctorPatients] = useState([]);

  // Fetch doctor profile + patients
  useEffect(() => {
    let stop = false;

    async function load() {
      try {
        const prof = await fetch(
          `http://localhost:5000/api/doctor/${encodeURIComponent(currentDoctorUsername)}`
        ).then((r) => (r.ok ? r.json() : null));
        if (!stop && prof) setDoctor(prof);
      } catch (e) {
        console.warn("doctor profile load failed:", e);
      }

      try {
        const list = await fetch(
          `http://localhost:5000/api/doctor/${encodeURIComponent(currentDoctorUsername)}/patients`
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

  // Load doctors for transfer
  useEffect(() => {
    let cancelled = false;
    const fetchDoctors = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/doctors');
        if (!res.ok) return;
        const list = await res.json();
        if (cancelled) return;
        const normalized = (list || []).map(d => ({ username: d.username || d.id || d.user || d.name, full_name: d.full_name || d.name || d.display_name }));
        setAvailableDoctors(normalized.filter(d => d.username !== currentDoctorUsername));
      } catch (e) {
        console.warn('Failed to fetch doctors list', e);
      }
    };

    fetchDoctors();
    return () => { cancelled = true; };
  }, [currentDoctorUsername]);

  // Debounced ICD-10 search to backend
  useEffect(() => {
    if (!icdSearchTerm || icdSearchTerm.length < 2) {
      setIcdResults([]);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        setIcdLoading(true);
        const res = await fetch(
          `http://localhost:5000/api/icd10/search?q=${encodeURIComponent(icdSearchTerm)}`,
          { signal: controller.signal }
        );
        if (!res.ok) {
          setIcdResults([]);
          return;
        }
        const data = await res.json();
        setIcdResults(
          (data || []).map((d) => ({
            code: d.code,
            description: d.shortDesc || d.longDesc || "",
          }))
        );
      } catch (e) {
        if (e.name !== "AbortError") {
          console.warn("ICD-10 search failed", e);
        }
        setIcdResults([]);
      } finally {
        setIcdLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [icdSearchTerm]);

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

  // ✅ UPDATED: Handle ICD code selection - add to array
  const handleIcdCodeSelect = (icd) => {
    setSelectedIcdCodes((prev) => {
      // Avoid duplicates
      if (prev.some((c) => c.code === icd.code)) {
        toast.info('Code already selected');
        return prev;
      }
      return [...prev, { code: icd.code, description: icd.description }];
    });

    // Clear search so user can search for another
    setIcdSearchTerm("");
    setShowIcdDropdown(false);
  };

  // ✅ NEW: Remove ICD code
  const removeIcdCode = (code) => {
    setSelectedIcdCodes((prev) => prev.filter((c) => c.code !== code));
  };

  // Actions
  const handleSelectPatient = (id) => setSelectedPatient(id);

  const startConsult = async () => {
    if (!selectedPatient) return;
    try {
      const res = await fetch(
        `http://localhost:5000/api/doctor/encounters/${selectedPatient}/start`,
        { method: "POST", headers: { "Content-Type": "application/json" } }
      );
      if (!res.ok) throw new Error("start failed");

      setDoctorPatients((prev) =>
        prev.map((p) =>
          p.id === selectedPatient ? { ...p, currentStage: "consultation" } : p
        )
      );

      setConsultationOpen(true);
      setConsultationStartTime(new Date());
      setDiagnosis("");
      setDisposition("");
      setIcdSearchTerm("");
      setSelectedIcdCodes([]); // ✅ Clear array
      setShowIcdDropdown(false);
    } catch (e) {
      console.error(e);
      alert("Failed to start consultation.");
    }
  };

const completeConsult = async () => {
  if (!selectedPatient || !diagnosis || !disposition) return;
  try {
    const icdSummary = selectedIcdCodes.map((c) => `${c.code} - ${c.description}`).join("; ");
    const diagnosisWithIcd =
      selectedIcdCodes.length > 0
        ? `${diagnosis}\n\nICD-10 Codes: ${icdSummary}`
        : diagnosis;

    const res = await fetch(
      `http://localhost:5000/api/doctor/encounters/${selectedPatient}/complete`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          diagnosis: diagnosisWithIcd, 
          disposition,
          icdCodes: selectedIcdCodes  // Send as separate array
        }),
      }
    );
    if (!res.ok) throw new Error("complete failed");

      onUpdatePatient?.(selectedPatient, { diagnosis: diagnosisWithIcd, disposition });

      const list = await fetch(
        `http://localhost:5000/api/doctor/${encodeURIComponent(currentDoctorUsername)}/patients`
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
      setIcdSearchTerm("");
      setSelectedIcdCodes([]); // ✅ Clear array
      setShowIcdDropdown(false);
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
      {/* Header */}
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

      {/* Location Card */}
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

      {/* Tabs */}
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

        {/* Consultation Tab */}
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

            {/* Patient Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">👤 Patient Details</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedPatientData ? (
                  <div className="space-y-4">
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

            {/* Completed */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  ✅ Completed Today
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {completedPatients.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No completed consultations yet</p>
                    <p className="text-sm text-gray-400 mt-1">They'll show up here once you're done</p>
                  </div>
                ) : (
                  completedPatients.map((patient) => (
                    <div key={patient.id} className="p-3 border border-green-200 rounded-lg bg-green-50">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-green-900">{patient.name || patient.full_name}</div>
                          <Badge className="bg-green-600 text-white text-xs">
                            Done
                          </Badge>
                        </div>
                        <div className="text-sm text-green-700">
                          {ageFromDOB(patient.dateOfBirth)} • {patient.sex}
                        </div>
                        <div className="text-xs text-green-600 bg-white p-2 rounded border border-green-200">
                          <p><strong>Disposition:</strong> {formatDisposition ? formatDisposition(patient.disposition) : (patient.disposition || '')}</p>
                        </div>
                        {patient.esiLevel && (
                          <Badge className={ESI_COLORS[patient.esiLevel]}>
                            ESI {patient.esiLevel}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

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

        {/* Status Tab */}
        <TabsContent value="status" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
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
                {/* ✅ ICD-10 Code Lookup - Multiple Codes Support */}
                <div className="relative">
                  <Label htmlFor="icdSearch" className="text-base font-medium">
                    ICD-10 Code Lookup
                  </Label>

                  {/* ✅ Selected codes as chips with description on next line */}
                  {selectedIcdCodes.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {selectedIcdCodes.map((icd) => (
                        <div
                          key={icd.code}
                          className="px-3 py-2 text-xs bg-green-50 border border-green-300 rounded-md"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono font-semibold text-green-700">{icd.code}</span>
                            <button
                              type="button"
                              onClick={() => removeIcdCode(icd.code)}
                              className="text-gray-500 hover:text-red-600 font-bold"
                            >
                              ✕
                            </button>
                          </div>
                          <div className="text-gray-700 mt-1">{icd.description}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Search input */}
                  <div className="relative mt-2">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="icdSearch"
                      type="text"
                      placeholder="Search by code or description (e.g., 'R07.9' or 'chest pain')..."
                      value={icdSearchTerm}
                      onChange={(e) => {
                        setIcdSearchTerm(e.target.value);
                        setShowIcdDropdown(true);
                      }}
                      onFocus={() => setShowIcdDropdown(true)}
                      style={{ paddingLeft: "4rem" }}
                    />
                  </div>

                  {/* Dropdown Results from Backend */}
                  {showIcdDropdown && icdSearchTerm && (
                    <div
                      className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                      style={{ zIndex: 1000 }}
                    >
                      {icdLoading ? (
                        <div className="px-4 py-3 text-sm text-gray-500">Searching…</div>
                      ) : icdResults.length > 0 ? (
                        icdResults.slice(0, 20).map((icd, index) => (
                          <div
                            key={`${icd.code}-${index}`}
                            onClick={() => handleIcdCodeSelect(icd)}
                            className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
                          >
                            <div className="flex items-start gap-3">
                              <Badge
                                variant="outline"
                                className="shrink-0 font-mono text-xs"
                              >
                                {icd.code}
                              </Badge>
                              <p className="text-sm text-gray-700 flex-1">
                                {icd.description}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-sm text-gray-500 text-center">
                          No matching ICD-10 codes found
                        </div>
                      )}
                    </div>
                  )}

                  <p className="text-xs text-gray-500 mt-1">
                    You can select multiple ICD-10 codes; click a chip's ✕ to remove it
                  </p>
                </div>

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

              {/* Transfer Patient */}
              <div className="mt-6 p-4 rounded-lg border-2 border-red-300 bg-red-50">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-red-800">Transfer Patient</h3>
                  <p className="text-sm text-red-600">Transfer patient to another doctor</p>
                </div>

                <div className="mt-3 space-y-3">
                  <div>
                    <Label htmlFor="transfer" className="text-sm font-medium text-red-700">Choose receiving doctor</Label>
                    <Select value={transferDoctor} onValueChange={setTransferDoctor}>
                      <SelectTrigger className="min-w-[220px] mt-2">
                        <SelectValue placeholder="Choose doctor to transfer to..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableDoctors.length === 0 ? (
                          <SelectItem value="">No other doctors available</SelectItem>
                        ) : (
                          availableDoctors.map((d) => (
                            <SelectItem key={d.username} value={d.username}>{d.full_name || d.username}</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Note field removed: transfers now only send receiving doctor */}

                  <div className="flex items-center gap-3">
                    <Button
                      onClick={async () => {
                        if (!transferDoctor) {
                          toast.error('Please choose a doctor to transfer to');
                          return;
                        }

                        if (!transferConfirm) {
                          setTransferConfirm(true);
                          setTimeout(() => setTransferConfirm(false), 6000);
                          return;
                        }

                        try {
                          const res = await fetch(`http://localhost:5000/api/doctor/encounters/${selectedPatient}/transfer`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ toDoctor: transferDoctor })
                          });

                          if (!res.ok) throw new Error('Transfer failed');

                          toast.success('Patient transferred');
                          const list = await fetch(
                            `http://localhost:5000/api/doctor/${encodeURIComponent(currentDoctorUsername)}/patients`
                          ).then((r) => (r.ok ? r.json() : []));
                          const normalized = (list || []).map((p) => ({
                            ...p,
                            arrivalTime: p.arrivalTime ? new Date(p.arrivalTime) : (p.arrival_time ? new Date(p.arrival_time) : null),
                            currentStage: (p.currentStage || p.stage || p.status || "").toString().toLowerCase().replace(/[\s-]+/g, "_"),
                          }));
                          setDoctorPatients(normalized);

                          setTransferDoctor("");
                          setTransferConfirm(false);
                          setConsultationOpen(false);
                          setSelectedPatient(null);
                        } catch (e) {
                          console.error(e);
                          toast.error('Failed to transfer patient');
                        }
                      }}
                      className={transferConfirm ? 'bg-red-600 hover:bg-red-700' : ''}
                      size="sm"
                    >
                      {transferConfirm ? 'Confirm Transfer' : 'Transfer'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setTransferDoctor("");
                        setTransferConfirm(false);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
