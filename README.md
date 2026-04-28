# Harjo Emergency Response Platform Monorepo

Monorepo ini menyiapkan 3 produk dalam 1 ekosistem:
- `apps/emergency-mobile` — Harjo Emergency App (pelapor/pasien internal)
- `apps/ambulance-mobile` — Harjo Ambulance / Medical Response App
- `apps/command-monitor` — Harjo Command Monitor (dispatcher/admin)

## Stack
- React 18 + TypeScript strict + Vite
- React Router DOM
- TanStack React Query
- Supabase Auth / Postgres / Realtime / Storage / Edge Functions
- Paket bersama: `@harjo/ui`, `@harjo/types`, `@harjo/lib`

## Struktur

```
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

## Setup lokal
1. Install dependency:
   ```bash
   pnpm install
   ```
2. Buat `.env` pada masing-masing app:
   ```bash
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```
3. Jalankan development:
   ```bash
   pnpm dev
   ```

## Routing utama
- `/emergency-mobile`
- `/ambulance-mobile`
- `/command-monitor`
- `/auth`
- `/not-found`

## Supabase
- Migration schema dasar ada di `supabase/migrations/202604280001_init.sql`
- Seed demo ada di `supabase/migrations/202604280002_seed_demo.sql`
- Edge Functions:
  - `dispatch-nearest-ambulance`
  - `send-push-notification`
  - `voice-to-text`
  - `sync-offline-actions`

## Hooks domain (`@harjo/lib`)
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

## Catatan UX
- Default light mode professional, fokus keterbacaan saat panik.
- Touch target minimum 44px untuk tombol kritikal.
- Emergency CTA ditempatkan menonjol di aplikasi mobile pelapor.
- Realtime subscription sudah disiapkan untuk tabel inti operasi command center.

## Tahap lanjutan yang disarankan
- Integrasi map (Leaflet/Mapbox) per app dengan lazy loading.
- PWA manifest + service worker + strategi offline cache.
- Capacitor config untuk Android/iOS build.
- Hardening RLS policy per role dan audit trails lebih detail.
- Komponen shadcn/ui penuh + Tailwind token design system.
