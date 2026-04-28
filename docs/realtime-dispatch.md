# Realtime Dispatch Implementation Notes

## Hooks

- `useRealtimeEmergencyReports()`
  - Supabase Realtime subscription untuk `INSERT` dan `UPDATE` pada `emergency_reports`.
  - Sorting severity (`kritis > berat > sedang > ringan`) lalu `created_at` terbaru.
  - Callback `onCritical(report)` untuk trigger toast UI.
  - Auto-cleanup channel saat unmount.

- `useRealtimeAmbulanceTracking()`
  - Subscription realtime ke `ambulance_tracking`.
  - Throttle update marker dengan `setTimeout`.
  - Simpan `lastSeen` dari `updated_at` dan expose `isOffline` setelah > 30 detik.

- `useDispatchNearestAmbulance()`
  - Invoke Edge Function `dispatch-nearest-ambulance`.
  - Optimistic update: status report menjadi `dispatching` saat mutation berjalan.
  - Rollback otomatis jika dispatch gagal.

- `useEmergencyTimeline(emergencyId)`
  - Gabungkan event dari `emergency_reports` + `emergency_dispatches`.
  - Status timeline: Reported → Dispatching → Assigned → En Route → On Scene → Transporting → Completed.

- `useOfflineSync()`
  - Saat offline, simpan action ke localStorage `harjo.sync_queue.v1`.
  - Saat online, sinkronisasi via Edge Function `sync-offline-actions`.
  - Conflict ditampilkan melalui field `conflicts` (strategi server-wins untuk stale update).

## Edge Function flow

`dispatch-nearest-ambulance` sekarang:
1. Validasi payload + bearer token.
2. RPC `nearest_available_ambulance_realtime` untuk preview kandidat realtime sesuai radius severity.
3. RPC `dispatch_nearest_ambulance` untuk write dispatch final.
4. Return `ambulance_id`, `distance_km`, `eta_minutes`, `dispatch_id`, `status`.

## SQL Function

`nearest_available_ambulance_realtime(...)`:
- Menggunakan lokasi tracking paling baru (`distinct on ambulance_id`).
- Filter:
  - Ambulance aktif, status `available`, equipment siap.
  - Tracking masih fresh (`updated_at > now() - 2 minutes`).
  - Dalam radius `p_max_distance_km`.
- Return `distance_km`, estimasi ETA, dan `last_seen`.

## Security notes

- Tetap gunakan RLS sebagai garis pertahanan utama; Edge Function hanya delegasi ke RPC yang sudah dibatasi role.
- Wajib kirim bearer token di Edge Function dispatch.
- Jangan expose service role key di client.
- Audit dispatch di tabel `audit_logs` untuk forensik insiden.
- Untuk conflict offline sync, tampilkan opsi operator: retry, accept server state, atau manual merge.
