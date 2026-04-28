create extension if not exists postgis;
create extension if not exists pgcrypto;

do $$ begin
  create type ambulance_status as enum ('available','dispatched','en_route','on_scene','transporting','arrived_hospital','completed','maintenance','offline');
exception when duplicate_object then null; end $$;

do $$ begin
  create type dispatch_status as enum ('pending','assigned','accepted','declined','cancelled','completed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type notification_priority as enum ('low','normal','high','critical');
exception when duplicate_object then null; end $$;

do $$ begin
  create type sync_action_status as enum ('pending','processing','success','failed','conflict');
exception when duplicate_object then null; end $$;

create table if not exists anonymous_emergency_sessions (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  nickname text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '2 hour')
);

create table if not exists ambulances (
  id text primary key,
  plate_number text not null unique,
  status ambulance_status not null default 'available',
  crew_capacity int not null default 3,
  equipment_ready boolean not null default true,
  current_location geography(point,4326),
  last_heartbeat_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ambulance_driver_assignments (
  id uuid primary key default gen_random_uuid(),
  ambulance_id text not null references ambulances(id) on delete cascade,
  driver_id uuid not null references profiles(id) on delete cascade,
  is_active boolean not null default true,
  assigned_at timestamptz not null default now(),
  unassigned_at timestamptz,
  unique (ambulance_id, driver_id, assigned_at)
);

create table if not exists ambulance_equipment (
  id uuid primary key default gen_random_uuid(),
  ambulance_id text not null references ambulances(id) on delete cascade,
  equipment_code text not null,
  equipment_name text not null,
  quantity int not null default 1,
  min_required int not null default 1,
  is_ready boolean not null default true,
  checked_at timestamptz not null default now(),
  checked_by uuid references profiles(id),
  unique (ambulance_id, equipment_code)
);

create table if not exists emergency_case_members (
  id uuid primary key default gen_random_uuid(),
  emergency_id uuid not null references emergency_reports(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  member_role user_role not null,
  created_at timestamptz not null default now(),
  unique (emergency_id, user_id)
);

create table if not exists audit_logs (
  id bigserial primary key,
  table_name text not null,
  operation text not null,
  record_id text not null,
  actor_user_id uuid,
  old_data jsonb,
  new_data jsonb,
  metadata jsonb,
  created_at timestamptz not null default now()
);

alter table emergency_reports
  add column if not exists anonymous_session_id uuid references anonymous_emergency_sessions(id),
  add column if not exists address_text text,
  add column if not exists dispatch_started_at timestamptz,
  add column if not exists dispatched_at timestamptz,
  add column if not exists closed_at timestamptz,
  add column if not exists sla_target_minutes int,
  add column if not exists response_time_seconds int,
  add column if not exists dispatch_time_seconds int,
  add column if not exists travel_time_seconds int;

alter table emergency_dispatches
  alter column status type dispatch_status using
    case
      when status::text = 'ambulance_assigned' then 'assigned'::dispatch_status
      when status::text = 'completed' then 'completed'::dispatch_status
      else 'pending'::dispatch_status
    end,
  alter column status set default 'pending';

alter table emergency_dispatches
  add column if not exists accepted_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists eta_minutes int,
  add column if not exists distance_km numeric(10,2),
  add column if not exists driver_id uuid references profiles(id);

alter table ambulance_tracking
  add column if not exists location geography(point,4326),
  add column if not exists accuracy_meters numeric(8,2),
  add column if not exists speed_kph numeric(6,2),
  add column if not exists heading numeric(6,2);

update ambulance_tracking
set location = st_setsrid(st_makepoint(longitude, latitude),4326)::geography
where location is null;

alter table team_chat add column if not exists sender_role user_role;
alter table team_chat add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table notification_queue add column if not exists title text;
alter table notification_queue add column if not exists body text;
alter table notification_queue add column if not exists priority notification_priority not null default 'normal';
alter table notification_queue add column if not exists target_role user_role;
alter table notification_queue add column if not exists delivered_at timestamptz;
alter table notification_queue add column if not exists retries int not null default 0;
alter table sync_queue add column if not exists action_type text;
alter table sync_queue add column if not exists user_id uuid references profiles(id);
alter table sync_queue add column if not exists client_action_id text;
alter table sync_queue add column if not exists last_error text;
alter table sync_queue add column if not exists processed_at timestamptz;

alter table sync_queue
  alter column status type sync_action_status using
    case
      when status in ('pending','processing','success','failed','conflict') then status::sync_action_status
      else 'pending'::sync_action_status
    end,
  alter column status set default 'pending';

create index if not exists idx_emergency_reports_status_created_at on emergency_reports(status, created_at desc);
create index if not exists idx_emergency_reports_severity on emergency_reports(severity);
create index if not exists idx_emergency_reports_reporter on emergency_reports(reporter_id);
create index if not exists idx_emergency_reports_location on emergency_reports using gist(location);
create index if not exists idx_ambulance_tracking_ambulance_id_updated on ambulance_tracking(ambulance_id, updated_at desc);
create index if not exists idx_ambulance_tracking_location on ambulance_tracking using gist(location);
create index if not exists idx_emergency_dispatches_emergency on emergency_dispatches(emergency_id, assigned_at desc);
create index if not exists idx_emergency_dispatches_ambulance on emergency_dispatches(ambulance_id, assigned_at desc);
create index if not exists idx_patient_monitoring_emergency on patient_monitoring(emergency_id, recorded_at desc);
create index if not exists idx_team_chat_emergency on team_chat(emergency_id, created_at desc);
create index if not exists idx_notification_queue_status_created on notification_queue(status, created_at desc);
create index if not exists idx_locations_recorded_at on locations(recorded_at desc);
create index if not exists idx_sync_queue_user_status on sync_queue(user_id, status, created_at desc);
create index if not exists idx_audit_logs_table_created on audit_logs(table_name, created_at desc);

create or replace function public.current_user_role()
returns user_role
language sql
stable
as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function public.has_any_role(roles user_role[])
returns boolean
language sql
stable
as $$
  select coalesce(current_user_role() = any(roles), false);
$$;

create or replace function public.is_case_member(p_emergency_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from emergency_case_members m
    where m.emergency_id = p_emergency_id
      and m.user_id = auth.uid()
  )
  or has_any_role(array['dispatcher','admin','super_admin']::user_role[]);
$$;

create or replace function public.nearest_available_ambulance(
  p_latitude double precision,
  p_longitude double precision,
  p_limit int default 1
)
returns table (
  ambulance_id text,
  driver_id uuid,
  distance_km numeric,
  eta_minutes int
)
language sql
stable
as $$
  with target as (
    select st_setsrid(st_makepoint(p_longitude, p_latitude),4326)::geography as g
  )
  select
    a.id,
    ada.driver_id,
    round((st_distance(a.current_location, t.g) / 1000.0)::numeric, 2) as distance_km,
    greatest(1, ceil((st_distance(a.current_location, t.g) / 1000.0) / 0.6))::int as eta_minutes
  from ambulances a
  join target t on true
  join ambulance_driver_assignments ada on ada.ambulance_id = a.id and ada.is_active = true
  join profiles p on p.id = ada.driver_id and p.role = 'ambulance_driver'
  where a.status = 'available'
    and a.equipment_ready = true
    and a.current_location is not null
  order by st_distance(a.current_location, t.g)
  limit p_limit;
$$;

create or replace function public.dispatch_nearest_ambulance(
  p_emergency_report_id uuid,
  p_latitude double precision,
  p_longitude double precision,
  p_severity emergency_severity
)
returns table (
  dispatch_id uuid,
  ambulance_id text,
  eta_minutes int,
  distance_km numeric,
  status dispatch_status
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ambulance text;
  v_driver uuid;
  v_eta int;
  v_distance numeric;
  v_dispatch_id uuid;
begin
  if not has_any_role(array['dispatcher','admin','super_admin']::user_role[]) then
    raise exception 'Forbidden';
  end if;

  select n.ambulance_id, n.driver_id, n.eta_minutes, n.distance_km
  into v_ambulance, v_driver, v_eta, v_distance
  from nearest_available_ambulance(p_latitude, p_longitude, 1) n;

  if v_ambulance is null then
    raise exception 'No available ambulance';
  end if;

  insert into emergency_dispatches (emergency_id, ambulance_id, driver_id, assigned_by, eta_minutes, distance_km, status)
  values (p_emergency_report_id, v_ambulance, v_driver, auth.uid(), v_eta, v_distance, 'assigned')
  returning id into v_dispatch_id;

  update ambulances set status = 'dispatched', updated_at = now() where id = v_ambulance;

  update emergency_reports
  set status = 'ambulance_assigned', dispatched_at = now()
  where id = p_emergency_report_id;

  insert into emergency_case_members (emergency_id, user_id, member_role)
  values
    (p_emergency_report_id, v_driver, 'ambulance_driver')
  on conflict (emergency_id, user_id) do nothing;

  return query
  select v_dispatch_id, v_ambulance, v_eta, v_distance, 'assigned'::dispatch_status;
end;
$$;

create or replace function public.capture_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into audit_logs (
    table_name,
    operation,
    record_id,
    actor_user_id,
    old_data,
    new_data,
    metadata
  ) values (
    tg_table_name,
    tg_op,
    coalesce((to_jsonb(new)->>'id'), (to_jsonb(old)->>'id')),
    auth.uid(),
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) else null end,
    jsonb_build_object('schema', tg_table_schema)
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create or replace function public.set_ambulance_tracking_location()
returns trigger
language plpgsql
as $$
begin
  new.location := st_setsrid(st_makepoint(new.longitude, new.latitude),4326)::geography;
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.touch_ambulance_from_tracking()
returns trigger
language plpgsql
as $$
begin
  insert into ambulances (id, plate_number, status, equipment_ready, current_location, last_heartbeat_at, updated_at)
  values (new.ambulance_id, new.ambulance_id, coalesce(new.status::ambulance_status, 'available'), coalesce(new.equipment_ready, true), new.location, now(), now())
  on conflict (id) do update
    set current_location = excluded.current_location,
        last_heartbeat_at = excluded.last_heartbeat_at,
        equipment_ready = coalesce(new.equipment_ready, ambulances.equipment_ready),
        status = case when new.status::text = any(enum_range(null::ambulance_status)::text[]) then new.status::ambulance_status else ambulances.status end,
        updated_at = now();
  return new;
end;
$$;

create or replace function public.calculate_emergency_metrics()
returns trigger
language plpgsql
as $$
declare
  v_assigned_at timestamptz;
  v_arrive_scene timestamptz;
  v_arrive_hospital timestamptz;
begin
  if new.status in ('completed','cancelled') then
    select min(assigned_at),
           min(case when status = 'accepted' then accepted_at end),
           min(case when status = 'completed' then completed_at end)
    into v_assigned_at, v_arrive_scene, v_arrive_hospital
    from emergency_dispatches
    where emergency_id = new.id;

    update emergency_reports
    set closed_at = now(),
        dispatch_time_seconds = case when v_assigned_at is not null then extract(epoch from (v_assigned_at - created_at))::int end,
        response_time_seconds = case when v_arrive_scene is not null then extract(epoch from (v_arrive_scene - created_at))::int end,
        travel_time_seconds = case when v_arrive_hospital is not null and v_arrive_scene is not null then extract(epoch from (v_arrive_hospital - v_arrive_scene))::int end
    where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_ambulance_tracking_location on ambulance_tracking;
create trigger trg_ambulance_tracking_location
before insert or update on ambulance_tracking
for each row execute function set_ambulance_tracking_location();

drop trigger if exists trg_touch_ambulance_tracking on ambulance_tracking;
create trigger trg_touch_ambulance_tracking
after insert or update on ambulance_tracking
for each row execute function touch_ambulance_from_tracking();

drop trigger if exists trg_emergency_reports_metrics on emergency_reports;
create trigger trg_emergency_reports_metrics
after update of status on emergency_reports
for each row execute function calculate_emergency_metrics();

drop trigger if exists trg_audit_emergency_reports on emergency_reports;
create trigger trg_audit_emergency_reports after insert or update or delete on emergency_reports for each row execute function capture_audit_log();
drop trigger if exists trg_audit_emergency_dispatches on emergency_dispatches;
create trigger trg_audit_emergency_dispatches after insert or update or delete on emergency_dispatches for each row execute function capture_audit_log();
drop trigger if exists trg_audit_ambulance_tracking on ambulance_tracking;
create trigger trg_audit_ambulance_tracking after insert or update or delete on ambulance_tracking for each row execute function capture_audit_log();
drop trigger if exists trg_audit_patient_monitoring on patient_monitoring;
create trigger trg_audit_patient_monitoring after insert or update or delete on patient_monitoring for each row execute function capture_audit_log();
drop trigger if exists trg_audit_team_chat on team_chat;
create trigger trg_audit_team_chat after insert or update or delete on team_chat for each row execute function capture_audit_log();

alter table profiles enable row level security;
alter table emergency_reports enable row level security;
alter table locations enable row level security;
alter table ambulance_tracking enable row level security;
alter table ambulances enable row level security;
alter table emergency_dispatches enable row level security;
alter table patient_monitoring enable row level security;
alter table team_chat enable row level security;
alter table alert_broadcasts enable row level security;
alter table notification_queue enable row level security;
alter table sync_queue enable row level security;
alter table emergency_case_members enable row level security;
alter table ambulance_driver_assignments enable row level security;
alter table ambulance_equipment enable row level security;
alter table anonymous_emergency_sessions enable row level security;
alter table audit_logs enable row level security;

-- profiles
create policy profiles_select_self_or_admin on profiles
for select using (id = auth.uid() or has_any_role(array['admin','super_admin']::user_role[]));

create policy profiles_update_self_or_admin on profiles
for update using (id = auth.uid() or has_any_role(array['admin','super_admin']::user_role[]))
with check (id = auth.uid() or has_any_role(array['admin','super_admin']::user_role[]));

-- emergency reports
create policy emergency_reports_insert_reporter_or_dispatcher on emergency_reports
for insert with check (
  auth.uid() is not null
  and (
    reporter_id = auth.uid()
    or has_any_role(array['dispatcher','admin','super_admin','reporter']::user_role[])
    or anonymous_session_id is not null
  )
);

create policy emergency_reports_select_scope on emergency_reports
for select using (
  reporter_id = auth.uid()
  or is_case_member(id)
  or has_any_role(array['dispatcher','admin','super_admin']::user_role[])
);

create policy emergency_reports_update_scope on emergency_reports
for update using (
  is_case_member(id)
  or has_any_role(array['dispatcher','admin','super_admin']::user_role[])
)
with check (
  is_case_member(id)
  or has_any_role(array['dispatcher','admin','super_admin']::user_role[])
);

-- locations
create policy locations_insert_case_member on locations
for insert with check (
  (auth.uid() is not null and (is_case_member(emergency_id) or has_any_role(array['ambulance_driver','dispatcher','admin','super_admin']::user_role[])))
  or emergency_id is null
);

create policy locations_select_case_member on locations
for select using (
  emergency_id is null
  or is_case_member(emergency_id)
  or has_any_role(array['dispatcher','admin','super_admin']::user_role[])
);

-- ambulances and tracking
create policy ambulances_select_ops on ambulances
for select using (has_any_role(array['ambulance_driver','dispatcher','admin','super_admin','paramedic','doctor']::user_role[]));

create policy ambulances_update_dispatcher_admin on ambulances
for update using (
  has_any_role(array['dispatcher','admin','super_admin']::user_role[])
  or exists (
    select 1 from ambulance_driver_assignments a
    where a.ambulance_id = ambulances.id and a.driver_id = auth.uid() and a.is_active = true
  )
)
with check (
  has_any_role(array['dispatcher','admin','super_admin']::user_role[])
  or exists (
    select 1 from ambulance_driver_assignments a
    where a.ambulance_id = ambulances.id and a.driver_id = auth.uid() and a.is_active = true
  )
);

create policy ambulance_tracking_select_scope on ambulance_tracking
for select using (
  has_any_role(array['dispatcher','admin','super_admin','paramedic','doctor']::user_role[])
  or exists (
    select 1 from ambulance_driver_assignments a
    where a.ambulance_id = ambulance_tracking.ambulance_id and a.driver_id = auth.uid() and a.is_active = true
  )
);

create policy ambulance_tracking_insert_scope on ambulance_tracking
for insert with check (
  has_any_role(array['dispatcher','admin','super_admin']::user_role[])
  or exists (
    select 1 from ambulance_driver_assignments a
    where a.ambulance_id = ambulance_tracking.ambulance_id and a.driver_id = auth.uid() and a.is_active = true
  )
);

create policy ambulance_tracking_update_scope on ambulance_tracking
for update using (
  has_any_role(array['dispatcher','admin','super_admin']::user_role[])
  or exists (
    select 1 from ambulance_driver_assignments a
    where a.ambulance_id = ambulance_tracking.ambulance_id and a.driver_id = auth.uid() and a.is_active = true
  )
)
with check (
  has_any_role(array['dispatcher','admin','super_admin']::user_role[])
  or exists (
    select 1 from ambulance_driver_assignments a
    where a.ambulance_id = ambulance_tracking.ambulance_id and a.driver_id = auth.uid() and a.is_active = true
  )
);

-- dispatch
create policy dispatches_select_scope on emergency_dispatches
for select using (
  has_any_role(array['dispatcher','admin','super_admin','paramedic','doctor']::user_role[])
  or driver_id = auth.uid()
  or is_case_member(emergency_id)
);

create policy dispatches_insert_dispatcher on emergency_dispatches
for insert with check (has_any_role(array['dispatcher','admin','super_admin']::user_role[]));

create policy dispatches_update_driver_or_dispatcher on emergency_dispatches
for update using (
  has_any_role(array['dispatcher','admin','super_admin']::user_role[])
  or driver_id = auth.uid()
)
with check (
  has_any_role(array['dispatcher','admin','super_admin']::user_role[])
  or driver_id = auth.uid()
);

-- patient monitoring
create policy patient_monitoring_select_case on patient_monitoring
for select using (is_case_member(emergency_id) or has_any_role(array['dispatcher','admin','super_admin']::user_role[]));

create policy patient_monitoring_insert_medical on patient_monitoring
for insert with check (
  is_case_member(emergency_id)
  and has_any_role(array['paramedic','doctor','dispatcher','admin','super_admin']::user_role[])
);

create policy patient_monitoring_update_medical on patient_monitoring
for update using (
  is_case_member(emergency_id)
  and has_any_role(array['paramedic','doctor','dispatcher','admin','super_admin']::user_role[])
)
with check (
  is_case_member(emergency_id)
  and has_any_role(array['paramedic','doctor','dispatcher','admin','super_admin']::user_role[])
);

-- chat
create policy team_chat_select_case on team_chat
for select using (is_case_member(emergency_id) or has_any_role(array['dispatcher','admin','super_admin']::user_role[]));

create policy team_chat_insert_case on team_chat
for insert with check (
  is_case_member(emergency_id)
  or has_any_role(array['dispatcher','admin','super_admin']::user_role[])
);

-- alerts & notifications
create policy alert_broadcasts_select_all_ops on alert_broadcasts
for select using (has_any_role(array['reporter','ambulance_driver','paramedic','doctor','dispatcher','admin','super_admin']::user_role[]));

create policy alert_broadcasts_insert_dispatcher_admin on alert_broadcasts
for insert with check (has_any_role(array['dispatcher','admin','super_admin']::user_role[]));

create policy notification_queue_select_owner_or_admin on notification_queue
for select using (user_id = auth.uid() or has_any_role(array['dispatcher','admin','super_admin']::user_role[]));

create policy notification_queue_insert_dispatcher_admin on notification_queue
for insert with check (has_any_role(array['dispatcher','admin','super_admin']::user_role[]));

create policy notification_queue_update_dispatcher_admin on notification_queue
for update using (has_any_role(array['dispatcher','admin','super_admin']::user_role[]))
with check (has_any_role(array['dispatcher','admin','super_admin']::user_role[]));

-- sync queue
create policy sync_queue_select_own on sync_queue
for select using (user_id = auth.uid() or has_any_role(array['dispatcher','admin','super_admin']::user_role[]));

create policy sync_queue_insert_own on sync_queue
for insert with check (user_id = auth.uid());

create policy sync_queue_update_own_or_admin on sync_queue
for update using (user_id = auth.uid() or has_any_role(array['dispatcher','admin','super_admin']::user_role[]))
with check (user_id = auth.uid() or has_any_role(array['dispatcher','admin','super_admin']::user_role[]));

-- membership/resources
create policy emergency_case_members_select_case on emergency_case_members
for select using (user_id = auth.uid() or has_any_role(array['dispatcher','admin','super_admin']::user_role[]));

create policy emergency_case_members_manage_dispatcher on emergency_case_members
for all using (has_any_role(array['dispatcher','admin','super_admin']::user_role[]))
with check (has_any_role(array['dispatcher','admin','super_admin']::user_role[]));

create policy ambulance_driver_assignments_select_ops on ambulance_driver_assignments
for select using (driver_id = auth.uid() or has_any_role(array['dispatcher','admin','super_admin']::user_role[]));

create policy ambulance_driver_assignments_manage_dispatcher on ambulance_driver_assignments
for all using (has_any_role(array['dispatcher','admin','super_admin']::user_role[]))
with check (has_any_role(array['dispatcher','admin','super_admin']::user_role[]));

create policy ambulance_equipment_select_ops on ambulance_equipment
for select using (has_any_role(array['ambulance_driver','paramedic','doctor','dispatcher','admin','super_admin']::user_role[]));

create policy ambulance_equipment_manage_ops on ambulance_equipment
for all using (has_any_role(array['ambulance_driver','dispatcher','admin','super_admin']::user_role[]))
with check (has_any_role(array['ambulance_driver','dispatcher','admin','super_admin']::user_role[]));

create policy anonymous_sessions_insert_service on anonymous_emergency_sessions
for insert with check (auth.role() = 'service_role');

create policy anonymous_sessions_select_service on anonymous_emergency_sessions
for select using (auth.role() = 'service_role');

create policy audit_logs_select_admin on audit_logs
for select using (has_any_role(array['admin','super_admin']::user_role[]));

revoke all on function public.dispatch_nearest_ambulance(uuid,double precision,double precision,emergency_severity) from public;
grant execute on function public.dispatch_nearest_ambulance(uuid,double precision,double precision,emergency_severity) to authenticated;

create materialized view if not exists analytics_daily_emergency_metrics as
select
  date_trunc('day', created_at) as day,
  severity,
  count(*) as total_reports,
  avg(response_time_seconds) filter (where response_time_seconds is not null) as avg_response_seconds,
  avg(dispatch_time_seconds) filter (where dispatch_time_seconds is not null) as avg_dispatch_seconds,
  avg(travel_time_seconds) filter (where travel_time_seconds is not null) as avg_travel_seconds
from emergency_reports
group by 1,2;

create unique index if not exists idx_analytics_daily_metrics_day_severity on analytics_daily_emergency_metrics(day, severity);

create or replace function public.refresh_analytics_daily_metrics()
returns void
language sql
security definer
set search_path = public
as $$
  refresh materialized view concurrently analytics_daily_emergency_metrics;
$$;

create or replace function public.apply_retention_policies()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from locations where recorded_at < now() - interval '30 days';
  delete from team_chat where created_at < now() - interval '1 year';
  delete from notification_queue where created_at < now() - interval '90 days';
  delete from emergency_reports where created_at < now() - interval '5 years';
  delete from audit_logs where created_at < now() - interval '5 years';
end;
$$;
