// frontend/src/components/DashboardInterface.jsx

import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Button } from "./ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
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
import { Edit, Calendar, Clock, X, Search } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";

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

// Split stored diagnosis into doctor's note and ICD-10 list
const splitDiagnosis = (full) => {
  if (!full) return { note: "", icd: "" };

  const marker = "ICD-10 Codes:";
  const idx = full.indexOf(marker);

  if (idx === -1) {
    // No marker → whole thing is the free-text diagnosis
    return { note: full.trim(), icd: "" };
  }

  const note = full.slice(0, idx).trim();
  const icd = full.slice(idx + marker.length).trim();

  return { note, icd };
};


export function DashboardInterface({ patients, getTotalTime, getStageTime }) {
  const now = new Date();
  const initialIsDay = now.getHours() >= 8 && now.getHours() < 20;
  const initialStart = initialIsDay ? '07:00' : '19:00';
  const initialEnd = initialIsDay ? '15:00' : '07:00';

  const [shiftStart, setShiftStart] = useState(initialStart); // "HH:MM"
  const [shiftEnd, setShiftEnd] = useState(initialEnd); // "HH:MM"
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [tempStart, setTempStart] = useState(shiftStart);
  const [tempEnd, setTempEnd] = useState(shiftEnd);

  // Filters - Date and Time Ranges
  const [fromDate, setFromDate] = useState(null); // YYYY-MM-DD
  const [toDate, setToDate] = useState(null); // YYYY-MM-DD
  const [fromTime, setFromTime] = useState(null); // HH:MM
  const [toTime, setToTime] = useState(null); // HH:MM
  const [isDateDialogOpen, setIsDateDialogOpen] = useState(false);
  const [isTimeDialogOpen, setIsTimeDialogOpen] = useState(false);
  const [tempFromDate, setTempFromDate] = useState('');
  const [tempToDate, setTempToDate] = useState('');
  const [tempFromTime, setTempFromTime] = useState('');
  const [tempToTime, setTempToTime] = useState('');

  // ICD-10 states
  const [icdSearchTerm, setIcdSearchTerm] = useState('');
  const [showIcdDropdown, setShowIcdDropdown] = useState(false);
  const [icd10Codes, setIcd10Codes] = useState([]);
  const [icd10SearchResults, setIcd10SearchResults] = useState([]);
  const [isLoadingIcd10, setIsLoadingIcd10] = useState(false);

  const formatShiftCode = (s, e) => `${s.replace(':', '')}H-${e.replace(':', '')}H`;
  const shiftTime = formatShiftCode(shiftStart, shiftEnd);

  const isDayShift = () => {
    const sHour = parseInt(shiftStart.slice(0, 2), 10);
    return sHour >= 7 && sHour < 19;
  };

  const isNowInShift = (s, e, nowDate) => {
    const [sH, sM] = s.split(':').map(Number);
    const [eH, eM] = e.split(':').map(Number);
    const startMinutes = sH * 60 + sM;
    const endMinutes = eH * 60 + eM;
    const nowMinutes = nowDate.getHours() * 60 + nowDate.getMinutes();
    if (startMinutes < endMinutes) {
      return nowMinutes >= startMinutes && nowMinutes < endMinutes;
    }
    return nowMinutes >= startMinutes || nowMinutes < endMinutes;
  };

// Load common ICD-10 codes from hybrid API (database + online)
// Load common ICD-10 codes from hybrid API (database + online)
useEffect(() => {
  const fetchCommonCodes = async () => {
    setIsLoadingIcd10(true);
    try {
      const response = await fetch('https://node-mysql-api-zsam.onrender.com/api/icd10/common?limit=100');
      const data = await response.json();
      
      console.log('🔍 Raw API Response:', data);
      
      const dbCodes = (data.database?.codes || []).map(c => ({
        ...c,
        source: 'database'
      }));
      
      const onlineCodes = (data.online?.codes || []).map(c => ({
        ...c,
        source: 'online'
      }));
      
      console.log('📊 Database codes:', dbCodes);
      console.log('🌐 Online codes BEFORE filter:', onlineCodes);
      
      const dbCodeSet = new Set(dbCodes.map(c => c.code));
      console.log('🔑 Database code set:', Array.from(dbCodeSet));
      
      const filteredOnlineCodes = onlineCodes.filter(c => !dbCodeSet.has(c.code));
      console.log('🌐 Online codes AFTER filter:', filteredOnlineCodes);
      
      const allCodes = [...dbCodes, ...filteredOnlineCodes];
      
      console.log(' Final processed codes:', {
        database: dbCodes.length,
        online: filteredOnlineCodes.length,
        total: allCodes.length,
        allCodes: allCodes
      });
      
      setIcd10Codes(allCodes);
    } catch (error) {
      console.error('Failed to load ICD-10 codes:', error);
      setIcd10Codes([]);
    } finally {
      setIsLoadingIcd10(false);
    }
  };
  
  fetchCommonCodes();
}, []);


  // Search ICD-10 codes from API with debounce
  useEffect(() => {
    if (!icdSearchTerm || icdSearchTerm.length < 2) {
      setIcd10SearchResults([]);
      return;
    }

    const searchTimeout = setTimeout(async () => {
      setIsLoadingIcd10(true);
      try {
        const response = await fetch(`https://node-mysql-api-zsam.onrender.com/api/icd10/search?q=${encodeURIComponent(icdSearchTerm)}`);
        const data = await response.json();
        setIcd10SearchResults(data.map(item => ({
          code: item.code,
          description: item.shortDesc || item.longDesc
        })));
      } catch (error) {
        console.error('ICD-10 search failed:', error);
        setIcd10SearchResults([]);
      } finally {
        setIsLoadingIcd10(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [icdSearchTerm]);

  const displayedCodes = icdSearchTerm.length >= 2 ? icd10SearchResults : icd10Codes;

const analytics = useMemo(() => {
    const getGeneration = (birthYear) => {
  if (!birthYear || Number.isNaN(birthYear)) return "Unknown";

  if (birthYear >= 2013) return "Gen Alpha";       // optional
  if (birthYear >= 1997) return "Gen Z";          // 1997–2012 [web:38][web:39][web:40]
  if (birthYear >= 1981) return "Millennial";     // 1981–1996 [web:43][web:46]
  if (birthYear >= 1965) return "Gen X";          // 1965–1980 [web:44][web:53]
  if (birthYear >= 1946) return "Baby Boomer";    // 1946–1964 [web:47][web:55]
  return "Silent+";
};


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

    const activePatients = basePatients.filter(
      p => p.isActive && p.currentStage !== 'departed'
    );
    const completedPatients = basePatients.filter(
      p => !p.isActive || p.currentStage === 'departed'
    );

    const computeShiftStartDate = (start, nowDate) => {
      const [sH, sM] = start.split(':').map(Number);
      const sd = new Date(
        nowDate.getFullYear(),
        nowDate.getMonth(),
        nowDate.getDate(),
        sH,
        sM,
        0
      );
      if (sd > nowDate) sd.setDate(sd.getDate() - 1);
      return sd;
    };

    const shiftStartDate = computeShiftStartDate(shiftStart, now);
    const currentShiftPatients = patients.filter(
      p => p.arrivalTime >= shiftStartDate
    );

    const stageCounts = Object.keys(STAGE_LABELS).map(stage => ({
      stage: STAGE_LABELS[stage],
      count: activePatients.filter(p => p.currentStage === stage).length,
    }));

    const avgTotalTime =
      completedPatients.length > 0
        ? Math.round(
            completedPatients.reduce(
              (sum, p) => sum + getTotalTime(p),
              0
            ) / completedPatients.length
          )
        : 0;

    const hourlyData = Array.from({ length: 24 }, (_, hour) => {
      const hourPatients = basePatients.filter(
        p => p.arrivalTime.getHours() === hour
      );
      return {
        hour: hour.toString().padStart(2, '0') + ':00',
        patients: hourPatients.length,
        avgWaitTime:
          hourPatients.length > 0
            ? Math.round(
                hourPatients.reduce(
                  (sum, p) => sum + getTotalTime(p),
                  0
                ) / hourPatients.length
              )
            : 0,
      };
    });

const dispositions = completedPatients.reduce((acc, patient) => {
  const disp = patient.disposition || 'Unknown';
  acc[disp] = (acc[disp] || 0) + 1;
  return acc;
}, {});

const dispositionData = Object.entries(dispositions).map(([name, value]) => ({ name, value }));


const demographics = completedPatients.reduce((acc, patient) => {

  let age = patient.age;

  
  if ((age === undefined || age === null) && patient.dateOfBirth) {
    const dob = new Date(patient.dateOfBirth);
    if (!Number.isNaN(dob.getTime())) {
      const today = new Date();
      age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
    }
  }

  //Bucket by age group
  let ageGroup;
  if (typeof age === "number" && !Number.isNaN(age)) {
    ageGroup = age < 18 ? "Pediatric" : "Adult";
  } else {
    ageGroup = "Unknown age";
  }

  // Use sex from patients table, with fallback
  const sex = (patient.sex || "Unknown sex").trim();

  const key = `${ageGroup} • ${sex}`;
  acc[key] = (acc[key] || 0) + 1;
  return acc;
}, {});

// the population pyramid (new code)
const makeAgeBand = (age) => {
  if (typeof age !== "number" || Number.isNaN(age)) return "Unknown";
  if (age < 18) return "0–17";
  if (age < 40) return "18–39";
  if (age < 65) return "40–64";
  return "65+";
};

const generationSexCounts = completedPatients.reduce((acc, patient) => {
  // Derive birthYear from dateOfBirth or from age
  let birthYear = null;

  if (patient.dateOfBirth) {
    const dob = new Date(patient.dateOfBirth);
    if (!Number.isNaN(dob.getTime())) {
      birthYear = dob.getFullYear();
    }
  } else if (typeof patient.age === "number" && !Number.isNaN(patient.age)) {
    const thisYear = new Date().getFullYear();
    birthYear = thisYear - patient.age;
  }

  const gen = getGeneration(birthYear);
  if (!acc[gen]) acc[gen] = { male: 0, female: 0 };

  const sex = (patient.sex || "").toLowerCase();
  if (sex === "male") acc[gen].male += 1;
  else if (sex === "female") acc[gen].female += 1;
  else acc[gen].female += 1; 

  return acc;
}, {});

const ageSexPyramidData = Object.entries(generationSexCounts)
  .map(([generation, { male, female }]) => ({
    ageBand: generation,  // reuse ageBand field name for the Y axis
    male: -male,
    female,
  }))
  .sort((a, b) => {
    const order = ["Gen Alpha", "Gen Z", "Millennial", "Gen X", "Baby Boomer", "Silent+", "Unknown"];
    return order.indexOf(a.ageBand) - order.indexOf(b.ageBand);
  });

// Turn demographics object into array for charts
const demographicsData = Object.entries(demographics).map(
  ([name, value]) => ({ name, value })
);

// Sex distribution
const sexCounts = completedPatients.reduce((acc, patient) => {
  const sex = (patient.sex || "Unknown").trim();
  acc[sex] = (acc[sex] || 0) + 1;
  return acc;
}, {});
const sexData = Object.entries(sexCounts).map(([name, value]) => ({ name, value }));

// Age-group distribution from age or DOB
const ageGroupCounts = completedPatients.reduce((acc, patient) => {
  let age = patient.age;
  if ((age === undefined || age === null) && patient.dateOfBirth) {
    const dob = new Date(patient.dateOfBirth);
    if (!Number.isNaN(dob.getTime())) {
      const today = new Date();
      age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    }
  }

  let bucket = "Unknown age";
  if (typeof age === "number" && !Number.isNaN(age)) {
    if (age < 18) bucket = "0–17";
    else if (age < 40) bucket = "18–39";
    else if (age < 65) bucket = "40–64";
    else bucket = "65+";
  }

  acc[bucket] = (acc[bucket] || 0) + 1;
  return acc;
}, {});
const ageData = Object.entries(ageGroupCounts).map(([name, value]) => ({ name, value }));

// Insurance info - prepare patient records for display in table
const insurancePatientData = completedPatients.map(patient => ({
  queue_number: patient.id,
  name: patient.full_name?.trim() ? patient.full_name : (patient.name || "Unknown"),
  insurance_info: patient.insurance_info?.trim() ? patient.insurance_info.trim() : "Not provided or unknown"
}));

// City distribution from address (extracts city intelligently, case-insensitive)
const cityCounts = completedPatients.reduce((acc, patient) => {
  const raw = (patient.address || "").trim();
  let city = "Unknown city";
  if (raw) {
    let lastPart = raw;
    
    if (raw.includes(",")) {
      const parts = raw.split(",");
      lastPart = parts[parts.length - 1].trim();
    } else {
      const words = raw.split(/\s+/);
      if (words.length > 2) {
        lastPart = words.slice(-2).join(" ");
      }
    }
    
    if (lastPart) {
      const firstWord = lastPart.split(/\s+/)[0];
      city = firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase();
    }
  }
  acc[city] = (acc[city] || 0) + 1;
  return acc;
}, {});
const cityData = Object.entries(cityCounts).map(([name, value]) => ({ name, value }));

// City patient data
const cityPatientData = completedPatients.map(patient => {
  const raw = (patient.address || "").trim();
  let city = "Unknown city";
  if (raw) {
    let lastPart = raw;
    
    if (raw.includes(",")) {
      const parts = raw.split(",");
      lastPart = parts[parts.length - 1].trim();
    } else {
      const words = raw.split(/\s+/);
      if (words.length > 2) {
        lastPart = words.slice(-2).join(" ");
      }
    }
    
    if (lastPart) {
      const firstWord = lastPart.split(/\s+/)[0];
      city = firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase();
    }
  }
  return {
    queue_number: patient.id,
    name: patient.full_name?.trim() ? patient.full_name : (patient.name || "Unknown"),
    city: city,
    address: raw || "Not provided"
  };
});

// Count top ICD‑10 diagnoses 
const diagnosisCount = completedPatients.reduce((acc, patient) => {
  if (patient.diagnosis) {
    const { icd } = splitDiagnosis(patient.diagnosis);
    const diag = (icd || "").trim();

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
      demographicsData, 
      ageSexPyramidData,  
      sexData,         
      ageData,          
      insurancePatientData,    
      cityPatientData,        
       cityData,
      
      totalAdmissions: basePatients.filter(
        p => p.disposition && p.disposition.includes('Admission')
      ).length,
      totalDischarges: completedPatients.filter(
        p => p.disposition === 'Discharge'
      ).length,
      
      totalObservations: basePatients.filter(
        p => p.disposition === 'Observation'
      ).length,
      top10Diagnoses,
    };
  }, [patients, getTotalTime, shiftStart, shiftEnd, now, fromDate, toDate, fromTime, toTime]);


  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge className="bg-blue-100 text-blue-800 border border-blue-300 text-lg px-4 py-2">
            {(() => {
              const formatTime = (t) => {
                const [hoursStr, minutes] = t.split(':');
                const hours = parseInt(hoursStr, 10);
                const suffix = hours >= 12 ? 'PM' : 'AM';
                const formattedHour = hours % 12 || 12;
                return `${formattedHour}:${minutes} ${suffix}`;
              };
              return `${formatTime(shiftStart)} – ${formatTime(shiftEnd)}`;
            })()}
          </Badge>
          <Badge
            className={`text-lg px-4 py-2 ${
              isDayShift()
                ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                : 'bg-indigo-100 text-indigo-800 border border-indigo-300'
            }`}
          >
            {isDayShift() ? 'Day Shift' : 'Night Shift'}
          </Badge>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(v) => {
          setIsDialogOpen(v);
          if (v) {
            setTempStart(shiftStart);
            setTempEnd(shiftEnd);
          }
        }}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="ml-2">
              <Edit className="w-4 h-4 mr-2" />
              Edit
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
              <Button onClick={() => {
                setShiftStart(tempStart || initialStart);
                setShiftEnd(tempEnd || initialEnd);
                setIsDialogOpen(false);
              }}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="realtime" className="w-full">
        <TabsList className="flex justify-between w-full space-x-3 overflow-x-auto pb-1 bg-transparent border-b pb-2">
          <TabsTrigger value="realtime" className="flex items-center justify-center gap-2 min-w-[120px] px-6 py-3 rounded-xl text-sm sm:text-base font-medium text-blue-700 border border-blue-200 bg-white shadow-sm transition-all duration-200 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-gray-800 data-[state=active]:!bg-blue-100 dark:data-[state=active]:!bg-blue-100 data-[state=active]:!text-blue-800 dark:data-[state=active]:!text-blue-800 data-[state=active]:!border-blue-300 dark:data-[state=active]:!border-blue-300 data-[state=active]:shadow-lg data-[state=active]:scale-1.05">
            Real-time Data
          </TabsTrigger>

          <TabsTrigger value="analytics" className="flex items-center justify-center gap-2 min-w-[120px] px-6 py-3 rounded-xl text-sm sm:text-base font-medium text-blue-700 border border-blue-200 bg-white shadow-sm transition-all duration-200 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-gray-800 data-[state=active]:!bg-blue-100 dark:data-[state=active]:!bg-blue-100 data-[state=active]:!text-blue-800 dark:data-[state=active]:!text-blue-800 data-[state=active]:!border-blue-300 dark:data-[state=active]:!border-blue-300 data-[state=active]:shadow-lg data-[state=active]:scale-1.05">
            Waiting Time Analytics
          </TabsTrigger>

          <TabsTrigger value="trends" className="flex items-center justify-center gap-2 min-w-[120px] px-6 py-3 rounded-xl text-sm sm:text-base font-medium text-blue-700 border border-blue-200 bg-white shadow-sm transition-all duration-200 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-gray-800 data-[state=active]:!bg-blue-100 dark:data-[state=active]:!bg-blue-100 data-[state=active]:!text-blue-800 dark:data-[state=active]:!text-blue-800 data-[state=active]:!border-blue-300 dark:data-[state=active]:!border-blue-300 data-[state=active]:shadow-lg data-[state=active]:scale-1.05">
            Trends
          </TabsTrigger>

          <TabsTrigger value="census" className="flex items-center justify-center gap-2 min-w-[120px] px-6 py-3 rounded-xl text-sm sm:text-base font-medium text-blue-700 border border-blue-200 bg-white shadow-sm transition-all duration-200 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-gray-800 data-[state=active]:!bg-blue-100 dark:data-[state=active]:!bg-blue-100 data-[state=active]:!text-blue-800 dark:data-[state=active]:!text-blue-800 data-[state=active]:!border-blue-300 dark:data-[state=active]:!border-blue-300 data-[state=active]:shadow-lg data-[state=active]:scale-1.05">
            Census
          </TabsTrigger>

          <TabsTrigger value="diagnosis" className="flex items-center justify-center gap-2 min-w-[120px] px-6 py-3 rounded-xl text-sm sm:text-base font-medium text-blue-700 border border-blue-200 bg-white shadow-sm transition-all duration-200 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-gray-800 data-[state=active]:!bg-blue-100 dark:data-[state=active]:!bg-blue-100 data-[state=active]:!text-blue-800 dark:data-[state=active]:!text-blue-800 data-[state=active]:!border-blue-300 dark:data-[state=active]:!border-blue-300 data-[state=active]:shadow-lg data-[state=active]:scale-1.05">
            <Search className="w-4 h-4" />
            ICD-10 Codes
          </TabsTrigger>
        </TabsList>

        {/* Centered filters below the tab buttons */}
        <div className="flex items-center justify-center gap-3 mt-3">
          {/* Date Range Filter Dialog */}
          <Dialog open={isDateDialogOpen} onOpenChange={(v) => {
            setIsDateDialogOpen(v);
            if (v) {
              setTempFromDate(fromDate || '');
              setTempToDate(toDate || '');
            }
          }}>
            <DialogTrigger asChild>
              <Button variant={fromDate || toDate ? "secondary" : "outline"} size="sm" className="flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                {fromDate || toDate ? (
                  <span>{fromDate || '...'} → {toDate || '...'}</span>
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
                  <Input type="date" value={tempFromDate} onChange={(e) => setTempFromDate(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">To Date</label>
                  <Input type="date" value={tempToDate} onChange={(e) => setTempToDate(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDateDialogOpen(false)}>Cancel</Button>
                <Button variant="destructive" onClick={() => {
                  setFromDate(null);
                  setToDate(null);
                  setTempFromDate('');
                  setTempToDate('');
                  setIsDateDialogOpen(false);
                }}>Clear</Button>
                <Button onClick={() => {
                  setFromDate(tempFromDate || null);
                  setToDate(tempToDate || null);
                  setIsDateDialogOpen(false);
                }}>Apply</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Time Range Filter Dialog */}
          <Dialog open={isTimeDialogOpen} onOpenChange={(v) => {
            setIsTimeDialogOpen(v);
            if (v) {
              setTempFromTime(fromTime || '');
              setTempToTime(toTime || '');
            }
          }}>
            <DialogTrigger asChild>
              <Button variant={fromTime || toTime ? "secondary" : "outline"} size="sm" className="flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                {fromTime || toTime ? (
                  <span>{fromTime || '...'} → {toTime || '...'}</span>
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
                  <Input type="time" value={tempFromTime} onChange={(e) => setTempFromTime(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">To Time</label>
                  <Input type="time" value={tempToTime} onChange={(e) => setTempToTime(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsTimeDialogOpen(false)}>Cancel</Button>
                <Button variant="destructive" onClick={() => {
                  setFromTime(null);
                  setToTime(null);
                  setTempFromTime('');
                  setTempToTime('');
                  setIsTimeDialogOpen(false);
                }}>Clear</Button>
                <Button onClick={() => {
                  setFromTime(tempFromTime || null);
                  setToTime(tempToTime || null);
                  setIsTimeDialogOpen(false);
                }}>Apply</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Clear All Filters Button */}
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
            <X className="w-4 h-4 mr-2" />
            Clear All Filters
          </Button>
        </div>

        {/* Real-time Tab */}
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
                  <XAxis dataKey="stage" angle={-45} textAnchor="end" height={100} fontSize={12} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
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
                  const stagePatients = patients.filter(p => p.stageHistory.some(h => h.stage === stage));
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

        {/* Trends Tab */}
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

        {/* Census Tab */}
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
              <CardTitle className="flex items-center gap-2">Top 10 Diagnosed Diseases</CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.top10Diagnoses.length > 0 ? (
                <div className="space-y-4">
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={analytics.top10Diagnoses} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="diagnosis" width={200} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>

                  {/* Detailed List */}
                  <div className="mt-6">
                    <h4 className="font-semibold text-gray-700 mb-3">Detailed Breakdown</h4>
                    <div className="grid grid-cols-1 gap-3">
                      {analytics.top10Diagnoses.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-blue-50 transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <Badge
                              className={
                                index === 0
                                  ? 'bg-yellow-500 text-white'
                                  : index === 1
                                  ? 'bg-gray-400 text-white'
                                  : index === 2
                                  ? 'bg-orange-600 text-white'
                                  : index <= 2
                                  ? 'bg-blue-600 text-white'
                                  : ''
                              }
                            >
                              {index + 1}
                            </Badge>
                            <span className="text-sm font-medium text-gray-800 flex-1">{item.diagnosis}</span>
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

          {/* Disposition and Demographics side-by-side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
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
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.demographicsData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {analytics.demographicsData.map((entry, index) => (
                        <Cell key={`demo-cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Age–Sex Population Distribution on its own row */}
          <Card>
            <CardHeader>
              <CardTitle>Age–Sex Population Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.ageSexPyramidData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="ageBand" width={80} />
                  <Tooltip />
                  <Bar dataKey="male" name="Male" fill="#3B82F6" stackId="a" />
                  <Bar dataKey="female" name="Female" fill="#EC4899" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  <Card>
    <CardHeader>
      <CardTitle>Insurance Info</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="w-full overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Queue Number</TableHead>
              <TableHead>Patient Name</TableHead>
              <TableHead>Insurance Info & Policy Number</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {analytics.insurancePatientData && analytics.insurancePatientData.length > 0 ? (
              analytics.insurancePatientData.map((record, index) => (
                <TableRow key={index}>
                  <TableCell className="font-mono font-medium">{record.queue_number}</TableCell>
                  <TableCell>{record.name}</TableCell>
                  <TableCell>{record.insurance_info}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                  No completed patients to display
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </CardContent>
  </Card>

  <Card>
    <CardHeader>
      <CardTitle>Address</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="w-full overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Queue Number</TableHead>
              <TableHead>Patient Name</TableHead>
              <TableHead>Full Address</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {analytics.cityPatientData && analytics.cityPatientData.length > 0 ? (
              analytics.cityPatientData.map((record, index) => (
                <TableRow key={index}>
                  <TableCell className="font-mono font-medium">{record.queue_number}</TableCell>
                  <TableCell>{record.name}</TableCell>
                  <TableCell>{record.address}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                  No completed patients to display
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </CardContent>
  </Card>
</div>


        </TabsContent>

        {/* ICD-10 Codes Tab */}
        <TabsContent value="diagnosis" className="space-y-6">
          {/* ICD-10 Code Searchable Reference */}
          <Card>
<CardHeader>
  <div className="flex items-center justify-between">
    <CardTitle className="flex items-center gap-2">
      <Search className="w-5 h-5" />
      ICD-10 Code Reference Guide
    </CardTitle>
    <Button
      variant="outline"
      size="sm"
      onClick={async () => {
        setIsLoadingIcd10(true);
        try {
          const response = await fetch('https://node-mysql-api-zsam.onrender.com/api/icd10/common?limit=100&refresh=true');
          const data = await response.json();
          const dbCodes = data.database?.codes || [];
          const onlineCodes = data.online?.codes || [];
          setIcd10Codes([...dbCodes, ...onlineCodes]);
        } finally {
          setIsLoadingIcd10(false);
        }
      }}
    >
      🔄 Refresh Data
    </Button>
  </div>
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
                  {isLoadingIcd10 && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>

{/* Results Display */}
<div className="mt-4">
  {!icdSearchTerm ? (
    /* Show tabs when NOT searching */
    <Tabs defaultValue="online" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="database">
          📊 Your ED Data
        </TabsTrigger>
        <TabsTrigger value="online">
          🌐 Research-Based (National)
        </TabsTrigger>
      </TabsList>

      {/* Your ED Data Tab */}
      <TabsContent value="database" className="mt-4">
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="font-semibold text-blue-900">
            📊 Live Data from Your ED
          </span>
        </div>
        
        {isLoadingIcd10 ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500 text-lg">Loading your ED data...</p>
          </div>
        ) : icd10Codes.filter(c => c.source === 'database').length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No encounter data yet</p>
            <p className="text-gray-400 text-sm mt-2">
              Data will appear once doctors assign ICD-10 codes to patient encounters
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 max-h-[600px] overflow-y-auto">
            {icd10Codes.filter(c => c.source === 'database').map((icd, index) => (
              <div
                key={`db-${icd.code}-${index}`}
                className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  {icd.rank && (
                    <Badge className={`shrink-0 font-bold text-xs px-2 py-1 ${
                      icd.rank === 1 ? 'bg-yellow-500 text-white' :
                      icd.rank === 2 ? 'bg-gray-400 text-white' :
                      icd.rank === 3 ? 'bg-orange-600 text-white' :
                      'bg-blue-600 text-white'
                    }`}>
                      #{icd.rank}
                    </Badge>
                  )}
                  
                  <Badge variant="outline" className="shrink-0 font-mono text-sm px-3 py-1 border-blue-400">
                    {icd.code}
                  </Badge>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 font-medium mb-2">{icd.description}</p>
                    
{icd.count && (
  <div className="space-y-1">
    <div className="flex items-center justify-between text-xs">
      <span className="text-gray-600">{icd.count} encounters in your ED</span>
      <span className="font-bold text-blue-700">{icd.percentage}%</span>
    </div>
    <div style={{ width: '100%', height: '12px', backgroundColor: '#e5e7eb', borderRadius: '9999px', overflow: 'hidden' }}>
      <div 
        style={{ 
          height: '100%', 
          background: 'linear-gradient(to right, #2563eb, #3b82f6)',
          borderRadius: '9999px',
          width: `${icd.percentage}%`,
          transition: 'width 0.5s ease'
        }}
      />
    </div>
  </div>
)}

                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </TabsContent>

{/* Research-Based (National) Tab */}
<TabsContent value="online" className="mt-4">
  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
    <span className="font-semibold text-green-900">
      🌐 National ED Statistics (based on clinicaltables.nlm.nih.gov)
    </span>
  </div>
  
  <h3 className="text-lg font-semibold mb-4 text-gray-700">
    Common ED ICD-10 Codes ({icd10Codes.filter(c => c.source === 'online').length} loaded)
  </h3>
  
  {isLoadingIcd10 && icd10Codes.filter(c => c.source === 'online').length === 0 ? (
    <div className="text-center py-12">
      <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-gray-500 text-lg">Loading research codes...</p>
    </div>
  ) : icd10Codes.filter(c => c.source === 'online').length === 0 ? (
    <div className="text-center py-12">
      <p className="text-gray-500 text-lg">No research codes available</p>
    </div>
  ) : (
    <div className="grid grid-cols-1 gap-3 max-h-[600px] overflow-y-auto">
{icd10Codes.filter(c => c.source === 'online').map((icd, index) => (
  <div
    key={`${icd.code}-${index}`}
    className="p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-all duration-200 hover:shadow-md"
  >
    <div className="flex items-start gap-4">
      {icd.rank && (
        <Badge className={`shrink-0 font-bold text-xs px-2 py-1 ${
          icd.rank === 1 ? 'bg-yellow-500 text-white' :
          icd.rank === 2 ? 'bg-gray-400 text-white' :
          icd.rank === 3 ? 'bg-orange-600 text-white' :
          icd.rank <= 10 ? 'bg-green-600 text-white' :
          'bg-gray-300 text-gray-700'
        }`}>
          #{icd.rank}
        </Badge>
      )}
      
      <Badge variant="outline" className="shrink-0 font-mono text-sm px-3 py-1 border-green-400">
        {icd.code}
      </Badge>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-700 font-medium mb-2">{icd.description}</p>
        
        {/*PROGRESS BAR */}
{icd.percentage && (
  <div className="space-y-1">
    <div className="flex items-center justify-between text-xs">
      <span className="text-gray-600">National frequency</span>
      <span className="font-bold text-green-700">{icd.percentage}%</span>
    </div>
    <div style={{ width: '100%', height: '12px', backgroundColor: '#e5e7eb', borderRadius: '9999px', overflow: 'hidden' }}>
      <div 
        style={{ 
          height: '100%', 
          background: 'linear-gradient(to right, #059669, #10b981)',
          borderRadius: '9999px',
          width: `${icd.percentage}%`,
          transition: 'width 0.5s ease'
        }}
      />
    </div>
  </div>
)}

      </div>
    </div>
  </div>
))}

    </div>
  )}
</TabsContent>

    </Tabs>
  ) : (
    /* Search results when user is typing */
    displayedCodes.length === 0 ? (
      <div className="text-center py-12">
        {isLoadingIcd10 ? (
          <>
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500 text-lg">Searching...</p>
          </>
        ) : (
          <>
            <p className="text-gray-500 text-lg">No matching ICD-10 codes found</p>
            <p className="text-gray-400 text-sm mt-2">Try a different search term</p>
          </>
        )}
      </div>
    ) : (
      <div>
        <h3 className="text-lg font-semibold mb-4 text-gray-700">
          Search Results ({displayedCodes.length} found)
        </h3>
        <div className="grid grid-cols-1 gap-3 max-h-[600px] overflow-y-auto">
          {displayedCodes.map((icd, index) => (
            <div
              key={`${icd.code}-${index}`}
              className="p-4 border-2 border-blue-300 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors"
            >
              <div className="flex items-start gap-4">
                <Badge className="shrink-0 font-mono text-sm px-3 py-1 bg-blue-600 text-white">
                  {icd.code}
                </Badge>
                <div className="flex-1">
                  <p className="text-sm text-gray-800 font-medium">{icd.description}</p>
                  {icd.percentage && (
                    <p className="text-xs text-gray-600 mt-1">{icd.percentage}% of ED visits</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  )}
</div>

              </div>
            </CardContent>
          </Card>


{/* Quick Stats */}
<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
  <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
    <CardContent className="p-6 text-center">
      <div className="text-3xl font-bold text-blue-700">
        {icd10Codes.filter(c => c.source === 'online').length}
      </div>
      <div className="text-sm text-blue-600 font-medium">Common ED Codes Loaded</div>
    </CardContent>
  </Card>

  <Card className="bg-gradient-to-br from-red-50 to-red-100">
    <CardContent className="p-6 text-center">
      <div className="text-3xl font-bold text-red-700">
        {icd10Codes.filter(icd => icd.source === 'online' && icd.percentage && icd.percentage >= 3).length}
      </div>
      <div className="text-sm text-red-600 font-medium">High Frequency (≥3%)</div>
    </CardContent>
  </Card>

  <Card className="bg-gradient-to-br from-green-50 to-green-100">
    <CardContent className="p-6 text-center">
      <div className="text-3xl font-bold text-green-700">
        {icd10Codes.filter(icd => icd.source === 'online' && icd.code && icd.code.startsWith('R')).length}
      </div>
      <div className="text-sm text-green-600 font-medium">Symptom Codes (R series)</div>
    </CardContent>
  </Card>

  <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
    <CardContent className="p-6 text-center">
      <div className="text-3xl font-bold text-purple-700">
        {icd10Codes.filter(icd => icd.source === 'online' && icd.code && (icd.code.startsWith('S') || icd.code.startsWith('T'))).length}
      </div>
      <div className="text-sm text-purple-600 font-medium">Injury Codes (S/T series)</div>
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
                  <h4 className="font-semibold text-blue-900 mb-2">Symptoms & Signs (R00-R99)</h4>
                  <p className="text-sm text-blue-700">
                    Chest pain, abdominal pain, fever, headache, dizziness, nausea, vomiting
                  </p>
                </div>

                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-green-900 mb-2">Respiratory (J00-J99)</h4>
                  <p className="text-sm text-green-700">
                    Pneumonia, COPD, asthma, pharyngitis, upper respiratory infections
                  </p>
                </div>

                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <h4 className="font-semibold text-red-900 mb-2">Cardiovascular (I00-I99)</h4>
                  <p className="text-sm text-red-700">
                    MI, heart failure, hypertension, stroke, cerebral infarction
                  </p>
                </div>

                <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <h4 className="font-semibold text-orange-900 mb-2">Injury & External Causes (S00-T98)</h4>
                  <p className="text-sm text-orange-700">
                    Fractures, concussion, allergies, trauma, injuries
                  </p>
                </div>

                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <h4 className="font-semibold text-purple-900 mb-2">Digestive (K00-K95)</h4>
                  <p className="text-sm text-purple-700">
                    GERD, gastroenteritis, gallbladder disease, colitis
                  </p>
                </div>

                <div className="p-4 bg-pink-50 rounded-lg border border-pink-200">
                  <h4 className="font-semibold text-pink-900 mb-2">Nervous System (G00-G99)</h4>
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