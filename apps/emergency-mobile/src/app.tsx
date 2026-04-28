import { memo, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Ambulance,
  Bell,
  Clock3,
  History,
  Home,
  LocateFixed,
  MapPinned,
  MessageCircle,
  Mic,
  Phone,
  ShieldCheck,
  Siren,
  UserCircle2,
  WifiOff
} from 'lucide-react';
import { NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import { EmptyState, SectionCard, SkeletonBlock, StatsGrid, StatusBadge } from '@harjo/ui';
import { useEmergencyReports, useGeolocation, useNotifications } from '@harjo/lib';

const navItems = [
  { to: '/emergency-mobile', label: 'Beranda', icon: Home },
  { to: '/emergency-mobile/darurat', label: 'Darurat', icon: Siren },
  { to: '/emergency-mobile/tracking', label: 'Tracking', icon: LocateFixed },
  { to: '/emergency-mobile/riwayat', label: 'Riwayat', icon: History },
  { to: '/emergency-mobile/profil', label: 'Profil', icon: UserCircle2 }
] as const;

const timeline = ['Reported', 'Dispatching', 'Ambulance Assigned', 'En Route', 'On Scene', 'Transporting', 'Completed'] as const;

function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  return isOnline;
}

function HomePage() {
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
  const reportsQuery = useEmergencyReports();
  const geoQuery = useGeolocation();
  const notificationsQuery = useNotifications();

  const reports = reportsQuery.data ?? [];
  const activeReport = useMemo(() => reports.find((x) => !['completed', 'cancelled'].includes(x.status)), [reports]);

  return (
    <div className="space-y-4 p-4 pb-32 pt-4">
      <header className="rounded-2xl bg-primary px-4 py-4 text-white shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs opacity-80">Harjo Emergency</p>
            <h1 className="text-lg font-semibold leading-tight">Action darurat dalam 1 tap.</h1>
          </div>
          <button className="relative rounded-xl bg-white/20 p-2" aria-label="Buka notifikasi">
            <Bell size={18} />
            <span className="absolute -right-1 -top-1 rounded-full bg-amber-300 px-1 text-[10px] text-slate-900">
              {notificationsQuery.data?.length ?? 0}
            </span>
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <StatusBadge label={isOnline ? 'Koneksi Online' : 'Koneksi Offline'} tone={isOnline ? 'safe' : 'warning'} />
          <StatusBadge label={geoQuery.data ? 'GPS Aktif' : 'GPS Tidak Aktif'} tone={geoQuery.data ? 'info' : 'warning'} />
        </div>
      </header>

      {!isOnline ? (
        <div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <WifiOff size={16} /> Anda sedang offline. Laporan akan dikirim saat koneksi kembali.
        </div>
      ) : null}

      <SectionCard title="Aksi utama" subtitle="Tombol besar untuk kondisi stres tinggi">
        <button
          aria-label="Laporkan keadaan darurat sekarang"
          onClick={() => navigate('/emergency-mobile/darurat')}
          className="min-h-14 w-full rounded-2xl bg-emergency px-4 py-3 text-base font-semibold text-white shadow-sm"
        >
          🚨 Laporkan Darurat
        </button>
        <button aria-label="Kirim voice report" className="mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700">
          <Mic size={16} /> Voice Report
        </button>
      </SectionCard>

      <SectionCard title="Status cepat" subtitle="Informasi kritis selalu di atas">
        <StatsGrid
          items={[
            { label: 'Laporan aktif', value: String(activeReport ? 1 : 0), icon: Activity },
            { label: 'Ambulans terdekat', value: activeReport ? '2.3 km' : '-', icon: Ambulance },
            { label: 'ETA respons', value: activeReport ? '8 menit' : '-', icon: Clock3 },
            { label: 'Sistem', value: isOnline ? 'Siaga' : 'Offline', icon: ShieldCheck }
          ]}
        />
      </SectionCard>

      {reportsQuery.isLoading ? (
        <SectionCard title="Laporan aktif" subtitle="Memuat data...">
          <SkeletonBlock className="h-5 w-1/2" />
          <SkeletonBlock className="mt-2 h-4 w-full" />
        </SectionCard>
      ) : reportsQuery.isError ? (
        <EmptyState title="Gagal memuat laporan" description="Tarik layar ke bawah atau coba lagi beberapa saat." />
      ) : activeReport ? (
        <SectionCard title="Report aktif" subtitle="Sedang ditangani tim dispatch">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-slate-700">{activeReport.type} • {activeReport.severity}</p>
            <StatusBadge label="Ambulans Dalam Perjalanan" tone="info" />
          </div>
          <button
            aria-label="Lihat tracking laporan aktif"
            onClick={() => navigate('/emergency-mobile/tracking')}
            className="mt-3 min-h-12 w-full rounded-2xl border border-slate-200 text-sm font-semibold"
          >
            Lihat Tracking
          </button>
        </SectionCard>
      ) : (
        <EmptyState title="Belum ada report aktif" description="Saat Anda mengirim laporan, status aktif muncul di sini." />
      )}
    </div>
  );
}

function EmergencyPage() {
  const emergencyTypes = ['Trauma', 'Jantung', 'Stroke', 'Kecelakaan', 'Luka Bakar', 'Lainnya'];
  return (
    <div className="space-y-4 p-4 pb-32">
      <SectionCard title="Pilih jenis darurat" subtitle="Grid tombol besar untuk respon cepat">
        <div className="grid grid-cols-2 gap-3">
          {emergencyTypes.map((type) => (
            <button key={type} aria-label={`Pilih darurat ${type}`} className="min-h-14 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">
              {type}
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Voice report" subtitle="Rekam suara lalu edit transkrip sebelum kirim">
        <button aria-label="Mulai merekam laporan suara" className="min-h-12 w-full rounded-2xl bg-primary text-sm font-semibold text-white">Mulai Rekam</button>
      </SectionCard>

      <SectionCard title="Form cepat" subtitle="Data minimum agar tim bergerak cepat">
        <div className="space-y-2 text-sm">
          <input aria-label="Jumlah korban" className="min-h-12 w-full rounded-xl border border-slate-200 px-3" placeholder="Jumlah korban" />
          <input aria-label="Deskripsi singkat" className="min-h-12 w-full rounded-xl border border-slate-200 px-3" placeholder="Deskripsi singkat" />
          <button aria-label="Konfirmasi lokasi kejadian" className="min-h-12 w-full rounded-2xl border border-slate-200 text-sm font-semibold">
            <MapPinned className="mr-1 inline" size={16} /> Confirm Location
          </button>
          <button aria-label="Kirim laporan darurat" className="min-h-12 w-full rounded-2xl bg-emergency text-sm font-semibold text-white">Kirim Laporan</button>
        </div>
      </SectionCard>
    </div>
  );
}

function TrackingPage() {
  const reportsQuery = useEmergencyReports();
  const active = (reportsQuery.data ?? []).find((x) => !['completed', 'cancelled'].includes(x.status));

  if (reportsQuery.isLoading) {
    return (
      <div className="space-y-4 p-4 pb-32">
        <SectionCard title="Tracking live" subtitle="Memuat data laporan">
          <SkeletonBlock className="h-5 w-1/3" />
          <SkeletonBlock className="mt-2 h-28 w-full" />
        </SectionCard>
      </div>
    );
  }

  if (!active) {
    return (
      <div className="p-4 pb-32">
        <EmptyState
          title="Belum ada laporan aktif"
          description="Saat laporan masuk, timeline, ETA, dan peta live muncul otomatis."
          cta={<NavLink className="rounded-xl bg-primary px-4 py-2 text-sm text-white" to="/emergency-mobile/darurat">Buat laporan darurat</NavLink>}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 pb-32">
      <SectionCard title="ETA ambulans" subtitle="Unit A-12 • ETA 8 menit">
        <StatusBadge label="En Route" tone="info" />
      </SectionCard>

      <SectionCard title="Timeline penanganan" subtitle="Progress ditampilkan jelas">
        <div className="space-y-2">
          {timeline.map((step) => (
            <div key={step} className="flex items-center gap-2 text-sm text-slate-700">
              <span className={`h-2.5 w-2.5 rounded-full ${step.toLowerCase().replace(' ', '_') === active.status ? 'bg-primary animate-pulse' : 'bg-slate-300'}`} />
              {step}
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Live map" subtitle="Posisi ambulans real-time">
        <div className="h-56 rounded-2xl bg-slate-100 p-3 text-sm text-slate-500">Map placeholder • Jarak 2.3 km • Update 5 detik lalu</div>
      </SectionCard>

      <SectionCard title="Komunikasi dispatcher">
        <div className="grid grid-cols-2 gap-2">
          <button aria-label="Chat dispatcher" className="min-h-12 rounded-2xl border border-slate-200 text-sm font-semibold"><MessageCircle className="mr-1 inline" size={16} /> Chat</button>
          <button aria-label="Telepon dispatcher" className="min-h-12 rounded-2xl border border-slate-200 text-sm font-semibold"><Phone className="mr-1 inline" size={16} /> Call</button>
        </div>
      </SectionCard>
    </div>
  );
}

function HistoryPage() {
  const reportsQuery = useEmergencyReports();

  return (
    <div className="space-y-4 p-4 pb-32">
      <SectionCard title="Riwayat laporan" subtitle="Filter cepat dan detail ringkas">
        <div className="flex flex-wrap gap-2 text-xs">
          {['Semua', 'Aktif', 'Selesai', 'Dibatalkan'].map((f) => (
            <button key={f} aria-label={`Filter ${f}`} className="min-h-10 rounded-full border border-slate-200 px-3">{f}</button>
          ))}
        </div>
      </SectionCard>

      {reportsQuery.isLoading ? (
        <SectionCard title="Memuat riwayat">
          <SkeletonBlock className="h-5 w-1/2" />
        </SectionCard>
      ) : reportsQuery.isError ? (
        <EmptyState title="Riwayat gagal dimuat" description="Periksa koneksi lalu coba kembali." />
      ) : (reportsQuery.data ?? []).length === 0 ? (
        <EmptyState title="Belum ada riwayat" description="Laporan yang sudah selesai akan muncul di sini." />
      ) : (
        (reportsQuery.data ?? []).map((report) => (
          <SectionCard key={report.id} title={report.type} subtitle={new Date(report.createdAt).toLocaleString('id-ID')}>
            <div className="flex flex-wrap gap-2">
              <StatusBadge label={report.status} tone={report.status === 'completed' ? 'safe' : 'info'} />
              <StatusBadge label={`Severity ${report.severity}`} tone={report.severity === 'kritis' ? 'danger' : 'warning'} />
            </div>
            <button aria-label={`Buka detail ${report.type}`} className="mt-3 min-h-11 w-full rounded-xl border border-slate-200 text-sm">Buka Detail</button>
          </SectionCard>
        ))
      )}
    </div>
  );
}

function ProfilePage() {
  return (
    <div className="space-y-4 p-4 pb-32">
      <SectionCard title="Pengaturan izin" subtitle="Pastikan fitur emergency tetap aktif">
        <div className="space-y-2 text-sm text-slate-700">
          <button className="min-h-12 w-full rounded-xl border border-slate-200 text-left px-3">Izin Lokasi & GPS</button>
          <button className="min-h-12 w-full rounded-xl border border-slate-200 text-left px-3">Izin Notifikasi</button>
          <button className="min-h-12 w-full rounded-xl border border-slate-200 text-left px-3">Keamanan PIN / Biometrik</button>
        </div>
      </SectionCard>
      <SectionCard title="Akun">
        <button aria-label="Logout aplikasi" className="min-h-12 w-full rounded-2xl border border-slate-200 text-sm font-semibold">Logout</button>
      </SectionCard>
    </div>
  );
}

const EmergencyBottomNavigation = memo(function EmergencyBottomNavigation() {
  return (
    <nav
      aria-label="Navigasi utama emergency"
      className="fixed bottom-0 left-0 right-0 mx-auto grid w-full max-w-md grid-cols-5 border-t border-slate-200 bg-white/95 p-2 backdrop-blur"
      style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}
    >
      {navItems.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/emergency-mobile'}
          className={({ isActive }) => `flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-medium ${isActive ? 'bg-blue-50 text-primary' : 'text-slate-500'}`}
        >
          <Icon size={18} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
});

function FloatingEmergencyAction() {
  const navigate = useNavigate();
  return (
    <button
      aria-label="Aksi darurat cepat"
      onClick={() => navigate('/emergency-mobile/darurat')}
      className="fixed bottom-24 right-5 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-emergency text-white shadow-lg"
      style={{ bottom: 'calc(88px + env(safe-area-inset-bottom))' }}
    >
      <Siren size={22} />
    </button>
  );
}

export function EmergencyMobileApp() {
  return (
    <main className="mx-auto min-h-screen max-w-md bg-slate-50">
      <Routes>
        <Route path="/emergency-mobile" element={<HomePage />} />
        <Route path="/emergency-mobile/darurat" element={<EmergencyPage />} />
        <Route path="/emergency-mobile/tracking" element={<TrackingPage />} />
        <Route path="/emergency-mobile/riwayat" element={<HistoryPage />} />
        <Route path="/emergency-mobile/profil" element={<ProfilePage />} />
      </Routes>
      <FloatingEmergencyAction />
      <EmergencyBottomNavigation />
    </main>
  );
}
