import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from './ui/dialog';
import { Progress } from './ui/progress';
import { 
  History, 
  Clock, 
  CheckCircle, 
  Star, 
  MessageSquare,
  Timer,
  Calendar,
  ArrowRight,
  MapPin
} from 'lucide-react';

const getStageDisplayName = (stage) => {
  const displayNames = {
    kiosk: 'Check-in Area',
    waiting_triage: 'Triage Waiting Area',
    triage: 'Triage Assessment',
    waiting_registration: 'Registration Waiting Area',
    registration: 'Registration',
    waiting_doctor: 'Doctor Waiting Area',
    consultation: 'Doctor Consultation',
    waiting_admission: 'Admission Waiting',
    waiting_observation: 'Observation Waiting',
    waiting_discharge: 'Discharge Preparation',
    admission_orders: 'Admission Processing',
    awaiting_non_icu: 'Transfer to Ward',
    awaiting_icu: 'Transfer to ICU',
    discharge_documents: 'Discharge Processing',
    awaiting_departure: 'Ready for Departure',
    departed: 'Visit Completed'
  };
  return displayNames[stage] || stage;
};

const getStageColor = (stage, isCompleted) => {
  if (!isCompleted) return 'bg-blue-100 text-blue-800 border-blue-200';
  
  const colors = {
    kiosk: 'bg-green-100 text-green-800 border-green-200',
    waiting_triage: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    triage: 'bg-purple-100 text-purple-800 border-purple-200',
    waiting_registration: 'bg-orange-100 text-orange-800 border-orange-200',
    registration: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    waiting_doctor: 'bg-red-100 text-red-800 border-red-200',
    consultation: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    waiting_admission: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    waiting_observation: 'bg-teal-100 text-teal-800 border-teal-200',
    waiting_discharge: 'bg-lime-100 text-lime-800 border-lime-200',
    admission_orders: 'bg-violet-100 text-violet-800 border-violet-200',
    awaiting_non_icu: 'bg-pink-100 text-pink-800 border-pink-200',
    awaiting_icu: 'bg-rose-100 text-rose-800 border-rose-200',
    discharge_documents: 'bg-amber-100 text-amber-800 border-amber-200',
    awaiting_departure: 'bg-slate-100 text-slate-800 border-slate-200',
    departed: 'bg-green-100 text-green-800 border-green-200'
  };
  return colors[stage] || 'bg-gray-100 text-gray-800 border-gray-200';
};

const formatDuration = (startTime, endTime) => {
  const end = endTime || new Date();
  const durationMs = end.getTime() - startTime.getTime();
  const minutes = Math.floor(durationMs / 1000 / 60);
  
  if (minutes < 60) {
    return `${minutes}m`;
  } else {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }
};

const formatTime = (date) => {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const getSatisfactionDisplay = (rating) => {
  const displays = {
    1: { label: 'Very Poor', color: 'text-red-600' },
    2: { label: 'Poor', color: 'text-orange-600' },
    3: { label: 'Fair', color: 'text-yellow-600' },
    4: { label: 'Good', color: 'text-blue-600' },
    5: { label: 'Excellent', color: 'text-green-600' }
  };
  return displays[rating] || { label: 'N/A', color: 'text-gray-600' };
};

export function StageHistory({ patient }) {
  const completedStages = patient.stageHistory.filter(stage => stage.endTime);
  const currentStage = patient.stageHistory.find(stage => !stage.endTime);
  const totalCompletedTime = completedStages.reduce((total, stage) => {
    if (stage.endTime) {
      return total + (stage.endTime.getTime() - stage.startTime.getTime());
    }
    return total;
  }, 0);

  const totalStages = patient.stageHistory.length + (patient.currentStage === 'departed' ? 0 : 5); // Approximate remaining stages
  const progressPercentage = Math.round((completedStages.length / totalStages) * 100);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <History className="w-4 h-4" />
          View History
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-blue-600" />
            Visit History - {patient.name || 'Patient'}
          </DialogTitle>
          <DialogDescription>
            View your complete visit timeline and feedback history.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium">Total Time</span>
                </div>
                <div className="text-2xl font-bold text-blue-800">
                  {formatDuration(patient.arrivalTime)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium">Stages Completed</span>
                </div>
                <div className="text-2xl font-bold text-green-800">
                  {completedStages.length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Progress Overview */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Visit Progress</span>
                <span className="text-sm text-gray-600">{progressPercentage}% Complete</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </CardContent>
          </Card>

          {/* Stage Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Stage Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {patient.stageHistory.map((stage, index) => {
                const isCompleted = !!stage.endTime;
                const isLast = index === patient.stageHistory.length - 1;
                const satisfaction = stage.satisfaction;

                return (
                  <div key={index} className="relative">
                    {/* Timeline line */}
                    {!isLast && (
                      <div className="absolute left-6 top-12 w-0.5 h-16 bg-gray-200"></div>
                    )}
                    
                    <div className="flex gap-4">
                      {/* Status icon */}
                      <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                        isCompleted ? 'bg-green-100' : 'bg-blue-100'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle className="w-6 h-6 text-green-600" />
                        ) : (
                          <Timer className="w-6 h-6 text-blue-600" />
                        )}
                      </div>

                      {/* Stage details */}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium">{getStageDisplayName(stage.stage)}</h3>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Calendar className="w-3 h-3" />
                              <span>{formatTime(stage.startTime)}</span>
                              {stage.endTime && (
                                <>
                                  <ArrowRight className="w-3 h-3" />
                                  <span>{formatTime(stage.endTime)}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge className={getStageColor(stage.stage, isCompleted)}>
                              <Clock className="w-3 h-3 mr-1" />
                              {formatDuration(stage.startTime, stage.endTime)}
                            </Badge>
                          </div>
                        </div>

                        {/* Satisfaction feedback */}
                        {satisfaction && (
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <MessageSquare className="w-4 h-4 text-gray-600" />
                              <span className="text-sm font-medium text-gray-700">Patient Feedback</span>
                            </div>
                            <div className="flex items-center gap-3 mb-2">
                              <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`w-4 h-4 ${
                                      star <= satisfaction.rating
                                        ? 'text-yellow-500 fill-current'
                                        : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className={`text-sm font-medium ${getSatisfactionDisplay(satisfaction.rating).color}`}>
                                {getSatisfactionDisplay(satisfaction.rating).label}
                              </span>
                            </div>
                            {satisfaction.comment && (
                              <p className="text-sm text-gray-600 italic">
                                "{satisfaction.comment}"
                              </p>
                            )}
                          </div>
                        )}

                        {/* Current stage indicator */}
                        {!isCompleted && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                              <span className="text-sm font-medium text-blue-800">Currently in progress</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Satisfaction Summary */}
          {completedStages.some(stage => stage.satisfaction) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500" />
                  Feedback Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {completedStages
                    .filter(stage => stage.satisfaction)
                    .map((stage, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg">
                        <div className="font-medium text-sm mb-1">
                          {getStageDisplayName(stage.stage)}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-3 h-3 ${
                                  star <= (stage.satisfaction?.rating || 0)
                                    ? 'text-yellow-500 fill-current'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          <span className={`text-xs ${
                            getSatisfactionDisplay(stage.satisfaction?.rating || 1).color
                          }`}>
                            {getSatisfactionDisplay(stage.satisfaction?.rating || 1).label}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}