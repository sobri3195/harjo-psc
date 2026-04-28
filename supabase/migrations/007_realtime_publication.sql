-- 007_realtime_publication.sql
-- Harjo Emergency Response Platform

-- =========================================================
-- REPLICA IDENTITY FULL FOR IMPORTANT TABLES
-- =========================================================

alter table public.emergency_reports replica identity full;
alter table public.ambulance_tracking replica identity full;
alter table public.emergency_dispatches replica identity full;
alter table public.patient_monitoring replica identity full;
alter table public.team_chat replica identity full;
alter table public.alert_broadcasts replica identity full;
alter table public.notification_queue replica identity full;
alter table public.ambulances replica identity full;
alter table public.equipment_tracking replica identity full;

-- =========================================================
-- SUPABASE REALTIME PUBLICATION
-- =========================================================

do $$
begin
  begin
    alter publication supabase_realtime add table public.emergency_reports;
  exception when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.ambulance_tracking;
  exception when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.emergency_dispatches;
  exception when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.patient_monitoring;
  exception when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.team_chat;
  exception when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.alert_broadcasts;
  exception when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.notification_queue;
  exception when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.ambulances;
  exception when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.equipment_tracking;
  exception when duplicate_object then null;
  end;
end
$$;
