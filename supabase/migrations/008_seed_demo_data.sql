-- 008_seed_demo_data.sql
-- Harjo Emergency Response Platform

-- =========================================================
-- DEMO AMBULANCES + BASE LOCATIONS
-- =========================================================

insert into public.ambulances (
  ambulance_id, plate_number, call_sign, base_location, base_latitude, base_longitude,
  status, fuel_level, oxygen_level, crew_count, is_active
)
values
  ('AMB-01', 'B 1201 HJR', 'Harjo Alpha', 'RSUD Harjo Pusat', -6.20010000, 106.81660000, 'available', 92, 88, 3, true),
  ('AMB-02', 'B 1202 HJR', 'Harjo Bravo', 'Puskesmas Harjo Timur', -6.21490000, 106.84510000, 'available', 85, 90, 2, true),
  ('AMB-03', 'B 1203 HJR', 'Harjo Charlie', 'Posko Harjo Barat', -6.17510000, 106.78990000, 'maintenance', 60, 75, 2, true)
on conflict (ambulance_id) do update
set
  plate_number = excluded.plate_number,
  call_sign = excluded.call_sign,
  base_location = excluded.base_location,
  base_latitude = excluded.base_latitude,
  base_longitude = excluded.base_longitude,
  status = excluded.status,
  fuel_level = excluded.fuel_level,
  oxygen_level = excluded.oxygen_level,
  crew_count = excluded.crew_count,
  is_active = excluded.is_active,
  updated_at = now();

-- =========================================================
-- DEMO PROFILES (requires existing auth.users)
-- =========================================================

with ranked_users as (
  select id, row_number() over (order by created_at asc) as rn
  from auth.users
  limit 5
),
profile_seed as (
  select id,
         case rn
           when 1 then 'Rina Pelapor'
           when 2 then 'Dedi Driver'
           when 3 then 'Sari Paramedis'
           when 4 then 'Bima Dispatcher'
           when 5 then 'Nina Admin'
         end as full_name,
         case rn
           when 1 then 'reporter'::app_role
           when 2 then 'ambulance_driver'::app_role
           when 3 then 'paramedic'::app_role
           when 4 then 'dispatcher'::app_role
           else 'admin'::app_role
         end as role,
         case rn
           when 1 then '+628111100001'
           when 2 then '+628111100002'
           when 3 then '+628111100003'
           when 4 then '+628111100004'
           when 5 then '+628111100005'
         end as phone
  from ranked_users
)
insert into public.profiles (id, full_name, phone, role, rank, unit, is_active)
select id, full_name, phone, role, null, 'Harjo Emergency Unit', true
from profile_seed
on conflict (id) do update
set
  full_name = excluded.full_name,
  phone = excluded.phone,
  role = excluded.role,
  unit = excluded.unit,
  updated_at = now();

-- =========================================================
-- DEMO DRIVERS (3)
-- =========================================================

with driver_users as (
  select p.id as user_id,
         p.full_name,
         row_number() over (order by p.created_at asc) as rn
  from public.profiles p
  where p.role = 'ambulance_driver'
  limit 3
),
ambulance_rows as (
  select ambulance_id,
         row_number() over (order by ambulance_id) as rn
  from public.ambulances
  where ambulance_id in ('AMB-01','AMB-02','AMB-03')
),
paired as (
  select d.user_id, d.full_name, a.ambulance_id, d.rn
  from driver_users d
  join ambulance_rows a on a.rn = d.rn
)
insert into public.ambulance_drivers (user_id, ambulance_id, full_name, nrp, phone, shift, status, last_seen)
select
  p.user_id,
  p.ambulance_id,
  p.full_name,
  'NRP-' || lpad(p.rn::text, 4, '0') as nrp,
  '+6281234500' || p.rn::text,
  case when p.rn = 1 then 'morning' when p.rn = 2 then 'afternoon' else 'night' end,
  'on-duty',
  now()
from paired p
on conflict (nrp) do update
set
  ambulance_id = excluded.ambulance_id,
  full_name = excluded.full_name,
  phone = excluded.phone,
  shift = excluded.shift,
  status = excluded.status,
  updated_at = now();

-- =========================================================
-- DEMO EQUIPMENT FOR EACH AMBULANCE
-- =========================================================

insert into public.equipment_tracking (
  ambulance_id, equipment_type, equipment_name, current_level, max_capacity, unit, status, notes
)
values
  ('AMB-01', 'oxygen', 'Oxygen Tank A', 78, 100, '%', 'operational', 'Cukup untuk 2 jam operasi'),
  ('AMB-01', 'defibrillator', 'AED Unit 1', 100, 100, '%', 'operational', 'Baterai penuh'),
  ('AMB-02', 'oxygen', 'Oxygen Tank B', 42, 100, '%', 'low', 'Perlu refill sebelum shift malam'),
  ('AMB-02', 'trauma_kit', 'Trauma Kit B', 85, 100, '%', 'operational', 'Lengkap'),
  ('AMB-03', 'oxygen', 'Oxygen Tank C', 10, 100, '%', 'maintenance', 'Sedang kalibrasi regulator'),
  ('AMB-03', 'suction', 'Portable Suction C', 0, 100, '%', 'broken', 'Motor tidak menyala')
on conflict do nothing;

-- =========================================================
-- SAMPLE EMERGENCY REPORTS
-- =========================================================

with reporter as (
  select id, full_name
  from public.profiles
  where role = 'reporter'
  order by created_at asc
  limit 1
),
report_rows as (
  select
    gen_random_uuid() as id,
    r.id as reporter_id,
    r.full_name as reporter_name,
    'cardiac'::emergency_type as emergency_type,
    'kritis'::severity_level as severity,
    'Bapak Hadi'::text as patient_name,
    1::int as patient_count,
    'Pasien nyeri dada hebat dan sesak napas'::text as description,
    'Jl. Harjo Raya No. 15'::text as location_text,
    -6.20850000::numeric(10,8) as latitude,
    106.84570000::numeric(11,8) as longitude,
    'pending'::emergency_status as status
  from reporter r
  union all
  select
    gen_random_uuid(),
    r.id,
    r.full_name,
    'accident'::emergency_type,
    'berat'::severity_level,
    'Tidak diketahui',
    2,
    'Kecelakaan motor, korban tidak sadar',
    'Perempatan Harjo Timur',
    -6.21520000,
    106.84010000,
    'pending'::emergency_status
  from reporter r
)
insert into public.emergency_reports (
  id, reporter_id, reporter_name, emergency_type, severity, patient_name, patient_count,
  description, location_text, latitude, longitude, status, metadata
)
select
  rr.id, rr.reporter_id, rr.reporter_name, rr.emergency_type, rr.severity, rr.patient_name, rr.patient_count,
  rr.description, rr.location_text, rr.latitude, rr.longitude, rr.status,
  jsonb_build_object('seed', true, 'source', '008_seed_demo_data.sql')
from report_rows rr
on conflict (id) do nothing;

-- =========================================================
-- SAMPLE DISPATCH + TRACKING + PATIENT MONITORING
-- =========================================================

with pending_report as (
  select id
  from public.emergency_reports
  where status = 'pending'
  order by created_at asc
  limit 1
),
dispatcher_user as (
  select id from public.profiles where role = 'dispatcher' order by created_at asc limit 1
),
driver_assignment as (
  select ad.user_id as driver_id, ad.ambulance_id
  from public.ambulance_drivers ad
  order by ad.created_at asc
  limit 1
)
insert into public.emergency_dispatches (
  emergency_report_id, ambulance_id, driver_id, dispatcher_id, dispatch_status,
  dispatch_time, accepted_at, en_route_at, eta_minutes, distance_km, route_data, notes
)
select
  pr.id,
  da.ambulance_id,
  da.driver_id,
  du.id,
  'en_route'::dispatch_status,
  now() - interval '8 minutes',
  now() - interval '7 minutes',
  now() - interval '6 minutes',
  12,
  7.4,
  jsonb_build_object('seed', true, 'route', 'simulated'),
  'Dispatch demo aktif'
from pending_report pr
cross join dispatcher_user du
cross join driver_assignment da
where not exists (
  select 1 from public.emergency_dispatches ed where ed.emergency_report_id = pr.id
);

with first_dispatch as (
  select ed.id, ed.emergency_report_id, ed.ambulance_id, ed.driver_id
  from public.emergency_dispatches ed
  order by ed.created_at asc
  limit 1
)
insert into public.ambulance_tracking (
  ambulance_id, driver_id, latitude, longitude, accuracy, speed, heading, battery_level, network_status, "timestamp"
)
select
  fd.ambulance_id,
  fd.driver_id,
  -6.20910000,
  106.84250000,
  5,
  42,
  130,
  83,
  '4g',
  now()
from first_dispatch fd;

with first_dispatch as (
  select ed.emergency_report_id, ed.driver_id
  from public.emergency_dispatches ed
  order by ed.created_at asc
  limit 1
)
insert into public.patient_monitoring (
  emergency_report_id, patient_name, age, gender,
  blood_pressure_systolic, blood_pressure_diastolic,
  heart_rate, respiratory_rate, temperature, oxygen_saturation,
  consciousness_level, current_condition, treatment_notes,
  medications_given, recorded_by, recorded_at
)
select
  fd.emergency_report_id,
  'Bapak Hadi',
  58,
  'male',
  170,
  100,
  122,
  28,
  37.8,
  89,
  'menurun',
  'Suspect ACS, nyeri dada berlanjut',
  'Aspirin diberikan, oksigen 4L/menit',
  '[{"name":"Aspirin","dose":"160mg"}]'::jsonb,
  fd.driver_id,
  now()
from first_dispatch fd
where not exists (
  select 1 from public.patient_monitoring pm where pm.emergency_report_id = fd.emergency_report_id
);

-- =========================================================
-- SAMPLE ALERT + NOTIFICATION
-- =========================================================

insert into public.alert_broadcasts (
  title, message, priority, target_role, target_audience, area_scope, broadcast_type, expires_at, created_by
)
select
  'Peningkatan Kesiapsiagaan Hujan Lebat',
  'Potensi banjir lokal. Unit diharap siaga dan cek perlengkapan evakuasi.',
  'berat'::severity_level,
  null,
  'all_units',
  jsonb_build_object('city', 'Harjo', 'zones', jsonb_build_array('Timur', 'Pusat')),
  'operational',
  now() + interval '12 hours',
  p.id
from public.profiles p
where p.role in ('dispatcher', 'admin')
order by p.created_at asc
limit 1;

insert into public.notification_queue (
  user_id, target_role, title, body, data, priority, status
)
select
  p.id,
  p.role,
  'Demo Notification',
  'Terdapat update status incident darurat.',
  jsonb_build_object('seed', true),
  'normal',
  'queued'::notification_status
from public.profiles p
where p.is_active = true
limit 5;
