create or replace function public.nearest_available_ambulance_realtime(
  p_latitude double precision,
  p_longitude double precision,
  p_limit int default 3,
  p_max_distance_km numeric default 30
)
returns table (
  ambulance_id text,
  driver_id uuid,
  distance_km numeric,
  eta_minutes int,
  last_seen timestamptz
)
language sql
security definer
set search_path = public
as $$
  with reference_location as (
    select st_setsrid(st_makepoint(p_longitude, p_latitude), 4326)::geography as point
  ),
  latest_tracking as (
    select distinct on (at.ambulance_id)
      at.ambulance_id,
      at.driver_id,
      at.location,
      at.updated_at
    from ambulance_tracking at
    order by at.ambulance_id, at.updated_at desc
  )
  select
    a.id as ambulance_id,
    lt.driver_id,
    round((st_distance(lt.location, rl.point) / 1000.0)::numeric, 2) as distance_km,
    greatest(2, ceil(st_distance(lt.location, rl.point) / 1000.0 / 0.55)::int) as eta_minutes,
    lt.updated_at as last_seen
  from ambulances a
  join latest_tracking lt on lt.ambulance_id = a.id
  cross join reference_location rl
  where a.is_active = true
    and a.status = 'available'
    and coalesce(a.equipment_ready, false) = true
    and lt.updated_at > now() - interval '2 minutes'
    and st_distance(lt.location, rl.point) <= p_max_distance_km * 1000
  order by st_distance(lt.location, rl.point) asc
  limit greatest(p_limit, 1);
$$;

grant execute on function public.nearest_available_ambulance_realtime(double precision,double precision,int,numeric) to authenticated;
