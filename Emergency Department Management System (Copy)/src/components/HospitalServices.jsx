import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { 
  MapPin, 
  Clock, 
  Phone, 
  Wifi, 
  Car, 
  Utensils, 
  ShoppingCart, 
  Baby,
  Accessibility,
  Cross,
  Coffee,
  Banknote,
  Users,
  Building
} from 'lucide-react';

const services = [
  {
    id: '1',
    name: 'Main Cafeteria',
    description: 'Fresh meals, healthy options, grab-and-go items, and beverages available throughout the day.',
    location: 'Ground Floor, Main Lobby',
    hours: '24 hours',
    contact: 'Ext. 2500',
    icon: Utensils,
    category: 'dining',
    available24_7: true,
    cost: 'paid'
  },
  {
    id: '2',
    name: 'Coffee Cart',
    description: 'Premium coffee, tea, pastries, and light snacks. Located near the ED waiting area.',
    location: 'ED Lobby',
    hours: '6:00 AM - 10:00 PM',
    icon: Coffee,
    category: 'dining',
    available24_7: false,
    cost: 'paid'
  },
  {
    id: '3',
    name: 'Gift Shop',
    description: 'Flowers, cards, magazines, phone chargers, personal care items, and comfort items.',
    location: 'Ground Floor, East Wing',
    hours: '8:00 AM - 8:00 PM',
    contact: 'Ext. 2200',
    icon: ShoppingCart,
    category: 'retail',
    available24_7: false,
    cost: 'paid'
  },
  {
    id: '4',
    name: '24-Hour Pharmacy',
    description: 'Full-service pharmacy with prescription filling and over-the-counter medications.',
    location: 'Ground Floor, Near Main Entrance',
    hours: '24 hours',
    contact: 'Ext. 2300',
    icon: Cross,
    category: 'medical',
    available24_7: true,
    cost: 'varies'
  },
  {
    id: '5',
    name: 'Guest WiFi',
    description: 'Free wireless internet access throughout the hospital. Network: "HospitalGuest"',
    location: 'Hospital-wide',
    hours: '24 hours',
    icon: Wifi,
    category: 'convenience',
    available24_7: true,
    cost: 'free'
  },
  {
    id: '6',
    name: 'Valet Parking',
    description: 'Convenient valet service for patients and visitors. Drop-off at main entrance.',
    location: 'Main Entrance',
    hours: '6:00 AM - 10:00 PM',
    contact: 'Ext. 2100',
    icon: Car,
    category: 'convenience',
    available24_7: false,
    cost: 'paid'
  },
  {
    id: '7',
    name: 'ATM Services',
    description: 'Two ATM machines available for banking needs. Located for easy access.',
    location: 'Main Lobby & 2nd Floor',
    hours: '24 hours',
    icon: Banknote,
    category: 'convenience',
    available24_7: true,
    cost: 'varies'
  },
  {
    id: '8',
    name: 'Chapel & Meditation Room',
    description: 'Quiet space for prayer, meditation, and reflection. Multi-faith accommodations available.',
    location: '2nd Floor, West Wing',
    hours: '24 hours',
    icon: Users,
    category: 'convenience',
    available24_7: true,
    cost: 'free'
  },
  {
    id: '9',
    name: 'Children\'s Play Area',
    description: 'Safe, supervised play area with toys, books, and activities for young patients and siblings.',
    location: 'Pediatric Wing, 1st Floor',
    hours: '8:00 AM - 8:00 PM',
    icon: Baby,
    category: 'convenience',
    available24_7: false,
    cost: 'free'
  },
  {
    id: '10',
    name: 'Accessibility Services',
    description: 'Wheelchairs, interpreters, assistance animals welcome, accessible restrooms throughout.',
    location: 'Hospital-wide',
    hours: '24 hours',
    contact: 'Ext. 2000',
    icon: Accessibility,
    category: 'accessibility',
    available24_7: true,
    cost: 'free'
  },
  {
    id: '11',
    name: 'Patient Information',
    description: 'General information desk with maps, directions, and assistance with hospital navigation.',
    location: 'Main Lobby',
    hours: '6:00 AM - 10:00 PM',
    contact: 'Ext. 2000',
    icon: Building,
    category: 'convenience',
    available24_7: false,
    cost: 'free'
  }
];

const categoryColors = {
  dining: 'bg-orange-100 text-orange-800',
  retail: 'bg-purple-100 text-purple-800',
  convenience: 'bg-blue-100 text-blue-800',
  medical: 'bg-red-100 text-red-800',
  accessibility: 'bg-green-100 text-green-800'
};

const costColors = {
  free: 'bg-green-100 text-green-800',
  paid: 'bg-blue-100 text-blue-800',
  varies: 'bg-yellow-100 text-yellow-800'
};

export function HospitalServices() {
  const categories = ['dining', 'retail', 'convenience', 'medical', 'accessibility'];
  
  const getServicesByCategory = (category) => {
    return services.filter(service => service.category === category);
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="w-5 h-5 text-indigo-600" />
          Hospital Services & Amenities
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
            <p className="text-sm text-indigo-800">
              <strong>Need directions?</strong> Ask at the Information Desk or look for the blue wayfinding signs throughout the hospital.
            </p>
          </div>

          {categories.map((category) => {
            const categoryServices = getServicesByCategory(category);
            const categoryName = category.charAt(0).toUpperCase() + category.slice(1).replace('-', ' & ');
            
            return (
              <div key={category} className="space-y-3">
                <h3 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">
                  {categoryName}
                </h3>
                
                <div className="grid gap-3">
                  {categoryServices.map((service) => {
                    const ServiceIcon = service.icon;
                    return (
                      <div
                        key={service.id}
                        className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                              <ServiceIcon className="w-4 h-4 text-gray-600" />
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900">{service.name}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge className={categoryColors[service.category]}>
                                  {service.category.replace('-', ' ')}
                                </Badge>
                                <Badge className={costColors[service.cost]}>
                                  {service.cost}
                                </Badge>
                                {service.available24_7 && (
                                  <Badge variant="outline" className="text-xs">24/7</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-3">{service.description}</p>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center gap-1 text-gray-500">
                            <MapPin className="w-3 h-3" />
                            <span>{service.location}</span>
                          </div>
                          <div className="flex items-center gap-1 text-gray-500">
                            <Clock className="w-3 h-3" />
                            <span>{service.hours}</span>
                          </div>
                          {service.contact && (
                            <div className="flex items-center gap-1 text-gray-500 sm:col-span-2">
                              <Phone className="w-3 h-3" />
                              <span>{service.contact}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Quick Access</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="text-center">
                <div className="text-lg mb-1">🍽️</div>
                <div className="font-medium">Cafeteria</div>
                <div className="text-gray-500">Ext. 2500</div>
              </div>
              <div className="text-center">
                <div className="text-lg mb-1">💊</div>
                <div className="font-medium">Pharmacy</div>
                <div className="text-gray-500">Ext. 2300</div>
              </div>
              <div className="text-center">
                <div className="text-lg mb-1">ℹ️</div>
                <div className="font-medium">Information</div>
                <div className="text-gray-500">Ext. 2000</div>
              </div>
              <div className="text-center">
                <div className="text-lg mb-1">🚗</div>
                <div className="font-medium">Valet</div>
                <div className="text-gray-500">Ext. 2100</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}