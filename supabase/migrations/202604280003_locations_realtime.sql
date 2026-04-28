create table if not exists locations (
  id uuid primary key default uuid_generate_v4(),
  emergency_id uuid references emergency_reports(id) on delete cascade,
  ambulance_id text,
  source text not null default 'gps',
  latitude double precision not null,
  longitude double precision not null,
  accuracy_meters numeric(8,2),
  recorded_at timestamptz not null default now()
);

alter publication supabase_realtime add table locations;
