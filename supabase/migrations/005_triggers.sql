-- 005_triggers.sql
-- Harjo Emergency Response Platform

-- =========================================================
-- UPDATED_AT TRIGGERS
-- =========================================================

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.update_updated_at_column();

drop trigger if exists trg_emergency_reports_updated_at on public.emergency_reports;
create trigger trg_emergency_reports_updated_at
before update on public.emergency_reports
for each row execute function public.update_updated_at_column();

drop trigger if exists trg_ambulances_updated_at on public.ambulances;
create trigger trg_ambulances_updated_at
before update on public.ambulances
for each row execute function public.update_updated_at_column();

drop trigger if exists trg_ambulance_drivers_updated_at on public.ambulance_drivers;
create trigger trg_ambulance_drivers_updated_at
before update on public.ambulance_drivers
for each row execute function public.update_updated_at_column();

drop trigger if exists trg_emergency_dispatches_updated_at on public.emergency_dispatches;
create trigger trg_emergency_dispatches_updated_at
before update on public.emergency_dispatches
for each row execute function public.update_updated_at_column();

drop trigger if exists trg_equipment_tracking_updated_at on public.equipment_tracking;
create trigger trg_equipment_tracking_updated_at
before update on public.equipment_tracking
for each row execute function public.update_updated_at_column();

drop trigger if exists trg_resource_inventory_updated_at on public.resource_inventory;
create trigger trg_resource_inventory_updated_at
before update on public.resource_inventory
for each row execute function public.update_updated_at_column();

drop trigger if exists trg_notification_queue_updated_at on public.notification_queue;
create trigger trg_notification_queue_updated_at
before update on public.notification_queue
for each row execute function public.update_updated_at_column();

drop trigger if exists trg_push_subscriptions_updated_at on public.push_subscriptions;
create trigger trg_push_subscriptions_updated_at
before update on public.push_subscriptions
for each row execute function public.update_updated_at_column();

-- =========================================================
-- GEOGRAPHY TRIGGERS
-- =========================================================

drop trigger if exists trg_emergency_reports_set_geography on public.emergency_reports;
create trigger trg_emergency_reports_set_geography
before insert or update of latitude, longitude on public.emergency_reports
for each row execute function public.set_geography_from_lat_lng();

drop trigger if exists trg_ambulance_tracking_set_geography on public.ambulance_tracking;
create trigger trg_ambulance_tracking_set_geography
before insert or update of latitude, longitude on public.ambulance_tracking
for each row execute function public.set_geography_from_lat_lng();

-- =========================================================
-- AUDIT TRIGGERS
-- =========================================================

drop trigger if exists trg_audit_emergency_reports on public.emergency_reports;
create trigger trg_audit_emergency_reports
after insert or update or delete on public.emergency_reports
for each row execute function public.create_audit_log_trigger();

drop trigger if exists trg_audit_emergency_dispatches on public.emergency_dispatches;
create trigger trg_audit_emergency_dispatches
after insert or update or delete on public.emergency_dispatches
for each row execute function public.create_audit_log_trigger();

drop trigger if exists trg_audit_ambulances on public.ambulances;
create trigger trg_audit_ambulances
after insert or update or delete on public.ambulances
for each row execute function public.create_audit_log_trigger();

drop trigger if exists trg_audit_ambulance_tracking on public.ambulance_tracking;
create trigger trg_audit_ambulance_tracking
after insert or update or delete on public.ambulance_tracking
for each row execute function public.create_audit_log_trigger();

drop trigger if exists trg_audit_patient_monitoring on public.patient_monitoring;
create trigger trg_audit_patient_monitoring
after insert or update or delete on public.patient_monitoring
for each row execute function public.create_audit_log_trigger();

drop trigger if exists trg_audit_equipment_tracking on public.equipment_tracking;
create trigger trg_audit_equipment_tracking
after insert or update or delete on public.equipment_tracking
for each row execute function public.create_audit_log_trigger();

drop trigger if exists trg_audit_alert_broadcasts on public.alert_broadcasts;
create trigger trg_audit_alert_broadcasts
after insert or update or delete on public.alert_broadcasts
for each row execute function public.create_audit_log_trigger();

-- =========================================================
-- STATUS SYNC + ANALYTICS
-- =========================================================

create or replace function public.sync_dispatch_status_to_entities()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.dispatch_status is distinct from old.dispatch_status then
    -- emergency report status sync
    update public.emergency_reports
    set status = case new.dispatch_status
      when 'pending' then 'pending'::emergency_status
      when 'dispatched' then 'dispatched'::emergency_status
      when 'accepted' then 'accepted'::emergency_status
      when 'en_route' then 'en_route'::emergency_status
      when 'arrived' then 'on_scene'::emergency_status
      when 'completed' then 'completed'::emergency_status
      when 'cancelled' then 'cancelled'::emergency_status
      else status
    end,
    completed_at = case when new.dispatch_status = 'completed' then coalesce(new.completed_at, now()) else completed_at end,
    updated_at = now()
    where id = new.emergency_report_id;

    -- ambulance status sync
    if new.ambulance_id is not null then
      update public.ambulances
      set status = case new.dispatch_status
        when 'pending' then 'available'::ambulance_status
        when 'dispatched' then 'dispatched'::ambulance_status
        when 'accepted' then 'en_route'::ambulance_status
        when 'en_route' then 'en_route'::ambulance_status
        when 'arrived' then 'on_scene'::ambulance_status
        when 'completed' then 'available'::ambulance_status
        when 'cancelled' then 'available'::ambulance_status
        else status
      end,
      updated_at = now()
      where ambulance_id = new.ambulance_id;
    end if;

  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_dispatch_status on public.emergency_dispatches;
create trigger trg_sync_dispatch_status
after update of dispatch_status on public.emergency_dispatches
for each row execute function public.sync_dispatch_status_to_entities();

create or replace function public.analytics_on_dispatch_completion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.dispatch_status = 'completed' and (old.dispatch_status is distinct from new.dispatch_status) then
    perform public.calculate_response_analytics(new.emergency_report_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_analytics_on_dispatch_completion on public.emergency_dispatches;
create trigger trg_analytics_on_dispatch_completion
after update of dispatch_status on public.emergency_dispatches
for each row execute function public.analytics_on_dispatch_completion();
