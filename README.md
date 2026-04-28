# Harjo Emergency Response Platform Monorepo

Monorepo ini membangun 3 produk mission-critical dalam 1 ekosistem:
- `apps/emergency-mobile` — Harjo Emergency App (pelapor/personel/pasien internal).
- `apps/ambulance-mobile` — Harjo Ambulance / Medical Response App.
- `apps/command-monitor` — Harjo Command Monitor (dispatcher/admin/command center).

## Stack Utama
- React 18 + TypeScript strict + Vite.
- Tailwind CSS + komponen reusable `@harjo/ui` (shadcn-friendly architecture).
- React Router DOM.
- TanStack React Query.
- Supabase (Auth, Database/PostgreSQL, Realtime, Storage, Edge Functions).
- Struktur siap untuk Leaflet/Mapbox lazy-loading.
- PWA-ready dan Capacitor-ready (Android/iOS) melalui konfigurasi per-app.

## Struktur Monorepo

```txt
apps/
  emergency-mobile/
  ambulance-mobile/
  command-monitor/
packages/
  ui/
  types/
  lib/
supabase/
  migrations/
  functions/
```

## Routing
- `/emergency-mobile`
- `/ambulance-mobile`
- `/command-monitor`
- `/auth`
- `/not-found`

## Domain Hooks (`@harjo/lib`)
- `useAuth`
- `useUserRole`
- `useGeolocation`
- `useEmergencyReports`
- `useDispatch`
- `useAmbulanceTracking`
- `usePatientMonitoring`
- `useTeamChat`
- `useNotifications`
- `useOfflineSync`
- `useRealtimeSubscriptions`

## Setup Lokal
1. Install dependency:
   ```bash
   pnpm install
   ```
2. Tambahkan env di setiap app (`apps/*/.env`):
   ```bash
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```
3. Jalankan dev semua app:
   ```bash
   pnpm dev
   ```
4. Typecheck:
   ```bash
   pnpm typecheck
   ```

## Supabase
### Migration
- `supabase/migrations/202604280001_init.sql` — schema inti.
- `supabase/migrations/202604280002_seed_demo.sql` — seed demo.
- `supabase/migrations/202604280003_locations_realtime.sql` — tabel `locations` untuk realtime tracking.

### Edge Functions
- `dispatch-nearest-ambulance`
- `send-push-notification`
- `voice-to-text`
- `sync-offline-actions`

## Seed Data Demo
Gunakan migration seed `202604280002_seed_demo.sql` untuk menyiapkan data awal demo dashboard, emergency reports, tracking, dan chat.

## Catatan UX/Operasional
- Bahasa UI Indonesia singkat dan jelas.
- Emergency CTA menonjol pada mobile pelapor.
- Status online/offline, GPS, notifikasi, dan alur status insiden selalu terlihat.
- Safe touch target minimum 44px di mobile.
- Warna merah dipakai terbatas untuk kondisi kritis.
- Offline action di-app ambulans disimpan ke `sync_queue`.

## Next Hardening
- Integrasi map production (Leaflet/Mapbox + cluster + route engine).
- Implement service worker PWA dan background sync.
- Integrasi Capacitor config + native permission prompt flow.
- RLS policy final per role (reporter, ambulance_driver, paramedic, doctor, dispatcher, admin, super_admin).
- E2E test untuk skenario panic-flow dan dispatch-flow.
