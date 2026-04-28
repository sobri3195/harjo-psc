import { memo, useMemo, useState } from 'react';
import {
  Home,
  Siren,
  LocateFixed,
  History,
  UserCircle2,
  Bell,
  Mic,
  Navigation,
  Phone,
  MessageCircle,
  Clock4,
  Activity,
  Ambulance,
  ShieldCheck
} from 'lucide-react';
import { NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import { EmptyState, SectionCard, StatsGrid, StatusBadge } from '@harjo/ui';
import { useEmergencyReports, useGeolocation, useNotifications } from '@harjo/lib';

const navItems = [
  { to: '/emergency-mobile', label: 'Beranda', icon: Home },
  { to: '/emergency-mobile/darurat', label: 'Darurat', icon: Siren },
  { to: '/emergency-mobile/tracking', label: 'Tracking', icon: LocateFixed },
  { to: '/emergency-mobile/riwayat', label: 'Riwayat', icon: History },
  { to: '/emergency-mobile/profil', label: 'Profil', icon: UserCircle2 }
] as const;

const timeline = ['Reported', 'Dispatching', 'Ambulance Assigned', 'En Route', 'On Scene', 'Transporting', 'Completed'] as const;

function HomePage() {
  const navigate = useNavigate();
  const { data: reports } = useEmergencyReports();
  const { data: geo } = useGeolocation();
  const { data: notifications } = useNotifications();

  const activeReports = useMemo(() => (reports ?? []).filter((x) => !['completed', 'cancelled'].includes(x.status)), [reports]);
  const latest = reports?.[0];

  return (
    <div className="space-y-4 p-4 pb-28">
      <header className="rounded-3xl bg-primary px-4 py-3 text-white shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs opacity-80">Harjo Emergency App</p>
            <h1 className="text-lg font-semibold">Siap membantu keadaan darurat.</h1>
          </div>
          <button className="relative rounded-xl bg-white/15 p-2" aria-label="Notifikasi">
            <Bell size={18} />
            <span className="absolute -right-1 -top-1 rounded-full bg-amber-400 px-1 text-[10px] text-slate-900">{notifications?.length ?? 0}</span>
          </button>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs"><StatusBadge label="Online" tone="safe" /></div>
      </header>

      <SectionCard title="Status GPS" subtitle="Lokasi akurat mempercepat ambulans" action={<Navigation size={16} className="text-slate-400" />}>
        <div className="flex items-center justify-between gap-2">
          <div>
            <StatusBadge label={geo ? 'GPS aktif' : 'Belum aktif'} tone={geo ? 'safe' : 'warning'} />
            <p className="mt-2 text-xs text-slate-500">
              {geo
                ? `Akurasi ±${Math.round(geo.coords.accuracy)}m • update ${new Date(geo.timestamp).toLocaleTimeString('id-ID')}`
                : 'Aktifkan GPS untuk mengirim lokasi darurat.'}
            </p>
          </div>
          <button className="rounded-xl bg-slate-100 px-3 text-sm font-medium text-slate-700">Aktifkan GPS</button>
        </div>
      </SectionCard>

      <SectionCard title="Ringkasan cepat" subtitle="Status sistem selalu terlihat">
        <StatsGrid
          items={[
            { label: 'Laporan aktif', value: String(activeReports.length), icon: Activity },
            { label: 'Ambulans terdekat', value: '2.3 km', icon: Ambulance },
            { label: 'Estimasi respons', value: '8 menit', icon: Clock4 },
            { label: 'Status siaga', value: 'Siaga', icon: ShieldCheck }
          ]}
        />
      </SectionCard>

      <SectionCard title="Aksi cepat" subtitle="Tombol darurat terlihat dalam 1 detik">
        <button
          aria-label="Laporkan Darurat"
          className="min-h-12 w-full rounded-2xl bg-emergency px-4 py-3 text-base font-semibold text-white shadow-sm transition duration-200 active:scale-[0.99]"
          onClick={() => navigate('/emergency-mobile/darurat')}
        >
          Laporkan Darurat
        </button>
        <button className="mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
          <Mic size={16} /> Voice Report
        </button>
      </SectionCard>

      {activeReports[0] ? (
        <SectionCard title="Live ambulance tracker" subtitle="Laporan aktif sedang ditangani">
          <div className="flex items-center justify-between text-sm">
            <p>{activeReports[0].type} • {activeReports[0].severity}</p>
            <StatusBadge label="Ambulans dalam perjalanan" tone="info" />
          </div>
        </SectionCard>
      ) : null}

      <SectionCard title="Laporan terbaru">
        {latest ? (
          <div className="text-sm text-slate-600">{latest.type} • {latest.severity} • {new Date(latest.createdAt).toLocaleString('id-ID')}</div>
        ) : (
          <p className="text-sm text-slate-500">Belum ada laporan terbaru.</p>
        )}
      </SectionCard>
    </div>
  );
}

function EmergencyPage() {
  const emergencyTypes = ['Trauma', 'Jantung', 'Stroke', 'Luka Bakar', 'Kecelakaan', 'Lainnya'];
  return (
    <div className="space-y-4 p-4 pb-28">
      <SectionCard title="Jenis darurat" subtitle="Pilih jenis utama untuk mempercepat triase">
        <div className="grid grid-cols-2 gap-3">
          {emergencyTypes.map((type) => (
            <button key={type} className="min-h-12 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700" aria-label={`Darurat ${type}`}>
              {type}
            </button>
          ))}
        </div>
      </SectionCard>
      <SectionCard title="Alur pelaporan" subtitle="Konfirmasi singkat agar data tetap akurat">
        <ol className="space-y-2 text-sm text-slate-600">
          <li>1. Pilih jenis darurat</li><li>2. Konfirmasi lokasi</li><li>3. Isi jumlah korban</li><li>4. Pilih severity</li><li>5. Tambah deskripsi / voice note</li><li>6. Kirim laporan</li>
        </ol>
        <p className="mt-3 text-xs text-slate-500">Jika tidak tahu lokasi tepat, aktifkan opsi GPS fallback.</p>
      </SectionCard>
      <SectionCard title="Voice report" subtitle="Rekam suara, transkripsi otomatis, edit sebelum kirim">
        <button className="min-h-12 w-full rounded-2xl bg-primary text-sm font-semibold text-white">Mulai Rekam</button>
      </SectionCard>
    </div>
  );
}

function TrackingPage() {
  const { data: reports } = useEmergencyReports();
  const active = (reports ?? []).find((x) => !['completed', 'cancelled'].includes(x.status));

  if (!active) {
    return (
      <div className="p-4 pb-28">
        <EmptyState title="Belum ada laporan aktif" description="Saat Anda mengirim laporan, status ambulans dan timeline akan muncul di sini." cta={<NavLink className="rounded-xl bg-primary px-4 py-2 text-sm text-white" to="/emergency-mobile/darurat">Buat laporan darurat</NavLink>} />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 pb-28">
      <SectionCard title="Status penanganan" subtitle="Lacak progres dari pelaporan sampai selesai">
        <div className="space-y-2">
          {timeline.map((step) => (
            <div key={step} className="flex items-center gap-2 text-sm text-slate-600">
              <span className={`h-2.5 w-2.5 rounded-full ${step.toLowerCase().replace(' ', '_') === active.status ? 'bg-primary animate-pulse' : 'bg-slate-300'}`} />
              {step}
            </div>
          ))}
        </div>
      </SectionCard>
      <SectionCard title="Ambulans ditugaskan" subtitle="ETA 8 menit • Unit A-12">
        <div className="space-y-2 text-sm text-slate-600">
          <p>Driver: Budi Santoso • Tim Medis: 2 personel</p>
          <p>Lokasi terakhir: RS Harjo Pusat • Koneksi: Online</p>
          <div className="grid grid-cols-2 gap-2">
            <button className="min-h-12 rounded-2xl border border-slate-200"><MessageCircle className="mx-auto" size={16} />Chat Dispatcher</button>
            <button className="min-h-12 rounded-2xl border border-slate-200"><Phone className="mx-auto" size={16} />Call Dispatcher</button>
          </div>
          <button className="min-h-12 w-full rounded-2xl bg-amber-100 text-sm font-semibold text-amber-800">Batalkan (10 detik pertama)</button>
        </div>
      </SectionCard>
    </div>
  );
}

function HistoryPage() {
  const { data: reports } = useEmergencyReports();

  return (
    <div className="space-y-4 p-4 pb-28">
      <SectionCard title="Filter laporan">
        <div className="grid grid-cols-4 gap-2 text-xs">
          {['Semua', 'Aktif', 'Selesai', 'Dibatalkan'].map((f) => (
            <button key={f} className="min-h-11 rounded-xl border border-slate-200">{f}</button>
          ))}
        </div>
      </SectionCard>
      {(reports ?? []).map((report) => (
        <SectionCard key={report.id} title={report.type} subtitle={new Date(report.createdAt).toLocaleString('id-ID')}>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <StatusBadge label={report.status} tone={report.status === 'completed' ? 'safe' : 'info'} />
            <StatusBadge label={`Severity ${report.severity}`} tone={report.severity === 'kritis' ? 'danger' : 'warning'} />
          </div>
        </SectionCard>
      ))}
    </div>
  );
}

function ProfilePage() {
  return (
    <div className="space-y-4 p-4 pb-28">
      <SectionCard title="Profil pengguna" subtitle="Role: reporter">
        <div className="space-y-2 text-sm text-slate-600">
          <p>Status izin GPS / Notifikasi / Mikrofon</p>
          <p>Kontak darurat, bahasa, dan keamanan PIN/biometrik.</p>
          <button className="min-h-12 w-full rounded-2xl border border-slate-200">Logout</button>
        </div>
      </SectionCard>
    </div>
  );
}

const BottomNav = memo(function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 grid grid-cols-5 border-t border-slate-200 bg-white p-2" style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>
      {navItems.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} end={to === '/emergency-mobile'} className={({ isActive }) => `flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-xs transition duration-200 ${isActive ? 'bg-blue-50 text-primary' : 'text-slate-500'}`}>
          <Icon size={18} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
});

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
      <BottomNav />
    </main>
  );
}
