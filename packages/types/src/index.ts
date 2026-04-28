export type UserRole =
  | 'reporter'
  | 'ambulance_driver'
  | 'paramedic'
  | 'doctor'
  | 'dispatcher'
  | 'admin'
  | 'super_admin';

export type EmergencySeverity = 'ringan' | 'sedang' | 'berat' | 'kritis';
export type EmergencyStatus =
  | 'reported'
  | 'dispatching'
  | 'ambulance_assigned'
  | 'en_route'
  | 'on_scene'
  | 'transporting'
  | 'completed'
  | 'cancelled';

export interface EmergencyReport {
  id: string;
  reporterId: string | null;
  type: string;
  severity: EmergencySeverity;
  victimCount: number;
  description?: string;
  latitude: number;
  longitude: number;
  status: EmergencyStatus;
  createdAt: string;
}

export interface AmbulanceTracking {
  id: string;
  ambulanceId: string;
  driverName: string;
  status: 'available' | 'dispatched' | 'en_route' | 'on_scene' | 'transporting' | 'maintenance';
  latitude: number;
  longitude: number;
  etaMinutes: number | null;
  updatedAt: string;
}

export interface PatientMonitoring {
  id: string;
  emergencyId: string;
  patientName: string | null;
  age: number | null;
  gender: 'male' | 'female' | 'other' | null;
  bloodPressure: string | null;
  heartRate: number | null;
  respiratoryRate: number | null;
  oxygenSaturation: number | null;
  temperature: number | null;
  consciousnessLevel: string | null;
  treatmentNotes: string | null;
  medicationGiven: string | null;
  recordedAt: string;
}
