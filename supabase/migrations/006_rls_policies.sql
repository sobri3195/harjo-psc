-- 006_rls_policies.sql
-- Harjo Emergency Response Platform

-- =========================================================
-- ENABLE RLS
-- =========================================================

alter table public.profiles enable row level security;
alter table public.emergency_reports enable row level security;
alter table public.ambulances enable row level security;
alter table public.ambulance_tracking enable row level security;
alter table public.emergency_dispatches enable row level security;
alter table public.patient_monitoring enable row level security;
alter table public.team_chat enable row level security;
alter table public.equipment_tracking enable row level security;
alter table public.alert_broadcasts enable row level security;
alter table public.audit_logs enable row level security;
alter table public.notification_queue enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.resource_inventory enable row level security;
alter table public.sync_queue enable row level security;
alter table public.response_analytics enable row level security;
alter table public.ambulance_drivers enable row level security;

-- =========================================================
-- PROFILES
-- =========================================================

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
for select to authenticated
using (id = auth.uid());

drop policy if exists profiles_select_active_admin_dispatcher on public.profiles;
create policy profiles_select_active_admin_dispatcher on public.profiles
for select to authenticated
using (
  is_active = true
  and public.user_has_role(array['admin'::app_role, 'dispatcher'::app_role, 'super_admin'::app_role])
);

drop policy if exists profiles_update_own_non_role on public.profiles;
create policy profiles_update_own_non_role on public.profiles
for update to authenticated
using (id = auth.uid())
with check (id = auth.uid() and role = (select p.role from public.profiles p where p.id = auth.uid()));

drop policy if exists profiles_super_admin_update_role on public.profiles;
create policy profiles_super_admin_update_role on public.profiles
for update to authenticated
using (public.user_has_role(array['super_admin'::app_role]))
with check (public.user_has_role(array['super_admin'::app_role]));

-- =========================================================
-- EMERGENCY REPORTS
-- =========================================================

drop policy if exists emergency_reports_insert_reporter on public.emergency_reports;
create policy emergency_reports_insert_reporter on public.emergency_reports
for insert to authenticated
with check (reporter_id = auth.uid());

drop policy if exists emergency_reports_select_own on public.emergency_reports;
create policy emergency_reports_select_own on public.emergency_reports
for select to authenticated
using (reporter_id = auth.uid());

drop policy if exists emergency_reports_select_dispatcher_admin on public.emergency_reports;
create policy emergency_reports_select_dispatcher_admin on public.emergency_reports
for select to authenticated
using (public.user_has_role(array['dispatcher'::app_role, 'admin'::app_role, 'super_admin'::app_role]));

drop policy if exists emergency_reports_select_assigned_medical_driver on public.emergency_reports;
create policy emergency_reports_select_assigned_medical_driver on public.emergency_reports
for select to authenticated
using (
  exists (
    select 1
    from public.emergency_dispatches d
    where d.emergency_report_id = emergency_reports.id
      and (
        d.driver_id = auth.uid()
        or d.dispatcher_id = auth.uid()
      )
  )
  or (
    public.user_has_role(array['doctor'::app_role, 'paramedic'::app_role])
    and exists (
      select 1
      from public.team_chat tc
      where tc.emergency_report_id = emergency_reports.id
        and tc.sender_id = auth.uid()
    )
  )
);

drop policy if exists emergency_reports_update_status_dispatcher_admin on public.emergency_reports;
create policy emergency_reports_update_status_dispatcher_admin on public.emergency_reports
for update to authenticated
using (public.user_has_role(array['dispatcher'::app_role, 'admin'::app_role, 'super_admin'::app_role]))
with check (public.user_has_role(array['dispatcher'::app_role, 'admin'::app_role, 'super_admin'::app_role]));

drop policy if exists emergency_reports_cancel_own_pending on public.emergency_reports;
create policy emergency_reports_cancel_own_pending on public.emergency_reports
for update to authenticated
using (
  reporter_id = auth.uid()
  and status = 'pending'
  and created_at >= now() - interval '15 minutes'
)
with check (
  reporter_id = auth.uid()
  and status = 'cancelled'
);

-- =========================================================
-- AMBULANCES
-- =========================================================

drop policy if exists ambulances_select_active_authenticated on public.ambulances;
create policy ambulances_select_active_authenticated on public.ambulances
for select to authenticated
using (is_active = true and auth.uid() is not null);

drop policy if exists ambulances_select_assigned_driver on public.ambulances;
create policy ambulances_select_assigned_driver on public.ambulances
for select to authenticated
using (
  exists (
    select 1
    from public.ambulance_drivers ad
    where ad.ambulance_id = ambulances.ambulance_id
      and ad.user_id = auth.uid()
  )
);

drop policy if exists ambulances_manage_dispatcher_admin on public.ambulances;
create policy ambulances_manage_dispatcher_admin on public.ambulances
for all to authenticated
using (public.user_has_role(array['dispatcher'::app_role, 'admin'::app_role, 'super_admin'::app_role]))
with check (public.user_has_role(array['dispatcher'::app_role, 'admin'::app_role, 'super_admin'::app_role]));

-- =========================================================
-- AMBULANCE TRACKING
-- =========================================================

drop policy if exists tracking_insert_update_driver_assigned on public.ambulance_tracking;
create policy tracking_insert_update_driver_assigned on public.ambulance_tracking
for all to authenticated
using (
  exists (
    select 1
    from public.ambulance_drivers ad
    where ad.user_id = auth.uid()
      and ad.ambulance_id = ambulance_tracking.ambulance_id
  )
)
with check (
  exists (
    select 1
    from public.ambulance_drivers ad
    where ad.user_id = auth.uid()
      and ad.ambulance_id = ambulance_tracking.ambulance_id
  )
);

drop policy if exists tracking_select_dispatcher_admin on public.ambulance_tracking;
create policy tracking_select_dispatcher_admin on public.ambulance_tracking
for select to authenticated
using (public.user_has_role(array['dispatcher'::app_role, 'admin'::app_role, 'super_admin'::app_role]));

drop policy if exists tracking_select_reporter_assigned on public.ambulance_tracking;
create policy tracking_select_reporter_assigned on public.ambulance_tracking
for select to authenticated
using (
  exists (
    select 1
    from public.emergency_reports er
    join public.emergency_dispatches ed on ed.emergency_report_id = er.id
    where er.reporter_id = auth.uid()
      and ed.ambulance_id = ambulance_tracking.ambulance_id
      and er.status not in ('completed', 'cancelled')
  )
);

-- =========================================================
-- EMERGENCY DISPATCHES
-- =========================================================

drop policy if exists dispatches_manage_dispatcher_admin on public.emergency_dispatches;
create policy dispatches_manage_dispatcher_admin on public.emergency_dispatches
for all to authenticated
using (public.user_has_role(array['dispatcher'::app_role, 'admin'::app_role, 'super_admin'::app_role]))
with check (public.user_has_role(array['dispatcher'::app_role, 'admin'::app_role, 'super_admin'::app_role]));

drop policy if exists dispatches_select_update_assigned_driver_paramedic on public.emergency_dispatches;
create policy dispatches_select_update_assigned_driver_paramedic on public.emergency_dispatches
for select to authenticated
using (
  driver_id = auth.uid()
  or (
    public.user_has_role(array['paramedic'::app_role])
    and exists (
      select 1 from public.emergency_reports er
      where er.id = emergency_dispatches.emergency_report_id
        and (
          er.reporter_id = auth.uid()
          or exists (
            select 1 from public.team_chat tc
            where tc.emergency_report_id = er.id and tc.sender_id = auth.uid()
          )
        )
    )
  )
);

drop policy if exists dispatches_update_assigned_driver_paramedic on public.emergency_dispatches;
create policy dispatches_update_assigned_driver_paramedic on public.emergency_dispatches
for update to authenticated
using (
  driver_id = auth.uid()
  or public.user_has_role(array['paramedic'::app_role])
)
with check (
  driver_id = auth.uid()
  or public.user_has_role(array['paramedic'::app_role])
);

drop policy if exists dispatches_select_reporter on public.emergency_dispatches;
create policy dispatches_select_reporter on public.emergency_dispatches
for select to authenticated
using (
  exists (
    select 1
    from public.emergency_reports er
    where er.id = emergency_dispatches.emergency_report_id
      and er.reporter_id = auth.uid()
  )
);

-- =========================================================
-- PATIENT MONITORING
-- =========================================================

drop policy if exists patient_monitoring_insert_assigned_medical on public.patient_monitoring;
create policy patient_monitoring_insert_assigned_medical on public.patient_monitoring
for insert to authenticated
with check (
  public.user_has_role(array['doctor'::app_role, 'paramedic'::app_role])
  and (
    recorded_by = auth.uid()
    or recorded_by is null
  )
);

drop policy if exists patient_monitoring_read_admin_dispatcher on public.patient_monitoring;
create policy patient_monitoring_read_admin_dispatcher on public.patient_monitoring
for select to authenticated
using (public.user_has_role(array['admin'::app_role, 'dispatcher'::app_role, 'super_admin'::app_role]));

drop policy if exists patient_monitoring_read_reporter_own_case on public.patient_monitoring;
create policy patient_monitoring_read_reporter_own_case on public.patient_monitoring
for select to authenticated
using (
  exists (
    select 1
    from public.emergency_reports er
    where er.id = patient_monitoring.emergency_report_id
      and er.reporter_id = auth.uid()
  )
);

-- =========================================================
-- TEAM CHAT
-- =========================================================

drop policy if exists team_chat_read_write_admin_dispatcher on public.team_chat;
create policy team_chat_read_write_admin_dispatcher on public.team_chat
for all to authenticated
using (public.user_has_role(array['admin'::app_role, 'dispatcher'::app_role, 'super_admin'::app_role]))
with check (public.user_has_role(array['admin'::app_role, 'dispatcher'::app_role, 'super_admin'::app_role]));

drop policy if exists team_chat_read_write_involved_users on public.team_chat;
create policy team_chat_read_write_involved_users on public.team_chat
for all to authenticated
using (
  sender_id = auth.uid()
  or exists (
    select 1
    from public.emergency_reports er
    left join public.emergency_dispatches ed on ed.emergency_report_id = er.id
    where er.id = team_chat.emergency_report_id
      and (
        er.reporter_id = auth.uid()
        or ed.driver_id = auth.uid()
      )
  )
)
with check (
  sender_id = auth.uid()
  and (
    exists (
      select 1
      from public.emergency_reports er
      left join public.emergency_dispatches ed on ed.emergency_report_id = er.id
      where er.id = team_chat.emergency_report_id
        and (
          er.reporter_id = auth.uid()
          or ed.driver_id = auth.uid()
          or public.user_has_role(array['doctor'::app_role, 'paramedic'::app_role])
        )
    )
  )
);

-- =========================================================
-- EQUIPMENT TRACKING
-- =========================================================

drop policy if exists equipment_read_manage_admin_dispatcher on public.equipment_tracking;
create policy equipment_read_manage_admin_dispatcher on public.equipment_tracking
for all to authenticated
using (public.user_has_role(array['admin'::app_role, 'dispatcher'::app_role, 'super_admin'::app_role]))
with check (public.user_has_role(array['admin'::app_role, 'dispatcher'::app_role, 'super_admin'::app_role]));

drop policy if exists equipment_update_driver_assigned on public.equipment_tracking;
create policy equipment_update_driver_assigned on public.equipment_tracking
for update to authenticated
using (
  exists (
    select 1
    from public.ambulance_drivers ad
    where ad.user_id = auth.uid()
      and ad.ambulance_id = equipment_tracking.ambulance_id
  )
)
with check (
  exists (
    select 1
    from public.ambulance_drivers ad
    where ad.user_id = auth.uid()
      and ad.ambulance_id = equipment_tracking.ambulance_id
  )
);

-- =========================================================
-- ALERT BROADCASTS
-- =========================================================

drop policy if exists alerts_read_targeted on public.alert_broadcasts;
create policy alerts_read_targeted on public.alert_broadcasts
for select to authenticated
using (
  auth.uid() is not null
  and (expires_at is null or expires_at > now())
  and (
    target_role is null
    or target_role = public.get_user_role(auth.uid())
    or public.user_has_role(array['admin'::app_role, 'dispatcher'::app_role, 'super_admin'::app_role])
  )
);

drop policy if exists alerts_create_admin_dispatcher on public.alert_broadcasts;
create policy alerts_create_admin_dispatcher on public.alert_broadcasts
for insert to authenticated
with check (public.user_has_role(array['admin'::app_role, 'dispatcher'::app_role, 'super_admin'::app_role]));

-- =========================================================
-- AUDIT LOGS
-- =========================================================

drop policy if exists audit_logs_read_admin_super_admin on public.audit_logs;
create policy audit_logs_read_admin_super_admin on public.audit_logs
for select to authenticated
using (public.user_has_role(array['admin'::app_role, 'super_admin'::app_role]));

-- =========================================================
-- SUPPORTING TABLES
-- =========================================================

drop policy if exists notification_queue_select_own_or_admin on public.notification_queue;
create policy notification_queue_select_own_or_admin on public.notification_queue
for select to authenticated
using (user_id = auth.uid() or public.user_has_role(array['admin'::app_role, 'dispatcher'::app_role, 'super_admin'::app_role]));

drop policy if exists notification_queue_manage_admin_dispatcher on public.notification_queue;
create policy notification_queue_manage_admin_dispatcher on public.notification_queue
for all to authenticated
using (public.user_has_role(array['admin'::app_role, 'dispatcher'::app_role, 'super_admin'::app_role]))
with check (public.user_has_role(array['admin'::app_role, 'dispatcher'::app_role, 'super_admin'::app_role]));

drop policy if exists push_subscriptions_own on public.push_subscriptions;
create policy push_subscriptions_own on public.push_subscriptions
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists ambulance_drivers_read_admin_dispatcher on public.ambulance_drivers;
create policy ambulance_drivers_read_admin_dispatcher on public.ambulance_drivers
for select to authenticated
using (public.user_has_role(array['admin'::app_role, 'dispatcher'::app_role, 'super_admin'::app_role]));

drop policy if exists ambulance_drivers_own on public.ambulance_drivers;
create policy ambulance_drivers_own on public.ambulance_drivers
for select to authenticated
using (user_id = auth.uid());

drop policy if exists resource_inventory_admin_dispatcher on public.resource_inventory;
create policy resource_inventory_admin_dispatcher on public.resource_inventory
for all to authenticated
using (public.user_has_role(array['admin'::app_role, 'dispatcher'::app_role, 'super_admin'::app_role]))
with check (public.user_has_role(array['admin'::app_role, 'dispatcher'::app_role, 'super_admin'::app_role]));

drop policy if exists sync_queue_own_or_admin on public.sync_queue;
create policy sync_queue_own_or_admin on public.sync_queue
for all to authenticated
using (user_id = auth.uid() or public.user_has_role(array['admin'::app_role, 'dispatcher'::app_role, 'super_admin'::app_role]))
with check (user_id = auth.uid() or public.user_has_role(array['admin'::app_role, 'dispatcher'::app_role, 'super_admin'::app_role]));

drop policy if exists response_analytics_admin_dispatcher on public.response_analytics;
create policy response_analytics_admin_dispatcher on public.response_analytics
for select to authenticated
using (public.user_has_role(array['admin'::app_role, 'dispatcher'::app_role, 'super_admin'::app_role]));
