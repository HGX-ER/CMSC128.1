import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Brain, CheckCircle, XCircle, RotateCcw, Trophy, Lightbulb } from 'lucide-react';

const triviaQuestions = [
  {
    id: '1',
    question: 'What is the normal resting heart rate for adults?',
    options: ['40-60 beats per minute', '60-100 beats per minute', '100-120 beats per minute', '120-140 beats per minute'],
    correctAnswer: 1,
    explanation: 'A normal resting heart rate for adults ranges from 60 to 100 beats per minute. Athletes may have lower rates.',
    difficulty: 'easy',
    category: 'Vital Signs'
  },
  {
    id: '2',
    question: 'Which organ produces insulin in the human body?',
    options: ['Liver', 'Kidney', 'Pancreas', 'Stomach'],
    correctAnswer: 2,
    explanation: 'The pancreas produces insulin, which helps regulate blood sugar levels in the body.',
    difficulty: 'easy',
    category: 'Anatomy'
  },
  {
    id: '3',
    question: 'What does CPR stand for?',
    options: ['Cardiac Pressure Relief', 'Cardiopulmonary Resuscitation', 'Chest Pressure Routine', 'Cardiovascular Pulse Recovery'],
    correctAnswer: 1,
    explanation: 'CPR stands for Cardiopulmonary Resuscitation, an emergency procedure to help someone whose heart has stopped.',
    difficulty: 'easy',
    category: 'Emergency Care'
  },
  {
    id: '4',
    question: 'How many chambers does a human heart have?',
    options: ['Two', 'Three', 'Four', 'Five'],
    correctAnswer: 2,
    explanation: 'The human heart has four chambers: two atria (upper chambers) and two ventricles (lower chambers).',
    difficulty: 'easy',
    category: 'Anatomy'
  },
  {
    id: '5',
    question: 'What is the largest organ in the human body?',
    options: ['Liver', 'Brain', 'Lungs', 'Skin'],
    correctAnswer: 3,
    explanation: 'The skin is the largest organ in the human body, covering about 20 square feet in adults.',
    difficulty: 'medium',
    category: 'Anatomy'
  },
  {
    id: '6',
    question: 'What does the abbreviation "EKG" stand for?',
    options: ['Emergency Kidney Gauge', 'Electrocardiogram', 'Emergency Kit Guidelines', 'Elevated Kidney Growth'],
    correctAnswer: 1,
    explanation: 'EKG (or ECG) stands for Electrocardiogram, a test that measures electrical activity of the heart.',
    difficulty: 'medium',
    category: 'Medical Tests'
  },
  {
    id: '7',
    question: 'Which blood type is known as the universal donor?',
    options: ['Type A', 'Type B', 'Type AB', 'Type O'],
    correctAnswer: 3,
    explanation: 'Type O negative blood is considered the universal donor because it can be given to patients of any blood type.',
    difficulty: 'medium',
    category: 'Blood'
  },
  {
    id: '8',
    question: 'What is the medical term for high blood pressure?',
    options: ['Hypotension', 'Hypertension', 'Tachycardia', 'Bradycardia'],
    correctAnswer: 1,
    explanation: 'Hypertension is the medical term for high blood pressure, while hypotension refers to low blood pressure.',
    difficulty: 'hard',
    category: 'Conditions'
  }
];

export function MedicalTrivia() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);

  const question = triviaQuestions[currentQuestion];

  const handleAnswerSelect = (answerIndex) => {
    if (showResult) return;
    
    setSelectedAnswer(answerIndex);
    setShowResult(true);
    setQuestionsAnswered(prev => prev + 1);
    
    if (answerIndex === question.correctAnswer) {
      setScore(prev => prev + 1);
    }
  };

  const nextQuestion = () => {
    if (currentQuestion < triviaQuestions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      // Game completed
      setGameStarted(false);
    }
  };

  const resetGame = () => {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setQuestionsAnswered(0);
    setGameStarted(true);
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getScoreMessage = () => {
    const percentage = (score / questionsAnswered) * 100;
    if (percentage >= 80) return 'Excellent! You know your medical facts!';
    if (percentage >= 60) return 'Great job! You have good medical knowledge.';
    if (percentage >= 40) return 'Not bad! Keep learning.';
    return 'Good effort! Medical knowledge takes time to build.';
  };

  if (!gameStarted) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            Medical Knowledge Trivia
          </CardTitle>
        </CardHeader>
        <CardContent>
          {questionsAnswered > 0 ? (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Trophy className="w-8 h-8 text-yellow-500" />
                <h3 className="text-xl font-semibold">Game Complete!</h3>
              </div>
              
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-2xl font-bold text-blue-800 mb-2">
                  {score} / {questionsAnswered}
                </div>
                <div className="text-blue-700 font-medium">
                  {getScoreMessage()}
                </div>
              </div>
              
              <Button onClick={resetGame} className="w-full">
                <RotateCcw className="w-4 h-4 mr-2" />
                Play Again
              </Button>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Lightbulb className="w-8 h-8 text-yellow-500" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Test Your Medical Knowledge!</h3>
                <p className="text-gray-600 text-sm">
                  Learn interesting medical facts while you wait. Answer questions about health, 
                  anatomy, and medical procedures.
                </p>
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="p-2 bg-green-50 rounded text-center">
                  <div className="font-semibold text-green-800">Easy</div>
                  <div className="text-green-600">Basic facts</div>
                </div>
                <div className="p-2 bg-yellow-50 rounded text-center">
                  <div className="font-semibold text-yellow-800">Medium</div>
                  <div className="text-yellow-600">Medical terms</div>
                </div>
                <div className="p-2 bg-red-50 rounded text-center">
                  <div className="font-semibold text-red-800">Hard</div>
                  <div className="text-red-600">Advanced</div>
                </div>
              </div>
              
              <Button onClick={() => setGameStarted(true)} className="w-full">
                <Brain className="w-4 h-4 mr-2" />
                Start Trivia
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            Medical Trivia
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {currentQuestion + 1} / {triviaQuestions.length}
            </Badge>
            <Badge className={getDifficultyColor(question.difficulty)}>
              {question.difficulty}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-500 mb-1">{question.category}</div>
            <h3 className="font-medium text-gray-900">{question.question}</h3>
          </div>

          <div className="space-y-2">
            {question.options.map((option, index) => (
              <Button
                key={index}
                variant={selectedAnswer === index ? 'default' : 'outline'}
                className={`w-full text-left justify-start p-4 h-auto ${
                  showResult
                    ? index === question.correctAnswer
                      ? 'bg-green-100 border-green-300 text-green-800 hover:bg-green-100'
                      : selectedAnswer === index && index !== question.correctAnswer
                      ? 'bg-red-100 border-red-300 text-red-800 hover:bg-red-100'
                      : 'opacity-50'
                    : ''
                }`}
                onClick={() => handleAnswerSelect(index)}
                disabled={showResult}
              >
                <div className="flex items-center gap-2">
                  {showResult && index === question.correctAnswer && (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  )}
                  {showResult && selectedAnswer === index && index !== question.correctAnswer && (
                    <XCircle className="w-4 h-4 text-red-600" />
                  )}
                  <span className="text-sm leading-relaxed">{option}</span>
                </div>
              </Button>
            ))}
          </div>

          {showResult && (
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Lightbulb className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">Explanation</span>
                </div>
                <p className="text-sm text-blue-700">{question.explanation}</p>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Score: {score} / {questionsAnswered}
                </div>
                <Button onClick={nextQuestion}>
                  {currentQuestion < triviaQuestions.length - 1 ? 'Next Question' : 'Finish'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}