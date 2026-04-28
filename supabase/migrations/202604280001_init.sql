create extension if not exists "uuid-ossp";

create type user_role as enum ('reporter','ambulance_driver','paramedic','doctor','dispatcher','admin','super_admin');
create type emergency_severity as enum ('ringan','sedang','berat','kritis');
create type emergency_status as enum ('reported','dispatching','ambulance_assigned','en_route','on_scene','transporting','completed','cancelled');

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role user_role not null default 'reporter',
  language text not null default 'id',
  gps_enabled boolean not null default false,
  notification_enabled boolean not null default true,
  microphone_enabled boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists emergency_reports (
  id uuid primary key default uuid_generate_v4(),
  reporter_id uuid references profiles(id),
  type text not null,
  severity emergency_severity not null,
  victim_count int not null default 1,
  description text,
  location geography(point, 4326) not null,
  status emergency_status not null default 'reported',
  anonymous_reporter_name text,
  created_at timestamptz not null default now()
);

create table if not exists ambulance_tracking (
  id uuid primary key default uuid_generate_v4(),
  ambulance_id text not null,
  driver_id uuid references profiles(id),
  status text not null,
  latitude double precision not null,
  longitude double precision not null,
  fuel_percent numeric(5,2),
  oxygen_percent numeric(5,2),
  equipment_ready boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists emergency_dispatches (
  id uuid primary key default uuid_generate_v4(),
  emergency_id uuid not null references emergency_reports(id) on delete cascade,
  ambulance_id text not null,
  assigned_by uuid references profiles(id),
  assigned_at timestamptz not null default now(),
  status emergency_status not null default 'ambulance_assigned'
);

create table if not exists patient_monitoring (
  id uuid primary key default uuid_generate_v4(),
  emergency_id uuid not null references emergency_reports(id) on delete cascade,
  patient_name text,
  age int,
  gender text,
  blood_pressure text,
  heart_rate int,
  respiratory_rate int,
  oxygen_saturation int,
  temperature numeric(4,1),
  consciousness_level text,
  treatment_notes text,
  medication_given text,
  recorded_at timestamptz not null default now()
);

create table if not exists team_chat (
  id uuid primary key default uuid_generate_v4(),
  emergency_id uuid not null references emergency_reports(id) on delete cascade,
  channel text not null,
  sender_id uuid references profiles(id),
  message_type text not null,
  message text not null,
  urgent boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists alert_broadcasts (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  message text not null,
  priority text not null,
  target_audience text not null,
  area_scope text,
  expires_at timestamptz,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists notification_queue (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id),
  payload jsonb not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists sync_queue (
  id uuid primary key default uuid_generate_v4(),
  payload jsonb not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

alter publication supabase_realtime add table emergency_reports, ambulance_tracking, emergency_dispatches, patient_monitoring, team_chat, alert_broadcasts, notification_queue;
