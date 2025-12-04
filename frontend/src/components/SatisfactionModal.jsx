import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Star, MessageSquare, Clock } from 'lucide-react';

const PRESET_COMMENTS = {
  1: "The wait was too long and uncomfortable",
  2: "The wait was longer than expected", 
  3: "The wait was reasonable",
  4: "The wait was well-managed",
  5: "Excellent service with minimal wait time"
};

const STAGE_QUESTIONS = {
  'waiting_triage': 'How was your waiting experience before triage assessment?',
  'triage': 'How was your triage assessment experience?',
  'waiting_registration': 'How was your waiting experience before registration?',
  'registration': 'How was your registration process?',
  'waiting_doctor': 'How was your waiting experience to see the doctor?',
  'consultation': 'How was your consultation with the doctor?',
  'waiting_admission': 'How was your waiting experience for admission arrangements?',
  'waiting_observation': 'How was your waiting experience for observation arrangements?',
  'waiting_discharge': 'How was your waiting experience for discharge preparation?',
  'admission_orders': 'How was your admission processing experience?',
  'awaiting_non_icu': 'How was your waiting experience for ward transfer?',
  'awaiting_icu': 'How was your waiting experience for ICU transfer?',
  'discharge_documents': 'How was your discharge preparation experience?',
  'awaiting_departure': 'How was your final waiting experience before departure?'
};

export function SatisfactionModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  stageName, 
  stageDisplayName, 
  duration 
}) {
  const [rating, setRating] = useState(null);
  const [comment, setComment] = useState('');
  const [usePreset, setUsePreset] = useState(true);

  const handleSubmit = () => {
    if (!rating) return;
    
    const feedback = {
      rating,
      comment: usePreset ? (PRESET_COMMENTS[rating] || '') : comment,
      submittedAt: new Date()
    };
    
    onSubmit(feedback);
    onClose();
    
    // Reset form
    setRating(null);
    setComment('');
    setUsePreset(true);
  };

  const handleRatingClick = (newRating) => {
    setRating(newRating);
    if (usePreset) {
      setComment(PRESET_COMMENTS[newRating] || '');
    }
  };

  const question = STAGE_QUESTIONS[stageName] || 
                  'How was your experience during this stage?';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            Feedback Request
          </DialogTitle>
          <DialogDescription>
            Help us improve our service by sharing your experience during your recent stage.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Stage Info */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-blue-800">{stageDisplayName}</span>
              <Badge variant="outline" className="text-blue-700">
                <Clock className="w-3 h-3 mr-1" />
                {duration} min
              </Badge>
            </div>
            <p className="text-sm text-blue-700">{question}</p>
          </div>

          {/* Rating */}
          <div className="space-y-3">
            <div className="text-center">
              <p className="font-medium mb-3">Please rate your experience:</p>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleRatingClick(star)}
                    className={`p-2 rounded-full transition-all hover:scale-110 ${
                      rating && star <= rating
                        ? 'text-yellow-500'
                        : 'text-gray-300 hover:text-yellow-400'
                    }`}
                  >
                    <Star 
                      className={`w-8 h-8 ${
                        rating && star <= rating ? 'fill-current' : ''
                      }`} 
                    />
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-2 px-2">
                <span>Very Poor</span>
                <span>Excellent</span>
              </div>
            </div>
          </div>

          {/* Comment Section */}
          {rating && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="usePreset"
                  checked={usePreset}
                  onChange={(e) => {
                    setUsePreset(e.target.checked);
                    if (e.target.checked) {
                      setComment(PRESET_COMMENTS[rating] || '');
                    } else {
                      setComment('');
                    }
                  }}
                  className="rounded"
                />
                <label htmlFor="usePreset" className="text-sm text-gray-700">
                  Use suggested comment
                </label>
              </div>

              <Textarea
                value={comment}
                onChange={(e) => {
                  setComment(e.target.value);
                  setUsePreset(false);
                }}
                placeholder="Optional: Share additional details about your experience..."
                className="min-h-[80px]"
                disabled={usePreset}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Skip
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!rating}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              Submit Feedback
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}