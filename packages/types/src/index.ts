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

export type AmbulanceStatus =
  | 'available'
  | 'dispatched'
  | 'en_route'
  | 'on_scene'
  | 'transporting'
  | 'arrived_hospital'
  | 'completed'
  | 'maintenance'
  | 'offline';

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
  driverName?: string;
  status: AmbulanceStatus;
  latitude: number;
  longitude: number;
  etaMinutes?: number | null;
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

export interface DispatchNearestAmbulanceInput {
  emergency_report_id: string;
  latitude: number;
  longitude: number;
  severity: EmergencySeverity;
}

export interface DispatchNearestAmbulanceOutput {
  dispatch_id: string;
  ambulance_id: string;
  eta_minutes: number;
  distance_km: number;
  status: 'assigned' | 'pending' | 'accepted' | 'declined' | 'cancelled' | 'completed';
}

export interface PushNotificationInput {
  target_user_ids?: string[];
  target_role?: UserRole;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  priority?: 'low' | 'normal' | 'high' | 'critical';
}

export interface VoiceToTextInput {
  audio_base64?: string;
  audio_file_url?: string;
  language?: 'id-ID';
}

export interface UpdateAmbulanceLocationInput {
  ambulance_id: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
}

export interface SyncOfflineActionInput {
  idempotency_key: string;
  action_type: string;
  payload: Record<string, unknown>;
  client_updated_at: string;
}
