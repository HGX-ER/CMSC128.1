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
import { Edit, Calendar, Clock, X } from "lucide-react@0.487.0";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

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
  // Filters
  const [filterDate, setFilterDate] = useState(null); // 'YYYY-MM-DD'
  const [filterTime, setFilterTime] = useState(null); // 'HH:MM'
  const [isDateDialogOpen, setIsDateDialogOpen] = useState(false);
  const [isTimeDialogOpen, setIsTimeDialogOpen] = useState(false);
  const [tempFilterDate, setTempFilterDate] = useState('');
  const [tempFilterTime, setTempFilterTime] = useState('');

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

  const analytics = useMemo(() => {
    // Apply optional filters (date/time) before computing analytics
    const basePatients = patients.filter(p => {
      if (filterDate) {
        const pDate = p.arrivalTime.toISOString().slice(0, 10);
        if (pDate !== filterDate) return false;
      }
      if (filterTime) {
        const [fH, fM] = filterTime.split(':').map(Number);
        const pH = p.arrivalTime.getHours();
        const pM = p.arrivalTime.getMinutes();
        if (pH !== fH || pM !== fM) return false;
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
      totalObservations: completedPatients.filter(p => p.disposition === 'Observation').length
    };
  }, [patients, getTotalTime, shiftStart, shiftEnd, now]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-lg px-4 py-2">
          Current Shift: {shiftTime}
        </Badge>

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
        </TabsList>

        {/* Centered filters below the tab buttons */}
        <div className="flex items-center justify-center gap-3 mt-3">
          <Dialog open={isDateDialogOpen} onOpenChange={(v) => { setIsDateDialogOpen(v); if (v) setTempFilterDate(filterDate || ''); }}>
            <DialogTrigger asChild>
              <Button variant={filterDate ? 'secondary' : 'outline'} size="sm" className="flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                {filterDate ? `Date: ${filterDate}` : 'Filter by Date'}
              </Button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>Filter by Date</DialogTitle>
                <DialogDescription>Select a specific date to filter analytics.</DialogDescription>
              </DialogHeader>

              <div className="grid gap-2">
                <Input type="date" value={tempFilterDate} onChange={(e) => setTempFilterDate(e.target.value)} />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDateDialogOpen(false)}>Cancel</Button>
                <Button variant="destructive" onClick={() => { setFilterDate(null); setTempFilterDate(''); setIsDateDialogOpen(false); }}>Clear</Button>
                <Button onClick={() => { setFilterDate(tempFilterDate || null); setIsDateDialogOpen(false); }}>Apply</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isTimeDialogOpen} onOpenChange={(v) => { setIsTimeDialogOpen(v); if (v) setTempFilterTime(filterTime || ''); }}>
            <DialogTrigger asChild>
              <Button variant={filterTime ? 'secondary' : 'outline'} size="sm" className="flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                {filterTime ? `Time: ${filterTime}` : 'Filter by Time'}
              </Button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>Filter by Time</DialogTitle>
                <DialogDescription>Select a specific time (HH:MM) to filter analytics by arrival time.</DialogDescription>
              </DialogHeader>

              <div className="grid gap-2">
                <Input type="time" value={tempFilterTime} onChange={(e) => setTempFilterTime(e.target.value)} />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsTimeDialogOpen(false)}>Cancel</Button>
                <Button variant="destructive" onClick={() => { setFilterTime(null); setTempFilterTime(''); setIsTimeDialogOpen(false); }}>Clear</Button>
                <Button onClick={() => { setFilterTime(tempFilterTime || null); setIsTimeDialogOpen(false); }}>Apply</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button variant="ghost" size="sm" className="flex items-center" onClick={() => { setFilterDate(null); setFilterTime(null); setTempFilterDate(''); setTempFilterTime(''); }}>
            <X className="w-4 h-4 mr-2" /> Clear Filters
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
      </Tabs>
    </div>
  );
}