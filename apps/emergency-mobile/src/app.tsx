import { memo } from 'react';
import { Home, Siren, LocateFixed, History, UserCircle2 } from 'lucide-react';
import { NavLink, Route, Routes } from 'react-router-dom';
import { SectionCard, StatusBadge } from '@harjo/ui';
import { useEmergencyReports, useGeolocation } from '@harjo/lib';

const navItems = [
  { to: '/emergency-mobile', label: 'Beranda', icon: Home },
  { to: '/emergency-mobile/darurat', label: 'Darurat', icon: Siren },
  { to: '/emergency-mobile/tracking', label: 'Tracking', icon: LocateFixed },
  { to: '/emergency-mobile/riwayat', label: 'Riwayat', icon: History },
  { to: '/emergency-mobile/profil', label: 'Profil', icon: UserCircle2 }
] as const;

function HomePage() {
  const { data: reports } = useEmergencyReports();
  const { data: geo } = useGeolocation();

  return (
    <div className="space-y-4 p-4 pb-28">
      <h1>Siap membantu keadaan darurat.</h1>
      <SectionCard title="Status GPS" subtitle="Lokasi penting untuk percepat bantuan">
        <div className="flex items-center justify-between">
          <StatusBadge label={geo ? 'GPS aktif' : 'Belum aktif'} tone={geo ? 'safe' : 'warning'} />
          <button>Aktifkan GPS</button>
        </div>
      </SectionCard>
      <SectionCard title="Aksi cepat" subtitle="Emergency CTA terlihat dalam 1 detik">
        <button aria-label="Laporkan Darurat" className="w-full rounded-2xl bg-red-600 text-white">Laporkan Darurat</button>
      </SectionCard>
      <SectionCard title="Laporan aktif">
        <strong>{reports?.filter((x) => x.status !== 'completed').length ?? 0}</strong>
      </SectionCard>
    </div>
  );
}

function EmergencyPage() { return <div className="p-4 pb-28">Flow: jenis → lokasi → korban → severity → deskripsi → kirim</div>; }
function TrackingPage() { return <div className="p-4 pb-28">Timeline: Reported → Dispatching → Ambulance Assigned → En Route → On Scene → Transporting → Completed</div>; }
function HistoryPage() { return <div className="p-4 pb-28">Filter Semua/Aktif/Selesai/Dibatalkan</div>; }
function ProfilePage() { return <div className="p-4 pb-28">Permission GPS/Notifikasi/Mikrofon + PIN/biometrik</div>; }

const BottomNav = memo(function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 grid grid-cols-5 border-t bg-white p-2" style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>
      {navItems.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} end={to === '/emergency-mobile'} className="flex min-h-12 flex-col items-center justify-center gap-1 text-xs">
          <Icon size={18} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
});

export function EmergencyMobileApp() {
  return (
    <main>
      <Routes>
        <Route path="/emergency-mobile" element={<HomePage />} />
        <Route path="/emergency-mobile/darurat" element={<EmergencyPage />} />
        <Route path="/emergency-mobile/tracking" element={<TrackingPage />} />
        <Route path="/emergency-mobile/riwayat" element={<HistoryPage />} />
        <Route path="/emergency-mobile/profil" element={<ProfilePage />} />
      </Routes>
      <BottomNav />
    </main>
  );
}
