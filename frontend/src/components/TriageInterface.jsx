import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { FaUserInjured, FaExclamationTriangle } from "react-icons/fa";

const ESI_COLORS = {
  1: "bg-red-600 text-white",
  2: "bg-orange-500 text-white",
  3: "bg-yellow-500 text-black",
  4: "bg-green-500 text-white",
  5: "bg-blue-500 text-white",
};

export function TriageInterface({ onBack }) {
  const [waitingPatients, setWaitingPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 🧩 Fetch all patients waiting for triage
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoading(true);
        const res = await fetch("https://node-mysql-api-zsam.onrender.com/api/triage");
        if (!res.ok) throw new Error("Failed to fetch triage patients");
        const data = await res.json();
        // exclude locally canceled queue numbers so canceled numbers won't appear in triage UI
        let canceled = [];
        try {
          const raw = localStorage.getItem("canceledQueueNumbers");
          canceled = raw ? JSON.parse(raw) : [];
        } catch (e) {
          console.error("Failed to read canceledQueueNumbers from localStorage", e);
        }
        const filtered = data.filter((p) => !canceled.includes(p.queue_number));
        setWaitingPatients(filtered);
      } catch (err) {
        console.error(err);
        setError("Failed to load triage patients");
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();

    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchPatients, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSelect = (patient) => {
    setSelectedPatient(patient);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div />
        </div>

        {/* ESI Reference Guide */}
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="font-bold text-lg">ESI Reference Guide</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="flex items-start gap-3">
              <Badge className="bg-red-600 text-white">ESI 1</Badge>
              <div>
                <div className="font-semibold text-base">Resuscitation</div>
                <div className="text-sm text-gray-600">Immediate, life‑threatening problem requiring resuscitation.</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Badge className="bg-orange-500 text-white">ESI 2</Badge>
              <div>
                <div className="font-semibold text-base">Emergent</div>
                <div className="text-sm text-gray-600">High risk situation; needs rapid evaluation/intervention.</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Badge className="bg-yellow-500 text-black">ESI 3</Badge>
              <div>
                <div className="font-semibold text-base">Urgent</div>
                <div className="text-sm text-gray-600">Requires many resources but can wait short while; moderate risk.</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Badge className="bg-green-500 text-white">ESI 4</Badge>
              <div>
                <div className="font-semibold text-base">Less Urgent</div>
                <div className="text-sm text-gray-600">One resource needed; low risk and stable.</div>
              </div>
            </div>

            <div className="flex items-start gap-3 col-span-1 sm:col-span-2">
              <Badge className="bg-blue-500 text-white">ESI 5</Badge>
              <div>
                <div className="font-semibold text-base">Non‑Urgent</div>
                <div className="text-sm text-gray-600">Minimal resources; non-urgent problems.</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Patients waiting for triage */}
        <Card>
          <CardHeader>
            <CardTitle>Patients Waiting for Triage</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-gray-500">Loading patients...</p>
            ) : error ? (
              <p className="text-red-500">{error}</p>
            ) : waitingPatients.length === 0 ? (
              <p className="text-gray-500">No patients waiting for triage</p>
            ) : (
              <ul className="space-y-2">
                {waitingPatients.map((p) => (
                  <li
                    key={p.encounter_id}
                    className={`flex items-center justify-between p-3 rounded-md border cursor-pointer hover:bg-blue-50 ${
                      selectedPatient?.encounter_id === p.encounter_id
                        ? "border-blue-400 bg-blue-50"
                        : "border-gray-200"
                    }`}
                    onClick={() => handleSelect(p)}
                  >
                    <div>
                      <p className="font-medium text-gray-800">{p.full_name}</p>
                      <p className="text-sm text-gray-500">
                        Queue: {p.queue_number} • Status: {p.status}
                      </p>
                    </div>
                    <Badge className="bg-gray-200 text-gray-700">
                      DOB: {new Date(p.dob).toLocaleDateString()}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* ESI Assignment Section */}
        <Card>
          <CardHeader>
            <CardTitle>Emergency Severity Index (ESI)</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedPatient ? (
              <div className="space-y-3">
                <p className="text-gray-700">
                  <strong>Selected:</strong> {selectedPatient.full_name} ({selectedPatient.queue_number})
                </p>
                <div className="flex gap-3 overflow-x-auto no-scrollbar">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div key={level} className="flex-1 min-w-[140px]">
                      <Button
                        className={`${ESI_COLORS[level]} font-semibold py-6 text-xl rounded-lg w-full flex items-center justify-center`}
                        onClick={async () => {
                          try {
                            await fetch(
                              `https://node-mysql-api-zsam.onrender.com/api/triage/encounters/${selectedPatient.encounter_id}/triage`,
                              {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ esi: level }),
                              }
                            );
                            alert(`ESI ${level} assigned to ${selectedPatient.full_name}`);
                            setSelectedPatient(null);
                          } catch (err) {
                            console.error(err);
                            alert("Failed to assign ESI");
                          }
                        }}
                      >
                        <span className="text-2xl">ESI {level}</span>
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-gray-500">
                Select a patient above to assign ESI level
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
