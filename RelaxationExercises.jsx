import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Play, Pause, RotateCcw, Wind, Heart, Brain, Waves } from 'lucide-react';

const exercises = [
  {
    id: '1',
    name: '4-7-8 Breathing',
    description: 'A calming breathing technique that helps reduce anxiety and promotes relaxation.',
    duration: 240, // 4 minutes
    instructions: [
      'Sit comfortably with your back straight',
      'Exhale completely through your mouth',
      'Inhale through your nose for 4 counts',
      'Hold your breath for 7 counts',
      'Exhale through your mouth for 8 counts',
      'Repeat this cycle 4 times'
    ],
    type: 'Breathing',
    difficulty: 'Beginner'
  },
  {
    id: '2',
    name: 'Progressive Muscle Relaxation',
    description: 'Systematically tense and relax different muscle groups to reduce physical tension.',
    duration: 600, // 10 minutes
    instructions: [
      'Sit or lie down comfortably',
      'Start with your toes - tense for 5 seconds, then relax',
      'Move to your calves, then thighs',
      'Continue with abdomen, hands, arms, shoulders',
      'Finish with facial muscles',
      'Notice the difference between tension and relaxation'
    ],
    type: 'Muscle',
    difficulty: 'Intermediate'
  },
  {
    id: '3',
    name: 'Box Breathing',
    description: 'A simple technique used by athletes and military personnel to stay calm under pressure.',
    duration: 180, // 3 minutes
    instructions: [
      'Sit upright in a comfortable position',
      'Inhale slowly for 4 counts',
      'Hold your breath for 4 counts',
      'Exhale slowly for 4 counts',
      'Hold empty for 4 counts',
      'Repeat for several cycles'
    ],
    type: 'Breathing',
    difficulty: 'Beginner'
  },
  {
    id: '4',
    name: '5-4-3-2-1 Grounding',
    description: 'A mindfulness technique that uses your senses to anchor you in the present moment.',
    duration: 300, // 5 minutes
    instructions: [
      'Notice 5 things you can see around you',
      'Notice 4 things you can touch',
      'Notice 3 things you can hear',
      'Notice 2 things you can smell',
      'Notice 1 thing you can taste',
      'Take deep, slow breaths throughout'
    ],
    type: 'Mindfulness',
    difficulty: 'Beginner'
  },
  {
    id: '5',
    name: 'Body Scan Meditation',
    description: 'A mindfulness practice that promotes awareness of physical sensations and relaxation.',
    duration: 480, // 8 minutes
    instructions: [
      'Lie down or sit comfortably',
      'Close your eyes and breathe naturally',
      'Start at the top of your head',
      'Slowly scan down through your body',
      'Notice any sensations without judgment',
      'End at your toes, feeling completely relaxed'
    ],
    type: 'Mindfulness',
    difficulty: 'Intermediate'
  }
];

export function RelaxationExercises() {
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!isRunning || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          setIsRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isRunning, timeRemaining]);

  const startExercise = (exercise) => {
    setSelectedExercise(exercise);
    setTimeRemaining(exercise.duration);
    setCurrentStep(0);
    setIsRunning(true);
  };

  const togglePause = () => {
    setIsRunning(!isRunning);
  };

  const resetExercise = () => {
    if (selectedExercise) {
      setTimeRemaining(selectedExercise.duration);
      setCurrentStep(0);
      setIsRunning(false);
    }
  };

  const stopExercise = () => {
    setSelectedExercise(null);
    setIsRunning(false);
    setTimeRemaining(0);
    setCurrentStep(0);
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'Breathing': return Wind;
      case 'Muscle': return Heart;
      case 'Mindfulness': return Brain;
      default: return Waves;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'Breathing': return 'bg-blue-100 text-blue-800';
      case 'Muscle': return 'bg-green-100 text-green-800';
      case 'Mindfulness': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Beginner': return 'bg-green-100 text-green-800';
      case 'Intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'Advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgress = () => {
    if (!selectedExercise) return 0;
    return ((selectedExercise.duration - timeRemaining) / selectedExercise.duration) * 100;
  };

  if (selectedExercise) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Waves className="w-5 h-5 text-blue-600" />
              {selectedExercise.name}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={stopExercise}>
              ✕
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="text-4xl font-bold text-blue-800">
                {formatTime(timeRemaining)}
              </div>
              
              <Progress value={getProgress()} className="h-2" />
              
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={togglePause}
                  className="flex items-center gap-2"
                >
                  {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {isRunning ? 'Pause' : 'Resume'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetExercise}
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </Button>
              </div>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-medium text-blue-800 mb-3">Instructions:</h3>
              <div className="space-y-2">
                {selectedExercise.instructions.map((instruction, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-xs font-medium text-blue-800 mt-0.5 flex-shrink-0">
                      {index + 1}
                    </div>
                    <p className="text-sm text-blue-700 leading-relaxed">{instruction}</p>
                  </div>
                ))}
              </div>
            </div>

            {timeRemaining === 0 && (
              <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-medium text-green-800 mb-2">Exercise Complete!</h3>
                <p className="text-sm text-green-700">
                  Great job! Take a moment to notice how you feel. Regular practice helps build resilience and calm.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Waves className="w-5 h-5 text-blue-600" />
          Relaxation Exercises
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-gray-600 mb-4">
            Take a moment to relax and reduce stress with these guided exercises. Perfect for waiting periods.
          </p>

          {exercises.map((exercise) => {
            const TypeIcon = getTypeIcon(exercise.type);
            return (
              <div
                key={exercise.id}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <TypeIcon className="w-5 h-5 text-gray-600" />
                    <h3 className="font-medium text-gray-900">{exercise.name}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getTypeColor(exercise.type)}>
                      {exercise.type}
                    </Badge>
                    <Badge className={getDifficultyColor(exercise.difficulty)}>
                      {exercise.difficulty}
                    </Badge>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mb-3">{exercise.description}</p>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    Duration: {Math.floor(exercise.duration / 60)} minutes
                  </span>
                  <Button
                    size="sm"
                    onClick={() => startExercise(exercise)}
                    className="flex items-center gap-2"
                  >
                    <Play className="w-3 h-3" />
                    Start
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}