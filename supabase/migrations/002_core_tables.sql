-- 002_core_tables.sql
-- Harjo Emergency Response Platform

-- =========================================================
-- CORE TABLES
-- =========================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role app_role not null default 'reporter',
  rank text,
  unit text,
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.emergency_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users(id),
  reporter_name text,
  emergency_type emergency_type not null,
  severity severity_level not null default 'sedang',
  patient_name text,
  patient_count int not null default 1,
  description text,
  location_text text not null,
  latitude numeric(10,8) not null,
  longitude numeric(11,8) not null,
  location geography(Point,4326),
  accuracy numeric,
  status emergency_status not null default 'pending',
  anonymous_session_id text,
  voice_transcript text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint emergency_reports_patient_count_ck check (patient_count > 0),
  constraint emergency_reports_latitude_ck check (latitude between -90 and 90),
  constraint emergency_reports_longitude_ck check (longitude between -180 and 180)
);

create table if not exists public.ambulances (
  id uuid primary key default gen_random_uuid(),
  ambulance_id text unique not null,
  plate_number text,
  call_sign text,
  base_location text,
  base_latitude numeric(10,8),
  base_longitude numeric(11,8),
  status ambulance_status not null default 'available',
  fuel_level numeric not null default 100,
  oxygen_level numeric not null default 100,
  crew_count int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ambulances_fuel_level_ck check (fuel_level between 0 and 100),
  constraint ambulances_oxygen_level_ck check (oxygen_level between 0 and 100),
  constraint ambulances_crew_count_ck check (crew_count >= 0),
  constraint ambulances_base_latitude_ck check (base_latitude is null or base_latitude between -90 and 90),
  constraint ambulances_base_longitude_ck check (base_longitude is null or base_longitude between -180 and 180)
);

create table if not exists public.ambulance_drivers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  ambulance_id text references public.ambulances(ambulance_id),
  full_name text not null,
  nrp text unique,
  phone text,
  shift text,
  status text not null default 'active' check (status in ('active','on-duty','on-call','off-duty','inactive')),
  last_seen timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ambulance_tracking (
  id uuid primary key default gen_random_uuid(),
  ambulance_id text not null references public.ambulances(ambulance_id),
  driver_id uuid references auth.users(id),
  latitude numeric(10,8) not null,
  longitude numeric(11,8) not null,
  location geography(Point,4326),
  accuracy numeric,
  speed numeric,
  heading numeric,
  battery_level numeric,
  network_status text,
  "timestamp" timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint ambulance_tracking_latitude_ck check (latitude between -90 and 90),
  constraint ambulance_tracking_longitude_ck check (longitude between -180 and 180)
);

create table if not exists public.emergency_dispatches (
  id uuid primary key default gen_random_uuid(),
  emergency_report_id uuid not null references public.emergency_reports(id) on delete cascade,
  ambulance_id text references public.ambulances(ambulance_id),
  driver_id uuid references auth.users(id),
  dispatcher_id uuid references auth.users(id),
  dispatch_status dispatch_status not null default 'dispatched',
  dispatch_time timestamptz not null default now(),
  accepted_at timestamptz,
  en_route_at timestamptz,
  arrived_scene_at timestamptz,
  transporting_at timestamptz,
  arrived_hospital_at timestamptz,
  completed_at timestamptz,
  estimated_arrival timestamptz,
  eta_minutes int,
  distance_km numeric,
  route_data jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint emergency_dispatches_eta_minutes_ck check (eta_minutes is null or eta_minutes >= 0),
  constraint emergency_dispatches_distance_km_ck check (distance_km is null or distance_km >= 0)
);

create table if not exists public.patient_monitoring (
  id uuid primary key default gen_random_uuid(),
  emergency_report_id uuid not null references public.emergency_reports(id) on delete cascade,
  patient_name text,
  age int,
  gender text check (gender in ('male','female','unknown')),
  blood_pressure_systolic int,
  blood_pressure_diastolic int,
  heart_rate int,
  respiratory_rate int,
  temperature numeric(4,1),
  oxygen_saturation int,
  blood_glucose int,
  consciousness_level text,
  current_condition text,
  treatment_notes text,
  medications_given jsonb not null default '[]'::jsonb,
  recorded_by uuid references auth.users(id),
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint patient_monitoring_age_ck check (age is null or age between 0 and 130),
  constraint patient_monitoring_temp_ck check (temperature is null or temperature between 25 and 45),
  constraint patient_monitoring_ox_sat_ck check (oxygen_saturation is null or oxygen_saturation between 0 and 100)
);

create table if not exists public.team_chat (
  id uuid primary key default gen_random_uuid(),
  emergency_report_id uuid not null references public.emergency_reports(id) on delete cascade,
  sender_id uuid references auth.users(id),
  sender_name text,
  sender_role app_role,
  message text not null,
  message_type text not null default 'text' check (message_type in ('text','location','status','image','audio')),
  attachment_url text,
  metadata jsonb not null default '{}'::jsonb,
  is_urgent boolean not null default false,
  read_by uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.equipment_tracking (
  id uuid primary key default gen_random_uuid(),
  ambulance_id text not null references public.ambulances(ambulance_id),
  equipment_type text,
  equipment_name text not null,
  current_level numeric,
  max_capacity numeric,
  unit text,
  status equipment_status not null default 'operational',
  last_checked_by uuid references auth.users(id),
  last_checked_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint equipment_tracking_level_ck check (current_level is null or current_level >= 0),
  constraint equipment_tracking_capacity_ck check (max_capacity is null or max_capacity >= 0)
);

create table if not exists public.resource_inventory (
  id uuid primary key default gen_random_uuid(),
  item_name text not null,
  category text,
  current_stock int not null default 0,
  minimum_stock int not null default 0,
  unit text,
  location_text text,
  expiry_date date,
  supplier text,
  cost_per_unit numeric(12,2),
  last_updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint resource_inventory_stock_ck check (current_stock >= 0),
  constraint resource_inventory_min_stock_ck check (minimum_stock >= 0),
  constraint resource_inventory_cost_ck check (cost_per_unit is null or cost_per_unit >= 0)
);

create table if not exists public.alert_broadcasts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  priority severity_level,
  target_role app_role,
  target_audience text,
  area_scope jsonb not null default '{}'::jsonb,
  broadcast_type text,
  expires_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.notification_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  target_role app_role,
  title text not null,
  body text not null,
  data jsonb not null default '{}'::jsonb,
  priority text not null default 'normal',
  status notification_status not null default 'queued',
  sent_at timestamptz,
  read_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_queue_priority_ck check (priority in ('low','normal','high','critical'))
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text,
  auth text,
  device_info jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint push_subscriptions_unique_endpoint_per_user unique (user_id, endpoint)
);

create table if not exists public.sync_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  action_type text not null,
  table_name text not null,
  record_id uuid,
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending','processing','synced','failed')),
  retry_count int not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  synced_at timestamptz,
  constraint sync_queue_retry_ck check (retry_count >= 0)
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id),
  actor_role app_role,
  action text not null,
  table_name text not null,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists public.response_analytics (
  id uuid primary key default gen_random_uuid(),
  emergency_report_id uuid not null references public.emergency_reports(id) on delete cascade,
  ambulance_id text,
  response_time_minutes int,
  dispatch_time_minutes int,
  travel_time_minutes int,
  total_case_minutes int,
  sla_met boolean,
  severity severity_level,
  emergency_type emergency_type,
  created_at timestamptz not null default now(),
  constraint response_analytics_unique_report unique (emergency_report_id)
);
