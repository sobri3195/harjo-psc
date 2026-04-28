-- 004_functions.sql
-- Harjo Emergency Response Platform

-- =========================================================
-- GENERIC HELPERS
-- =========================================================

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.set_geography_from_lat_lng()
returns trigger
language plpgsql
as $$
begin
  if new.latitude is not null and new.longitude is not null then
    new.location = st_setsrid(st_makepoint(new.longitude::double precision, new.latitude::double precision), 4326)::geography;
  end if;
  return new;
end;
$$;

create or replace function public.calculate_distance_km(lat1 numeric, lon1 numeric, lat2 numeric, lon2 numeric)
returns numeric
language sql
immutable
as $$
  select round(
    (
      st_distance(
        st_setsrid(st_makepoint(lon1::double precision, lat1::double precision), 4326)::geography,
        st_setsrid(st_makepoint(lon2::double precision, lat2::double precision), 4326)::geography
      ) / 1000.0
    )::numeric,
    3
  );
$$;

-- =========================================================
-- AUTH / ROLE HELPERS
-- =========================================================

create or replace function public.get_user_role(user_id uuid)
returns app_role
language sql
stable
security definer
set search_path = public
as $$
  select p.role
  from public.profiles p
  where p.id = user_id
  limit 1;
$$;

create or replace function public.user_has_role(required_roles app_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.get_user_role(auth.uid()) = any(required_roles), false);
$$;

-- =========================================================
-- OPERATIONAL FUNCTIONS
-- =========================================================

create or replace function public.find_nearest_available_ambulance(
  input_lat numeric,
  input_lng numeric,
  radius_km numeric default 50
)
returns table (
  ambulance_id text,
  distance_km numeric,
  driver_user_id uuid
)
language sql
stable
as $$
  with latest_tracking as (
    select distinct on (t.ambulance_id)
      t.ambulance_id,
      t.latitude,
      t.longitude,
      t.location
    from public.ambulance_tracking t
    order by t.ambulance_id, t."timestamp" desc
  )
  select
    a.ambulance_id,
    round(
      (
        st_distance(
          coalesce(
            lt.location,
            st_setsrid(st_makepoint(a.base_longitude::double precision, a.base_latitude::double precision), 4326)::geography
          ),
          st_setsrid(st_makepoint(input_lng::double precision, input_lat::double precision), 4326)::geography
        ) / 1000.0
      )::numeric,
      3
    ) as distance_km,
    ad.user_id as driver_user_id
  from public.ambulances a
  left join latest_tracking lt on lt.ambulance_id = a.ambulance_id
  left join public.ambulance_drivers ad
    on ad.ambulance_id = a.ambulance_id
   and ad.status in ('active','on-duty','on-call')
  where a.is_active = true
    and a.status = 'available'
    and (
      case
        when lt.location is not null then
          st_dwithin(
            lt.location,
            st_setsrid(st_makepoint(input_lng::double precision, input_lat::double precision), 4326)::geography,
            radius_km * 1000
          )
        when a.base_latitude is not null and a.base_longitude is not null then
          st_dwithin(
            st_setsrid(st_makepoint(a.base_longitude::double precision, a.base_latitude::double precision), 4326)::geography,
            st_setsrid(st_makepoint(input_lng::double precision, input_lat::double precision), 4326)::geography,
            radius_km * 1000
          )
        else false
      end
    )
  order by distance_km asc
  limit 1;
$$;

create or replace function public.dispatch_nearest_ambulance(report_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_report public.emergency_reports%rowtype;
  v_nearest record;
  v_dispatch_id uuid;
begin
  select * into v_report
  from public.emergency_reports
  where id = report_id
  for update;

  if not found then
    raise exception 'Emergency report % not found', report_id;
  end if;

  if v_report.status not in ('pending', 'dispatched') then
    raise exception 'Report % status % is not dispatchable', report_id, v_report.status;
  end if;

  select * into v_nearest
  from public.find_nearest_available_ambulance(v_report.latitude, v_report.longitude, 50);

  if v_nearest is null then
    raise exception 'No available ambulance found within radius';
  end if;

  insert into public.emergency_dispatches (
    emergency_report_id,
    ambulance_id,
    driver_id,
    dispatcher_id,
    dispatch_status,
    dispatch_time,
    distance_km,
    eta_minutes,
    route_data,
    notes
  )
  values (
    v_report.id,
    v_nearest.ambulance_id,
    v_nearest.driver_user_id,
    auth.uid(),
    'dispatched',
    now(),
    v_nearest.distance_km,
    greatest(1, ceil((v_nearest.distance_km / 40.0) * 60.0))::int,
    jsonb_build_object('auto_assigned', true, 'method', 'nearest_available'),
    'Auto-dispatched by dispatch_nearest_ambulance()'
  )
  returning id into v_dispatch_id;

  return v_dispatch_id;
end;
$$;

create or replace function public.calculate_response_analytics(report_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_report public.emergency_reports%rowtype;
  v_dispatch public.emergency_dispatches%rowtype;
  v_analytics_id uuid;
  v_dispatch_time_minutes int;
  v_travel_time_minutes int;
  v_response_time_minutes int;
  v_total_case_minutes int;
begin
  select * into v_report
  from public.emergency_reports
  where id = report_id;

  if not found then
    raise exception 'Emergency report % not found', report_id;
  end if;

  select * into v_dispatch
  from public.emergency_dispatches d
  where d.emergency_report_id = report_id
  order by d.created_at desc
  limit 1;

  if v_dispatch.id is null then
    raise exception 'No dispatch found for report %', report_id;
  end if;

  v_dispatch_time_minutes := case
    when v_dispatch.dispatch_time is not null
      then greatest(0, floor(extract(epoch from (v_dispatch.dispatch_time - v_report.created_at)) / 60))::int
    else null
  end;

  v_travel_time_minutes := case
    when v_dispatch.en_route_at is not null and v_dispatch.arrived_scene_at is not null
      then greatest(0, floor(extract(epoch from (v_dispatch.arrived_scene_at - v_dispatch.en_route_at)) / 60))::int
    else null
  end;

  v_response_time_minutes := case
    when v_dispatch.arrived_scene_at is not null
      then greatest(0, floor(extract(epoch from (v_dispatch.arrived_scene_at - v_report.created_at)) / 60))::int
    else null
  end;

  v_total_case_minutes := case
    when v_dispatch.completed_at is not null
      then greatest(0, floor(extract(epoch from (v_dispatch.completed_at - v_report.created_at)) / 60))::int
    else null
  end;

  insert into public.response_analytics (
    emergency_report_id,
    ambulance_id,
    response_time_minutes,
    dispatch_time_minutes,
    travel_time_minutes,
    total_case_minutes,
    sla_met,
    severity,
    emergency_type,
    created_at
  )
  values (
    report_id,
    v_dispatch.ambulance_id,
    v_response_time_minutes,
    v_dispatch_time_minutes,
    v_travel_time_minutes,
    v_total_case_minutes,
    case
      when v_response_time_minutes is null then null
      when v_report.severity = 'kritis' then v_response_time_minutes <= 10
      when v_report.severity = 'berat' then v_response_time_minutes <= 15
      when v_report.severity = 'sedang' then v_response_time_minutes <= 20
      else v_response_time_minutes <= 30
    end,
    v_report.severity,
    v_report.emergency_type,
    now()
  )
  on conflict (emergency_report_id)
  do update set
    ambulance_id = excluded.ambulance_id,
    response_time_minutes = excluded.response_time_minutes,
    dispatch_time_minutes = excluded.dispatch_time_minutes,
    travel_time_minutes = excluded.travel_time_minutes,
    total_case_minutes = excluded.total_case_minutes,
    sla_met = excluded.sla_met,
    severity = excluded.severity,
    emergency_type = excluded.emergency_type,
    created_at = now()
  returning id into v_analytics_id;

  return v_analytics_id;
end;
$$;

-- =========================================================
-- AUDIT FUNCTION
-- =========================================================

create or replace function public.create_audit_log_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_actor_role app_role;
  v_record_id uuid;
begin
  v_actor_id := auth.uid();
  v_actor_role := public.get_user_role(v_actor_id);

  if tg_op = 'INSERT' then
    v_record_id := new.id;
    insert into public.audit_logs (actor_id, actor_role, action, table_name, record_id, old_data, new_data, created_at)
    values (v_actor_id, v_actor_role, 'INSERT', tg_table_name, v_record_id, null, to_jsonb(new), now());
    return new;
  elsif tg_op = 'UPDATE' then
    v_record_id := new.id;
    insert into public.audit_logs (actor_id, actor_role, action, table_name, record_id, old_data, new_data, created_at)
    values (v_actor_id, v_actor_role, 'UPDATE', tg_table_name, v_record_id, to_jsonb(old), to_jsonb(new), now());
    return new;
  elsif tg_op = 'DELETE' then
    v_record_id := old.id;
    insert into public.audit_logs (actor_id, actor_role, action, table_name, record_id, old_data, new_data, created_at)
    values (v_actor_id, v_actor_role, 'DELETE', tg_table_name, v_record_id, to_jsonb(old), null, now());
    return old;
  end if;

  return null;
end;
$$;
