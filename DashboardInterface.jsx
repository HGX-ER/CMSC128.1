import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
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
  const dayShift = now.getHours() >= 8 && now.getHours() < 20;
  const currentShift = dayShift ? '0700H-1500H' : '0700H-1500H';

  const analytics = useMemo(() => {
    const activePatients = patients.filter(p => p.isActive && p.currentStage !== 'departed');
    const completedPatients = patients.filter(p => !p.isActive || p.currentStage === 'departed');

    // Current shift patients
    const shiftStart = dayShift 
      ? new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0, 0)
      : new Date(now.getFullYear(), now.getMonth(), now.getDate() - (now.getHours() < 8 ? 1 : 0), 20, 0, 0);
    
    const currentShiftPatients = patients.filter(p => p.arrivalTime >= shiftStart);

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
      const hourPatients = patients.filter(p => p.arrivalTime.getHours() === hour);
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
  }, [patients, getTotalTime, dayShift, now]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-lg px-4 py-2">
          Current Shift: {currentShift}
        </Badge>

        <div className="flex items-center gap-3">
          <Badge className="bg-blue-100 text-blue-800 border border-blue-300 text-lg px-4 py-2">
            {(() => {
              const [start, end] = currentShift.split("-");
              const formatTime = (t) => {
                const hours = parseInt(t.slice(0, 2), 10);
                const minutes = t.slice(2, 4);
                const suffix = hours >= 12 ? "PM" : "AM";
                const formattedHour = hours % 12 || 12;
                return `${formattedHour}:${minutes} ${suffix}`;
              };
              return `${formatTime(start)} – ${formatTime(end)}`;
            })()}
          </Badge>

          <Badge
            className={`text-lg px-4 py-2 ${
              currentShift === "0700H-1500H"
                ? "bg-yellow-100 text-yellow-800 border border-yellow-300"
                : "bg-indigo-100 text-indigo-800 border border-indigo-300"
            }`}
          >
            {currentShift === "0700H-1500H" ? "Day Shift" : "Night Shift"}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="realtime" className="w-full">
        <TabsList className="flex w-full justify-between rounded-lg p-1 bg-gray-100">
          <TabsTrigger value="realtime" >Real-time Data</TabsTrigger>
          <TabsTrigger value="analytics">Waiting Time Analytics</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="census">Census</TabsTrigger>
        </TabsList>

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