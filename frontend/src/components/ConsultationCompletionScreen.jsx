import { useState } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { CheckCircle, Send } from 'lucide-react';
import { toast } from 'sonner';

export function ConsultationCompletionScreen({ onSubmitFeedback, patientName, queueNumber }) {
  const [satisfaction, setSatisfaction] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (satisfaction === 0) return;

    setIsLoading(true);
    try {
      // Send feedback to backend
      const response = await fetch('http://localhost:5000/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          queueNumber: queueNumber,
          rating: satisfaction,
          comment: comment,
          stage: 'departed',
          stageName: 'Overall Visit Satisfaction',
          type: 'overall_satisfaction'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to submit feedback');
      }

      const result = await response.json();
      
      // Also call the callback if provided
      const feedback = {
        rating: satisfaction,
        comment: comment,
        submittedAt: new Date(),
        type: 'overall_satisfaction'
      };
      
      if (onSubmitFeedback) {
        onSubmitFeedback(feedback);
      }

      toast.success('Thank you! Your feedback has been recorded.');
      setSubmitted(true);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Failed to submit feedback. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <CheckCircle className="w-16 h-16 text-green-600" />
        <h2 className="text-2xl font-bold text-green-700">Thank You!</h2>
        <p className="text-gray-600 text-center">
          Your feedback has been recorded and will help us improve our services.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Completion Message */}
      <div className="flex flex-col items-center justify-center py-8 space-y-4">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle className="w-16 h-16 text-green-600" />
        </div>
        <h2 className="text-3xl font-bold text-center text-gray-800">
          Your Consultation is Complete!
        </h2>
        <p className="text-lg text-center text-gray-600 max-w-md">
          Thank you for visiting us, {patientName}. Stay safe and take care of yourself!
        </p>
      </div>

      {/* Overall Satisfaction Survey */}
      <div className="p-6 bg-blue-50 border border-blue-200 rounded-xl">
        <h3 className="text-lg font-semibold text-blue-800 mb-6 text-center">
          Overall Experience Rating
        </h3>

        {/* Emoji Rating */}
        <div className="text-center mb-8">
          <p className="text-base text-blue-800 font-semibold mb-6">
            How satisfied are you with your overall visit?
          </p>

          <div className="flex justify-center items-center gap-6 mb-6">
            {[
              { id: 1, emoji: '😠', label: 'Very Unsatisfied' },
              { id: 2, emoji: '😕', label: 'Unsatisfied' },
              { id: 3, emoji: '😐', label: 'Neutral' },
              { id: 4, emoji: '🙂', label: 'Satisfied' },
              { id: 5, emoji: '😄', label: 'Very Satisfied' },
            ].map((item, index, arr) => (
              <div key={item.id} className="flex items-center">
                <div
                  className="flex flex-col items-center cursor-pointer"
                  onClick={() => setSatisfaction(item.id)}
                  title={item.label}
                >
                  <span
                    className={`text-6xl transition-transform duration-200 ${
                      satisfaction === item.id
                        ? 'scale-125'
                        : 'opacity-60 hover:opacity-100 hover:scale-110'
                    }`}
                  >
                    {item.emoji}
                  </span>
                  <span
                    className={`mt-2 text-sm font-medium ${
                      satisfaction === item.id
                        ? 'text-blue-700'
                        : 'text-gray-500'
                    }`}
                  >
                    {item.label}
                  </span>
                </div>

                {/* Divider - skip after last emoji */}
                {index < arr.length - 1 && (
                  <div className="h-10 border-l border-gray-300 mx-6"></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Optional Comment */}
        {satisfaction > 0 && (
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-blue-800">
              Additional Comments (Optional)
            </label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share any additional feedback, suggestions, or concerns about your visit..."
              className="min-h-[100px] text-sm"
            />
            <p className="text-xs text-blue-600">
              Your feedback will be sent directly to the ED Manager for review and improvement.
            </p>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex gap-3 mt-6">
          <Button variant="outline" className="flex-1" disabled>
            Return Home
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={satisfaction === 0 || isLoading}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            <Send className="w-4 h-4 mr-2" />
            {isLoading ? 'Submitting...' : 'Submit Overall Feedback'}
          </Button>
        </div>
      </div>
    </div>
  );
}
