-- 003_indexes.sql
-- Harjo Emergency Response Platform

-- =========================================================
-- INDEXES FOR DASHBOARD / REALTIME / OPERATIONAL QUERIES
-- =========================================================

create index if not exists idx_emergency_reports_status_created_at
  on public.emergency_reports(status, created_at desc);

create index if not exists idx_emergency_reports_severity_status
  on public.emergency_reports(severity, status);

create index if not exists idx_emergency_reports_reporter_id
  on public.emergency_reports(reporter_id);

create index if not exists idx_emergency_reports_location_gist
  on public.emergency_reports using gist(location);

create index if not exists idx_ambulance_tracking_ambulance_timestamp
  on public.ambulance_tracking(ambulance_id, "timestamp" desc);

create index if not exists idx_ambulance_tracking_location_gist
  on public.ambulance_tracking using gist(location);

create index if not exists idx_emergency_dispatches_report_id
  on public.emergency_dispatches(emergency_report_id);

create index if not exists idx_emergency_dispatches_ambulance_status
  on public.emergency_dispatches(ambulance_id, dispatch_status);

create index if not exists idx_patient_monitoring_report_recorded
  on public.patient_monitoring(emergency_report_id, recorded_at desc);

create index if not exists idx_team_chat_report_created_at
  on public.team_chat(emergency_report_id, created_at);

create index if not exists idx_notification_queue_user_status_created
  on public.notification_queue(user_id, status, created_at);

create index if not exists idx_audit_logs_table_record_created
  on public.audit_logs(table_name, record_id, created_at desc);

create index if not exists idx_response_analytics_created_severity_type
  on public.response_analytics(created_at desc, severity, emergency_type);

-- Additional practical indexes
create index if not exists idx_ambulances_status_active
  on public.ambulances(status, is_active);

create index if not exists idx_equipment_tracking_ambulance
  on public.equipment_tracking(ambulance_id, status);

create index if not exists idx_sync_queue_status_created
  on public.sync_queue(status, created_at);
