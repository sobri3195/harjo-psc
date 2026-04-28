# Harjo Emergency Response Platform — Backend Architecture (Supabase)

## 1) Arsitektur End-to-End

- **Client Apps**:
  - `Emergency Mobile App`: create report, anonymous session, live location pelapor.
  - `Ambulance Mobile App`: menerima dispatch, update status, update GPS, patient monitoring, team chat.
  - `Command Monitor Web`: triage, dispatching, broadcast alert, analytics, audit tracking.
- **Backend**: Supabase Auth + PostgreSQL + RLS + Realtime + Edge Functions.
- **Security model**: seluruh tabel critical `RLS enabled`, tanpa policy publik.
- **Dispatch model**:
  1. client insert `emergency_reports`.
  2. dispatcher/auto-flow invoke `dispatch-nearest-ambulance`.
  3. DB function `dispatch_nearest_ambulance()` memilih unit paling dekat dari `ambulances.current_location` + readiness.
  4. sistem membuat `emergency_dispatches`, update status report & ambulance, update member case.

## 2) Domain Data Model

### Authentication & Role
- `profiles`: role utama (`reporter`, `ambulance_driver`, `paramedic`, `doctor`, `dispatcher`, `admin`, `super_admin`).
- `anonymous_emergency_sessions`: sesi emergency anonim yang dibatasi.

### Core Incident & Dispatch
- `emergency_reports`: insiden utama + SLA timestamps.
- `emergency_dispatches`: assignment ambulance per insiden.
- `emergency_case_members`: daftar user yang authorized per kasus.

### Fleet & Tracking
- `ambulances`: state armada + location teraktual.
- `ambulance_driver_assignments`: assignment driver aktif.
- `ambulance_tracking`: log telemetry berfrekuensi tinggi.
- `locations`: generic location stream (reporter/ambulans/case).
- `ambulance_equipment`: readiness resource medis.

### Medical & Collaboration
- `patient_monitoring`: vital signs + treatment notes.
- `team_chat`: komunikasi realtime per case.

### Ops, Notification, Analytics
- `alert_broadcasts`: pengumuman massal command center.
- `notification_queue`: queue push notification.
- `sync_queue`: offline queue dari mobile app.
- `audit_logs`: immutable audit untuk perubahan kritis.
- `analytics_daily_emergency_metrics` (materialized view): metrik dashboard harian.

## 3) RLS dan Boundary Security

- **Reporter**: dapat create report; read/update terbatas pada report milik sendiri / case member.
- **Anonymous session**: hanya insert report/location via flow terkontrol (service edge dengan token session).
- **Driver**: hanya update telemetry armada yang di-assign ke dirinya.
- **Paramedic/Doctor**: update patient monitoring jika terdaftar sebagai case member.
- **Dispatcher/Admin**: read/write aktif untuk operasi dispatch.
- **Super admin**: governance role/settings.
- **Audit log**: select hanya admin/super_admin.

## 4) Realtime Channels

Realtime publication digunakan untuk:
- `emergency_reports` (INSERT/UPDATE)
- `ambulance_tracking` (INSERT/UPDATE)
- `emergency_dispatches` (INSERT/UPDATE)
- `locations` (INSERT/UPDATE)
- `patient_monitoring` (INSERT)
- `team_chat` (INSERT)
- `alert_broadcasts` (INSERT)
- `notification_queue` (INSERT/UPDATE)

## 5) Edge Functions

1. `dispatch-nearest-ambulance`
   - call RPC `dispatch_nearest_ambulance`.
   - return `dispatch_id`, `ambulance_id`, `eta_minutes`, `distance_km`, `status`.
2. `send-push-notification`
   - resolve target users by `target_user_ids` atau `target_role`.
   - insert queue ke `notification_queue`.
3. `voice-to-text`
   - endpoint transkripsi (placeholder ASR provider ready).
   - output transkripsi + severity/type inference.
4. `update-ambulance-location`
   - insert telemetry ke `ambulance_tracking`.
   - trigger DB otomatis update `ambulances.current_location`.
5. `sync-offline-actions`
   - commit offline actions satu per satu.
   - hasil per action: success/failed/conflict.

> Secrets hanya dari environment (`SUPABASE_SERVICE_ROLE_KEY`, API provider keys). Tidak ada hardcoded service-role key di frontend.

## 6) Retention Policy

Function `apply_retention_policies()`:
- `locations`: 30 hari.
- `team_chat`: 1 tahun.
- `notification_queue`: 90 hari.
- `emergency_reports`: 5 tahun.
- `audit_logs`: 5 tahun.

Jalankan via `pg_cron`/external scheduler (harian dini hari).

## 7) Frontend Integration (React hooks)

Hook yang disediakan di `@harjo/lib`:
- `useEmergencyReports(page, pageSize)`.
- `useDispatchNearestAmbulance()`.
- `useSendPushNotification()`.
- `useVoiceToText()`.
- `useUpdateAmbulanceLocation()`.
- `useOfflineSync()`.
- `useRealtimeSubscriptions()` untuk invalidasi cache ketika channel update.

## 8) Testing Checklist

### Database
- [ ] Migration apply clean di environment baru.
- [ ] RLS test matrix per role (reporter/driver/paramedic/dispatcher/admin/super_admin/anonymous).
- [ ] Driver tidak bisa update ambulance lain.
- [ ] Paramedic/doctor tidak bisa update patient_monitoring jika bukan case member.
- [ ] Anonymous tidak bisa read report list.
- [ ] Trigger audit menulis log untuk INSERT/UPDATE/DELETE tabel kritis.
- [ ] `dispatch_nearest_ambulance` memilih unit terdekat + equipment_ready + driver aktif.

### Edge Functions
- [ ] dispatch function sukses untuk payload valid.
- [ ] dispatch function gagal ketika tidak ada unit available.
- [ ] send notification target role menghasilkan queue records.
- [ ] update location menghasilkan tracking row.
- [ ] sync offline menghasilkan status per item.

### Realtime
- [ ] Dashboard menerima update `emergency_reports` dan `emergency_dispatches`.
- [ ] Ambulance app menerima update task status real-time.
- [ ] Team chat stream masuk tanpa full refresh.

### Performance
- [ ] EXPLAIN ANALYZE untuk query list reports by status/severity.
- [ ] EXPLAIN ANALYZE proximity query menggunakan GIST index.
- [ ] Pagination diterapkan pada reports/logs/notifications.
