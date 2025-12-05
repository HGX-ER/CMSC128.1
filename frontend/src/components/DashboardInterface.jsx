import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Edit, Calendar, Clock, X, Search } from "lucide-react@0.487.0";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

// Common ICD-10 codes for Emergency Department
const ICD_10_CODES = [
  { code: "A09.9", description: "Gastroenteritis and colitis of unspecified origin" },
  { code: "B34.9", description: "Viral infection, unspecified" },
  { code: "E11.9", description: "Type 2 diabetes mellitus without complications" },
  { code: "G43.909", description: "Migraine, unspecified, not intractable, without status migrainosus" },
  { code: "I10", description: "Essential (primary) hypertension" },
  { code: "I21.9", description: "Acute myocardial infarction, unspecified" },
  { code: "I50.9", description: "Heart failure, unspecified" },
  { code: "I63.9", description: "Cerebral infarction, unspecified" },
  { code: "J02.9", description: "Acute pharyngitis, unspecified" },
  { code: "J06.9", description: "Acute upper respiratory infection, unspecified" },
  { code: "J18.9", description: "Pneumonia, unspecified organism" },
  { code: "J44.0", description: "Chronic obstructive pulmonary disease with acute lower respiratory infection" },
  { code: "J44.1", description: "Chronic obstructive pulmonary disease with acute exacerbation" },
  { code: "J45.901", description: "Unspecified asthma with acute exacerbation" },
  { code: "K21.9", description: "Gastro-esophageal reflux disease without esophagitis" },
  { code: "K52.9", description: "Noninfective gastroenteritis and colitis, unspecified" },
  { code: "K80.20", description: "Calculus of gallbladder without cholecystitis without obstruction" },
  { code: "M25.561", description: "Pain in right knee" },
  { code: "M54.5", description: "Low back pain" },
  { code: "N39.0", description: "Urinary tract infection, site not specified" },
  { code: "R05.9", description: "Cough, unspecified" },
  { code: "R06.02", description: "Shortness of breath" },
  { code: "R07.9", description: "Chest pain, unspecified" },
  { code: "R10.9", description: "Unspecified abdominal pain" },
  { code: "R11.0", description: "Nausea" },
  { code: "R11.2", description: "Nausea with vomiting, unspecified" },
  { code: "R42", description: "Dizziness and giddiness" },
  { code: "R50.9", description: "Fever, unspecified" },
  { code: "R51.9", description: "Headache, unspecified" },
  { code: "R55", description: "Syncope and collapse" },
  { code: "S06.0X0A", description: "Concussion without loss of consciousness, initial encounter" },
  { code: "S42.001A", description: "Fracture of unspecified part of right clavicle, initial encounter" },
  { code: "S52.501A", description: "Unspecified fracture of the lower end of right radius, initial" },
  { code: "S72.001A", description: "Fracture of unspecified part of neck of right femur, initial" },
  { code: "S82.001A", description: "Unspecified fracture of right patella, initial encounter" },
  { code: "T14.90", description: "Injury, unspecified" },
  { code: "T78.40XA", description: "Allergy, unspecified, initial encounter" },
];

const STAGE_LABELS = {
  waiting_triage: 'Waiting for Triage',
  waiting_registration: 'For Registration',
  waiting_doctor: 'Waiting to be seen by Doctor',
  waiting_admission: 'For Admission',
  waiting_observation: 'For Observation',
  waiting_discharge: 'For Discharge',
  admission_orders: 'Admitting Orders In',
  awaiting_non_icu: 'Awaiting transfer to Non-ICU',
  awaiting_icu: 'Awaiting transfer to ICU',
  discharge_documents: 'Discharge Documents In',
  awaiting_departure: 'Awaiting Departure from ED'
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export function DashboardInterface({ patients, getTotalTime, getStageTime }) {
  const now = new Date();
  const initialIsDay = now.getHours() >= 8 && now.getHours() < 20;
  const initialStart = initialIsDay ? '07:00' : '19:00';
  const initialEnd = initialIsDay ? '15:00' : '07:00';

  const [shiftStart, setShiftStart] = useState(initialStart); // 'HH:MM'
  const [shiftEnd, setShiftEnd] = useState(initialEnd); // 'HH:MM'
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [tempStart, setTempStart] = useState(shiftStart);
  const [tempEnd, setTempEnd] = useState(shiftEnd);
  // Filters - Date and Time Ranges
  const [fromDate, setFromDate] = useState(null); // 'YYYY-MM-DD'
  const [toDate, setToDate] = useState(null); // 'YYYY-MM-DD'
  const [fromTime, setFromTime] = useState(null); // 'HH:MM'
  const [toTime, setToTime] = useState(null); // 'HH:MM'
  const [isDateDialogOpen, setIsDateDialogOpen] = useState(false);
  const [isTimeDialogOpen, setIsTimeDialogOpen] = useState(false);
  const [tempFromDate, setTempFromDate] = useState('');
  const [tempToDate, setTempToDate] = useState('');
  const [tempFromTime, setTempFromTime] = useState('');
  const [tempToTime, setTempToTime] = useState('');
  
  // ICD-10 search states
  const [icdSearchTerm, setIcdSearchTerm] = useState("");
  const [showIcdDropdown, setShowIcdDropdown] = useState(false);

  const formatShiftCode = (s, e) => `${s.replace(':', '')}H-${e.replace(':', '')}H`;
  const shiftTime = formatShiftCode(shiftStart, shiftEnd);

  const isDayShift = (() => {
    const sHour = parseInt(shiftStart.slice(0, 2), 10);
    return sHour >= 7 && sHour < 19;
  })();

  const isNowInShift = (s, e, nowDate) => {
    const [sH, sM] = s.split(':').map(Number);
    const [eH, eM] = e.split(':').map(Number);
    const startMinutes = sH * 60 + sM;
    const endMinutes = eH * 60 + eM;
    const nowMinutes = nowDate.getHours() * 60 + nowDate.getMinutes();

    if (startMinutes <= endMinutes) {
      return nowMinutes >= startMinutes && nowMinutes < endMinutes;
    }
    // overnight shift
    return nowMinutes >= startMinutes || nowMinutes < endMinutes;
  };

  // Filter ICD codes based on search term
  const filteredIcdCodes = ICD_10_CODES.filter((icd) => {
    const searchLower = icdSearchTerm.toLowerCase();
    return (
      icd.code.toLowerCase().includes(searchLower) ||
      icd.description.toLowerCase().includes(searchLower)
    );
  });

  const analytics = useMemo(() => {
    // Apply optional filters (date/time) before computing analytics
    const basePatients = patients.filter(p => {
      if (fromDate) {
        const pDate = p.arrivalTime.toISOString().slice(0, 10);
        if (pDate < fromDate) return false;
      }
      if (toDate) {
        const pDate = p.arrivalTime.toISOString().slice(0, 10);
        if (pDate > toDate) return false;
      }
      if (fromTime) {
        const [fH, fM] = fromTime.split(':').map(Number);
        const pH = p.arrivalTime.getHours();
        const pM = p.arrivalTime.getMinutes();
        if (pH < fH || (pH === fH && pM < fM)) return false;
      }
      if (toTime) {
        const [fH, fM] = toTime.split(':').map(Number);
        const pH = p.arrivalTime.getHours();
        const pM = p.arrivalTime.getMinutes();
        if (pH > fH || (pH === fH && pM > fM)) return false;
      }
      return true;
    });

    const activePatients = basePatients.filter(p => p.isActive && p.currentStage !== 'departed');
    const completedPatients = basePatients.filter(p => !p.isActive || p.currentStage === 'departed');

    // Current shift patients
    const computeShiftStartDate = (start, nowDate) => {
      const [sH, sM] = start.split(":").map(Number);
      const sd = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate(), sH, sM, 0);
      if (sd > nowDate) sd.setDate(sd.getDate() - 1);
      return sd;
    };

    const shiftStartDate = computeShiftStartDate(shiftStart, now);
    const currentShiftPatients = patients.filter(p => p.arrivalTime >= shiftStartDate);

    // Stage counts
    const stageCounts = Object.keys(STAGE_LABELS).map(stage => ({
      stage: STAGE_LABELS[stage],
      count: activePatients.filter(p => p.currentStage === stage).length
    }));

    // Average times
    const avgTotalTime = completedPatients.length > 0
      ? Math.round(completedPatients.reduce((sum, p) => sum + getTotalTime(p), 0) / completedPatients.length)
      : 0;

    // Hourly distribution
    const hourlyData = Array.from({ length: 24 }, (_, hour) => {
      const hourPatients = basePatients.filter(p => p.arrivalTime.getHours() === hour);
      return {
        hour: `${hour.toString().padStart(2, '0')}:00`,
        patients: hourPatients.length,
        avgWaitTime: hourPatients.length > 0
          ? Math.round(hourPatients.reduce((sum, p) => sum + getTotalTime(p), 0) / hourPatients.length)
          : 0
      };
    });

    // Disposition breakdown
    const dispositions = completedPatients.reduce((acc, patient) => {
      const disp = patient.disposition || 'Unknown';
      acc[disp] = (acc[disp] || 0) + 1;
      return acc;
    }, {});

    const dispositionData = Object.entries(dispositions).map(([name, value]) => ({ name, value }));

    // Age and sex breakdown
    const demographics = completedPatients.reduce((acc, patient) => {
      const ageGroup = patient.age ?
        (patient.age < 18 ? 'Pediatric' : 'Adult') : 'Unknown';
      const sex = patient.sex || 'Unknown';
      const key = `${ageGroup} ${sex}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    // Top 10 diagnoses
    const diagnosisCount = completedPatients.reduce((acc, patient) => {
      if (patient.diagnosis) {
        const diag = patient.diagnosis.trim();
        if (diag) {
          acc[diag] = (acc[diag] || 0) + 1;
        }
      }
      return acc;
    }, {});

    const top10Diagnoses = Object.entries(diagnosisCount)
      .map(([diagnosis, count]) => ({ diagnosis, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      currentShiftTotal: currentShiftPatients.length,
      currentTotal: activePatients.length,
      stageCounts,
      avgTotalTime,
      hourlyData,
      dispositionData,
      demographics,
      totalAdmissions: completedPatients.filter(p => p.disposition?.includes('Admission')).length,
      totalDischarges: completedPatients.filter(p => p.disposition === 'Discharge').length,
      totalObservations: completedPatients.filter(p => p.disposition === 'Observation').length,
      top10Diagnoses
    };
  }, [patients, getTotalTime, shiftStart, shiftEnd, now]);

  return (

    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge className="bg-blue-100 text-blue-800 border border-blue-300 text-lg px-4 py-2">
            {(() => {
              const formatTime = (t) => {
                const [hoursStr, minutes] = t.split(":");
                const hours = parseInt(hoursStr, 10);
                const suffix = hours >= 12 ? "PM" : "AM";
                const formattedHour = hours % 12 || 12;
                return `${formattedHour}:${minutes} ${suffix}`;
              };
              return `${formatTime(shiftStart)} – ${formatTime(shiftEnd)}`;
            })()}
          </Badge>

          <Badge
            className={`text-lg px-4 py-2 ${isDayShift
                ? "bg-yellow-100 text-yellow-800 border border-yellow-300"
                : "bg-indigo-100 text-indigo-800 border border-indigo-300"
              }`}
          >
            {isDayShift ? "Day Shift" : "Night Shift"}
          </Badge>

          <div>
            <Dialog open={isDialogOpen} onOpenChange={(v) => { setIsDialogOpen(v); if (v) { setTempStart(shiftStart); setTempEnd(shiftEnd); } }}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="ml-2">
                  <Edit className="w-4 h-4 mr-2" /> Edit
                </Button>
              </DialogTrigger>

              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Shift Time</DialogTitle>
                  <DialogDescription>
                    <div>Day interval: 07:00 AM – 03:59 PM</div>
                    <div>Night interval: 04:00 PM – 06:59 AM</div>
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-2">
                  <label className="text-sm">Start</label>
                  <Input type="time" value={tempStart} onChange={(e) => setTempStart(e.target.value)} />
                  <label className="text-sm">End</label>
                  <Input type="time" value={tempEnd} onChange={(e) => setTempEnd(e.target.value)} />
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button onClick={() => { setShiftStart(tempStart || initialStart); setShiftEnd(tempEnd || initialEnd); setIsDialogOpen(false); }}>Save</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <Tabs defaultValue="realtime" className="w-full">
        <TabsList className="flex justify-between w-full space-x-3 overflow-x-auto pb-1 bg-transparent border-b pb-2">
          <TabsTrigger
            value="realtime"
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
            Real-time Data
          </TabsTrigger>

          <TabsTrigger
            value="analytics"
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
            Waiting Time Analytics
          </TabsTrigger>

          <TabsTrigger
            value="trends"
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
            Trends
          </TabsTrigger>

          <TabsTrigger
            value="census"
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
            Census
          </TabsTrigger>
          
          <TabsTrigger
            value="diagnosis"
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
            <Search className="w-4 h-4" />
            ICD-10 Codes
          </TabsTrigger>
        </TabsList>

        {/* Centered filters below the tab buttons */}
        <div className="flex items-center justify-center gap-3 mt-3">
          <Dialog open={isDateDialogOpen} onOpenChange={(v) => { 
            setIsDateDialogOpen(v); 
            if (v) { 
              setTempFromDate(fromDate || ''); 
              setTempToDate(toDate || '');
            } 
          }}> 
            <DialogTrigger asChild>
              <Button 
                variant={(fromDate || toDate) ? 'secondary' : 'outline'} 
                size="sm" 
                className="flex items-center"
              >
                <Calendar className="w-4 h-4 mr-2" />
                {fromDate || toDate ? (
                  <span>
                    {fromDate || '...'} → {toDate || '...'}
                  </span>
                ) : (
                  'Filter by Date Range'
                )}
              </Button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>Filter by Date Range</DialogTitle>
                <DialogDescription>Select date range to filter analytics (from - to).</DialogDescription>
              </DialogHeader>

              <div className="grid gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">From Date</label>
                  <Input 
                    type="date" 
                    value={tempFromDate} 
                    onChange={(e) => setTempFromDate(e.target.value)} 
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">To Date</label>
                  <Input 
                    type="date" 
                    value={tempToDate} 
                    onChange={(e) => setTempToDate(e.target.value)} 
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDateDialogOpen(false)}>Cancel</Button>
                <Button 
                  variant="destructive" 
                  onClick={() => { 
                    setFromDate(null); 
                    setToDate(null);
                    setTempFromDate(''); 
                    setTempToDate('');
                    setIsDateDialogOpen(false); 
                  }}
                >
                  Clear
                </Button>
                <Button onClick={() => { 
                  setFromDate(tempFromDate || null); 
                  setToDate(tempToDate || null);
                  setIsDateDialogOpen(false); 
                }}>
                  Apply
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isTimeDialogOpen} onOpenChange={(v) => { 
            setIsTimeDialogOpen(v); 
            if (v) { 
              setTempFromTime(fromTime || ''); 
              setTempToTime(toTime || '');
            } 
          }}>
            <DialogTrigger asChild>
              <Button 
                variant={(fromTime || toTime) ? 'secondary' : 'outline'} 
                size="sm" 
                className="flex items-center"
              >
                <Clock className="w-4 h-4 mr-2" />
                {fromTime || toTime ? (
                  <span>
                    {fromTime || '...'} → {toTime || '...'}
                  </span>
                ) : (
                  'Filter by Time Range'
                )}
              </Button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>Filter by Time Range</DialogTitle>
                <DialogDescription>Select time range (HH:MM) to filter analytics by arrival time (from - to).</DialogDescription>
              </DialogHeader>

              <div className="grid gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">From Time</label>
                  <Input 
                    type="time" 
                    value={tempFromTime} 
                    onChange={(e) => setTempFromTime(e.target.value)} 
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">To Time</label>
                  <Input 
                    type="time" 
                    value={tempToTime} 
                    onChange={(e) => setTempToTime(e.target.value)} 
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsTimeDialogOpen(false)}>Cancel</Button>
                <Button 
                  variant="destructive" 
                  onClick={() => { 
                    setFromTime(null); 
                    setToTime(null);
                    setTempFromTime(''); 
                    setTempToTime('');
                    setIsTimeDialogOpen(false); 
                  }}
                >
                  Clear
                </Button>
                <Button onClick={() => { 
                  setFromTime(tempFromTime || null); 
                  setToTime(tempToTime || null);
                  setIsTimeDialogOpen(false); 
                }}>
                  Apply
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button 
            variant="ghost" 
            size="sm" 
            className="flex items-center" 
            onClick={() => { 
              setFromDate(null); 
              setToDate(null);
              setFromTime(null); 
              setToTime(null);
              setTempFromDate(''); 
              setTempToDate('');
              setTempFromTime(''); 
              setTempToTime('');
            }}
          >
            <X className="w-4 h-4 mr-2" /> Clear All Filters
          </Button>
        </div>

        <TabsContent value="realtime" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-blue-600">{analytics.currentShiftTotal}</div>
                <div className="text-sm text-gray-600">Total Consults (Current Shift)</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-green-600">{analytics.currentTotal}</div>
                <div className="text-sm text-gray-600">Current Total Patients</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-orange-600">{analytics.avgTotalTime}m</div>
                <div className="text-sm text-gray-600">Avg Total Stay</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {analytics.stageCounts.reduce((sum, stage) => sum + stage.count, 0)}
                </div>
                <div className="text-sm text-gray-600">Patients in Queue</div>
              </CardContent>
            </Card>
          </div>

          {/* Stage Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Current Patient Distribution by Stage</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.stageCounts}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="stage"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    fontSize={12}
                  />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Hourly Patient Arrival Pattern</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics.hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="patients" stroke="#8884d8" name="Patient Count" />
                  <Line type="monotone" dataKey="avgWaitTime" stroke="#82ca9d" name="Avg Wait (min)" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Average Waiting Times by Stage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(STAGE_LABELS).map(([stage, label]) => {
                  const stagePatients = patients.filter(p =>
                    p.stageHistory.some(h => h.stage === stage)
                  );
                  const avgTime = stagePatients.length > 0
                    ? Math.round(stagePatients.reduce((sum, p) => sum + getStageTime(p, stage), 0) / stagePatients.length)
                    : 0;

                  return (
                    <div key={stage} className="flex justify-between items-center">
                      <span className="text-sm">{label}</span>
                      <Badge variant="outline">{avgTime}m</Badge>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Daily Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{patients.length}</div>
                    <div className="text-sm text-gray-600">Total Consults Today</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{analytics.avgTotalTime}m</div>
                    <div className="text-sm text-gray-600">Avg Length of Stay</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Patient Volume by Time of Day</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={analytics.hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="patients" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="census" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-2xl font-bold">{patients.length}</div>
                <div className="text-sm text-gray-600">Total Consults</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-2xl font-bold text-red-600">{analytics.totalAdmissions}</div>
                <div className="text-sm text-gray-600">Total Admissions</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-2xl font-bold text-green-600">{analytics.totalDischarges}</div>
                <div className="text-sm text-gray-600">Total Discharges</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-2xl font-bold text-blue-600">{analytics.totalObservations}</div>
                <div className="text-sm text-gray-600">Total Observations</div>
              </CardContent>
            </Card>
          </div>

          {/* Top 10 Diagnosed Diseases */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🏥 Top 10 Diagnosed Diseases
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.top10Diagnoses.length > 0 ? (
                <div className="space-y-4">
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart 
                      data={analytics.top10Diagnoses} 
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis 
                        type="category" 
                        dataKey="diagnosis" 
                        width={200}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>

                  {/* Detailed List */}
                  <div className="mt-6">
                    <h4 className="font-semibold text-gray-700 mb-3">Detailed Breakdown:</h4>
                    <div className="grid grid-cols-1 gap-3">
                      {analytics.top10Diagnoses.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-blue-50 transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <Badge 
                              className={`
                                ${index === 0 ? 'bg-yellow-500 text-white' : ''}
                                ${index === 1 ? 'bg-gray-400 text-white' : ''}
                                ${index === 2 ? 'bg-orange-600 text-white' : ''}
                                ${index > 2 ? 'bg-blue-600 text-white' : ''}
                              `}
                            >
                              #{index + 1}
                            </Badge>
                            <span className="text-sm font-medium text-gray-800 flex-1">
                              {item.diagnosis}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="text-base font-semibold">
                              {item.count} {item.count === 1 ? 'case' : 'cases'}
                            </Badge>
                            <div className="text-sm text-gray-500">
                              {((item.count / patients.length) * 100).toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-lg">No diagnosis data available</p>
                  <p className="text-gray-400 text-sm mt-2">
                    Diagnoses will appear here once doctors complete patient consultations
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Patient Disposition</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.dispositionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {analytics.dispositionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Demographics Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(analytics.demographics).map(([demographic, count]) => (
                  <div key={demographic} className="flex justify-between items-center">
                    <span className="text-sm">{demographic}</span>
                    <Badge variant="outline">{count}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="diagnosis" className="space-y-6">
          {/* ICD-10 Code Searchable Reference */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                ICD-10 Code Reference Guide
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search by ICD-10 code or description (e.g., 'R07.9' or 'chest pain')..."
                    value={icdSearchTerm}
                    onChange={(e) => {
                      setIcdSearchTerm(e.target.value);
                      setShowIcdDropdown(true);
                    }}
                    onFocus={() => setShowIcdDropdown(true)}
                    className="pl-12 text-base py-6"
                  />
                </div>

                {/* Results Display */}
                <div className="mt-4">
                  {icdSearchTerm === "" ? (
                    <div>
                      <h3 className="text-lg font-semibold mb-4 text-gray-700">
                        Common ED ICD-10 Codes ({ICD_10_CODES.length} total)
                      </h3>
                      <div className="grid grid-cols-1 gap-3 max-h-[600px] overflow-y-auto">
                        {ICD_10_CODES.map((icd, index) => (
                          <div
                            key={index}
                            className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                          >
                            <div className="flex items-start gap-4">
                              <Badge variant="outline" className="shrink-0 font-mono text-sm px-3 py-1">
                                {icd.code}
                              </Badge>
                              <p className="text-sm text-gray-700 flex-1">{icd.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : filteredIcdCodes.length > 0 ? (
                    <div>
                      <h3 className="text-lg font-semibold mb-4 text-gray-700">
                        Search Results ({filteredIcdCodes.length} found)
                      </h3>
                      <div className="grid grid-cols-1 gap-3 max-h-[600px] overflow-y-auto">
                        {filteredIcdCodes.map((icd, index) => (
                          <div
                            key={index}
                            className="p-4 border-2 border-blue-300 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors"
                          >
                            <div className="flex items-start gap-4">
                              <Badge className="shrink-0 font-mono text-sm px-3 py-1 bg-blue-600 text-white">
                                {icd.code}
                              </Badge>
                              <p className="text-sm text-gray-800 flex-1 font-medium">{icd.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-gray-500 text-lg">No matching ICD-10 codes found</p>
                      <p className="text-gray-400 text-sm mt-2">Try a different search term</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-blue-700">{ICD_10_CODES.length}</div>
                <div className="text-sm text-blue-600 font-medium">Total ICD-10 Codes</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-50 to-green-100">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-green-700">
                  {ICD_10_CODES.filter(icd => icd.code.startsWith('R')).length}
                </div>
                <div className="text-sm text-green-600 font-medium">Symptom Codes (R series)</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-purple-700">
                  {ICD_10_CODES.filter(icd => icd.code.startsWith('S') || icd.code.startsWith('T')).length}
                </div>
                <div className="text-sm text-purple-600 font-medium">Injury Codes (S & T series)</div>
              </CardContent>
            </Card>
          </div>

          {/* ICD-10 Categories */}
          <Card>
            <CardHeader>
              <CardTitle>ICD-10 Code Categories in Database</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-2">📋 Symptoms & Signs (R00-R99)</h4>
                  <p className="text-sm text-blue-700">
                    Chest pain, abdominal pain, fever, headache, dizziness, nausea, vomiting
                  </p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-green-900 mb-2">🫁 Respiratory (J00-J99)</h4>
                  <p className="text-sm text-green-700">
                    Pneumonia, COPD, asthma, pharyngitis, upper respiratory infections
                  </p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <h4 className="font-semibold text-red-900 mb-2">❤️ Cardiovascular (I00-I99)</h4>
                  <p className="text-sm text-red-700">
                    MI, heart failure, hypertension, stroke, cerebral infarction
                  </p>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <h4 className="font-semibold text-orange-900 mb-2">🦴 Injury & External Causes (S00-T98)</h4>
                  <p className="text-sm text-orange-700">
                    Fractures, concussion, allergies, trauma, injuries
                  </p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <h4 className="font-semibold text-purple-900 mb-2">🍽️ Digestive (K00-K95)</h4>
                  <p className="text-sm text-purple-700">
                    GERD, gastroenteritis, gallbladder disease, colitis
                  </p>
                </div>
                <div className="p-4 bg-pink-50 rounded-lg border border-pink-200">
                  <h4 className="font-semibold text-pink-900 mb-2">🧠 Nervous System (G00-G99)</h4>
                  <p className="text-sm text-pink-700">
                    Migraine headaches, neurological conditions
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}