import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Heart, ChevronLeft, ChevronRight, Star, BookOpen } from 'lucide-react';

const healthTips = [
  {
    id: '1',
    title: 'Stay Hydrated for Better Health',
    content: 'Drinking adequate water helps maintain body temperature, transport nutrients, and remove waste. Aim for 8 glasses daily, but increase intake during illness, exercise, or hot weather. Signs of good hydration include pale yellow urine and feeling energetic.',
    category: 'general',
    difficulty: 'easy',
    timeToRead: 1,
    featured: true
  },
  {
    id: '2',
    title: 'Simple Breathing Exercise for Stress',
    content: 'Try the 4-7-8 technique: Inhale for 4 counts, hold for 7, exhale for 8. This activates your parasympathetic nervous system, reducing stress and anxiety. Practice 3-4 cycles when feeling overwhelmed or before sleep.',
    category: 'mental-health',
    difficulty: 'easy',
    timeToRead: 2,
    featured: true
  },
  {
    id: '3',
    title: 'Boost Your Immune System Naturally',
    content: 'Get 7-9 hours of sleep, eat colorful fruits and vegetables, exercise regularly, manage stress, and wash hands frequently. Vitamin C from citrus fruits, zinc from nuts, and probiotics from yogurt can strengthen your immune response.',
    category: 'prevention',
    difficulty: 'moderate',
    timeToRead: 2,
    featured: false
  },
  {
    id: '4',
    title: 'Heart-Healthy Eating Made Simple',
    content: 'Focus on whole grains, lean proteins, fruits, vegetables, and healthy fats like olive oil and avocados. Limit processed foods, excess sodium, and added sugars. Small changes like choosing grilled over fried foods make a big difference.',
    category: 'nutrition',
    difficulty: 'moderate',
    timeToRead: 2,
    featured: false
  },
  {
    id: '5',
    title: 'Desk Exercises to Combat Sitting',
    content: 'Every hour, do neck rolls, shoulder shrugs, seated spinal twists, and ankle circles. Stand and march in place for 30 seconds. These micro-movements improve circulation, reduce muscle tension, and boost energy levels throughout the day.',
    category: 'exercise',
    difficulty: 'easy',
    timeToRead: 1,
    featured: false
  },
  {
    id: '6',
    title: 'Quality Sleep Hygiene Tips',
    content: 'Keep a consistent sleep schedule, create a cool, dark bedroom, avoid screens 1 hour before bed, and limit caffeine after 2 PM. A relaxing bedtime routine signals your body it\'s time to rest. Good sleep supports immunity and mental health.',
    category: 'general',
    difficulty: 'moderate',
    timeToRead: 2,
    featured: true
  },
  {
    id: '7',
    title: 'Managing Anxiety in Medical Settings',
    content: 'Practice deep breathing, bring a support person if allowed, ask questions about procedures, and communicate your concerns to healthcare providers. Visualization techniques and focusing on positive outcomes can help reduce medical anxiety.',
    category: 'mental-health',
    difficulty: 'moderate',
    timeToRead: 2,
    featured: false
  },
  {
    id: '8',
    title: 'Warning Signs to Never Ignore',
    content: 'Seek immediate medical attention for chest pain, difficulty breathing, sudden severe headache, confusion, high fever, severe abdominal pain, or signs of stroke (face drooping, arm weakness, speech difficulty). When in doubt, get checked.',
    category: 'prevention',
    difficulty: 'advanced',
    timeToRead: 2,
    featured: true
  }
];

export function HealthTips() {
  const [currentTip, setCurrentTip] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);

  // Auto-advance tips every 30 seconds
  useEffect(() => {
    if (!autoPlay) return;
    
    const interval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % healthTips.length);
    }, 30000);

    return () => clearInterval(interval);
  }, [autoPlay]);

  const nextTip = () => {
    setCurrentTip((prev) => (prev + 1) % healthTips.length);
    setAutoPlay(false);
  };

  const prevTip = () => {
    setCurrentTip((prev) => (prev - 1 + healthTips.length) % healthTips.length);
    setAutoPlay(false);
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'nutrition': return 'bg-green-100 text-green-800';
      case 'exercise': return 'bg-blue-100 text-blue-800';
      case 'mental-health': return 'bg-purple-100 text-purple-800';
      case 'prevention': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'nutrition': return '🥗';
      case 'exercise': return '💪';
      case 'mental-health': return '🧠';
      case 'prevention': return '🛡️';
      default: return '💡';
    }
  };

  const tip = healthTips[currentTip];

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500" />
            Daily Health Tips
          </CardTitle>
          <div className="flex items-center gap-2">
            {tip.featured && (
              <Badge className="bg-yellow-100 text-yellow-800">
                <Star className="w-3 h-3 mr-1" />
                Featured
              </Badge>
            )}
            <Badge variant="outline">
              {currentTip + 1} / {healthTips.length}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">{getCategoryIcon(tip.category)}</span>
              <Badge className={getCategoryColor(tip.category)}>
                {tip.category.replace('-', ' ')}
              </Badge>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <BookOpen className="w-3 h-3" />
              <span>{tip.timeToRead} min read</span>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">{tip.title}</h3>
            <p className="text-gray-700 leading-relaxed">{tip.content}</p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={prevTip}
              className="flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>

            <div className="flex space-x-1">
              {healthTips.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentTip ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={nextTip}
              className="flex items-center gap-1"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAutoPlay(!autoPlay)}
              className="text-xs text-gray-500"
            >
              {autoPlay ? 'Pause Auto-Play' : 'Resume Auto-Play'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}