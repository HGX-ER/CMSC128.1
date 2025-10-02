import { Badge } from "./ui/badge";

const ESI_COLORS = {
  1: "bg-red-600 text-white",
  2: "bg-orange-500 text-white", 
  3: "bg-yellow-500 text-black",
  4: "bg-green-500 text-white",
  5: "bg-blue-500 text-white"
};

export function DoctorPatientCard({ patient, isSelected, onSelect, getTotalTime }) {
  const getPatientAge = (patient) => {
    if (patient.age) return `${patient.age}y`;
    if (patient.dateOfBirth) {
      const age = new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear();
      return `${age}y`;
    }
    return 'Unknown';
  };

  return (
    <div
      className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${
        isSelected 
          ? 'border-blue-500 bg-blue-50 shadow-sm' 
          : 'hover:bg-gray-50 border-gray-200 hover:border-gray-300'
      }`}
      onClick={onSelect}
    >
      <div className="space-y-3">
        <div className="flex justify-between items-start">
          <div>
            <div className="font-medium text-lg">{patient.name}</div>
            <div className="text-sm text-gray-600">
              {getPatientAge(patient)} • {patient.sex}
            </div>
            <div className="font-mono text-sm text-gray-500">{patient.id}</div>
          </div>
          <div className="text-right space-y-1">
            {patient.esiLevel && (
              <div>
                <Badge className={ESI_COLORS[patient.esiLevel]}>
                  ESI {patient.esiLevel}
                </Badge>
              </div>
            )}
            <div>
              <Badge variant="outline">
                {getTotalTime(patient)}m total
              </Badge>
            </div>
          </div>
        </div>
        
        <div className="text-sm">
          <strong>Chief Complaint:</strong> {patient.chiefComplaint}
        </div>
        
        <div className="flex justify-between items-center text-xs text-gray-500">
          <span>Arrived: {patient.arrivalTime.toLocaleString()}</span>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {patient.currentStage === 'waiting_doctor' ? 'Ready for Consultation' : 'In Progress'}
            </Badge>
            {!isSelected && (
              <span className="text-blue-600 text-xs">Click to view →</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}