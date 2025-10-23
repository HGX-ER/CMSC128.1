import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Megaphone, Clock, Calendar, Users } from 'lucide-react';

const mockAnnouncements = [
  {
    id: '1',
    title: 'New Visitor Guidelines',
    content: 'Starting today, we allow up to 2 visitors per patient in the ED. Please check in at the front desk and follow our safety protocols.',
    type: 'Update',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    priority: 'Medium'
  },
  {
    id: '2',
    title: 'Pharmacy Services Available',
    content: 'Our 24/7 pharmacy is located on the ground floor, next to the main lobby. Pick up your prescriptions before leaving.',
    type: 'Service',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    priority: 'Low'
  },
  {
    id: '3',
    title: 'Free WiFi Available',
    content: 'Connect to "HospitalGuest" network. No password required. Streaming services are available in waiting areas.',
    type: 'Service',
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
    priority: 'Low'
  },
  {
    id: '4',
    title: 'Cafeteria Hours Extended',
    content: 'Our cafeteria now serves fresh meals 24/7. Healthy options and family-friendly meals available.',
    type: 'Update',
    timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
    priority: 'Low'
  },
  {
    id: '5',
    title: 'Patient Comfort Initiative',
    content: 'We\'ve added charging stations, reading materials, and comfortable seating to all waiting areas.',
    type: 'General',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    priority: 'Medium'
  }
];

export function HospitalAnnouncements() {
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return 'bg-red-100 text-red-800 border-red-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'Emergency': return '🚨';
      case 'Service': return '🏥';
      case 'Update': return '📢';
      default: return '📋';
    }
  };

  const getRelativeTime = (timestamp) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return 'Just Now';
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-blue-600" />
          Hospital News & Updates
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-80 overflow-y-auto">
          {mockAnnouncements.map((announcement) => (
            <div
              key={announcement.id}
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getTypeIcon(announcement.type)}</span>
                  <h3 className="font-medium text-gray-900">{announcement.title}</h3>
                </div>
                <Badge className={getPriorityColor(announcement.priority)}>
                  {announcement.priority}
                </Badge>
              </div>
              
              <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                {announcement.content}
              </p>
              
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{getRelativeTime(announcement.timestamp)}</span>
                </div>
                <div className="capitalize">{announcement.type} update</div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 text-blue-800">
            <Calendar className="w-4 h-4" />
            <span className="text-sm font-medium">Stay Connected</span>
          </div>
          <p className="text-xs text-blue-700 mt-1">
            Follow us on social media @cityHospitalED for the latest updates and health tips.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}