import { memo, useEffect, useState } from 'react';
import {
  Activity,
  Ambulance,
  BatteryCharging,
  Fuel,
  HeartPulse,
  MapPinned,
  MessageSquare,
  Phone,
  SlidersHorizontal,
  Stethoscope,
  TriangleAlert,
  UserRound,
  WifiOff
} from 'lucide-react';
import { NavLink, Route, Routes } from 'react-router-dom';
import { EmptyState, SectionCard, SkeletonBlock, StatusBadge } from '@harjo/ui';
import { useAmbulanceTracking, useEmergencyReports, useOfflineSync, usePatientMonitoring, useTeamChat } from '@harjo/lib';

const nav = [
  { to: '/ambulance-mobile', label: 'Tugas', icon: Ambulance },
  { to: '/ambulance-mobile/navigasi', label: 'Navigasi', icon: MapPinned },
  { to: '/ambulance-mobile/pasien', label: 'Pasien', icon: Activity },
  { to: '/ambulance-mobile/chat', label: 'Chat', icon: MessageSquare },
  { to: '/ambulance-mobile/status', label: 'Status', icon: SlidersHorizontal }
] as const;

function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return isOnline;
}

function TasksPage() {
  const reportsQuery = useEmergencyReports();
  const current = reportsQuery.data?.find((item) => !['completed', 'cancelled'].includes(item.status));

  return (
    <div className="space-y-4 p-4 pb-32">
      <SectionCard title="Unit A-12" subtitle="Driver: Budi Santoso • Shift Pagi">
        <StatusBadge label={current ? 'Dispatched' : 'Available'} tone={current ? 'info' : 'safe'} />
      </SectionCard>

      {reportsQuery.isLoading ? (
        <SectionCard title="Memuat assignment">
          <SkeletonBlock className="h-5 w-1/2" />
        </SectionCard>
      ) : current ? (
        <SectionCard title="Current assignment" subtitle="Prioritas dan severity terlihat jelas">
          <div className="space-y-3 text-sm text-slate-700">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold">{current.type}</p>
              <StatusBadge label={`Severity ${current.severity}`} tone={current.severity === 'kritis' ? 'danger' : 'warning'} />
            </div>
            <p>Distance 3.1 km • ETA 8 menit • Korban {current.victimCount}</p>
            <div className="grid grid-cols-2 gap-2">
              <button aria-label="Terima tugas" className="min-h-12 rounded-2xl bg-primary text-white font-semibold">Accept</button>
              <button aria-label="Mulai rute" className="min-h-12 rounded-2xl border border-slate-200 font-semibold">Start Route</button>
            </div>
            {current.severity === 'kritis' ? (
              <div className="flex items-center gap-2 rounded-2xl bg-rose-50 p-3 text-rose-700">
                <TriangleAlert size={16} /> Kasus kritis, utamakan golden period.
              </div>
            ) : null}
          </div>
        </SectionCard>
      ) : (
        <EmptyState title="Tidak ada tugas aktif" description="Dispatch baru akan muncul otomatis di halaman ini." />
      )}
    </div>
  );
}

function NavigationPage() {
  const isOnline = useOnlineStatus();
  const sync = useOfflineSync();

  const updateStatus = async (status: string) => {
    await sync.enqueue({
      idempotency_key: `${status}-${Date.now()}`,
      action_type: 'status_update',
      payload: { status },
      client_updated_at: new Date().toISOString()
    });
  };

  return (
    <div className="space-y-4 p-4 pb-32">
      {!isOnline ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          <WifiOff className="mr-2 inline" size={16} /> Offline mode aktif. Update status akan di-sync otomatis.
        </div>
      ) : null}

      <SectionCard title="Navigasi live" subtitle="Map-first layout dengan detail minimal">
        <div className="h-[360px] rounded-2xl bg-slate-100 p-4 text-sm text-slate-500">Map placeholder • ETA 8 menit • 3.1 km • Turn-by-turn direction</div>
      </SectionCard>

      <SectionCard title="Update status perjalanan">
        <div className="grid grid-cols-2 gap-2">
          {['Dispatched', 'En Route', 'On Scene', 'Transporting', 'Arrived Hospital', 'Available'].map((status) => (
            <button key={status} aria-label={`Update status ${status}`} className="min-h-12 rounded-2xl border border-slate-200 text-xs font-semibold" onClick={() => void updateStatus(status)}>
              {status}
            </button>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function PatientPage() {
  const monitoringQuery = usePatientMonitoring();
  return (
    <div className="space-y-4 p-4 pb-32">
      <SectionCard title="Input tanda vital" subtitle="Form cepat untuk paramedis">
        <div className="grid grid-cols-2 gap-2 text-sm">
          {['Nama pasien', 'Usia', 'Gender', 'Blood Pressure', 'Heart Rate', 'Respiratory Rate', 'SpO2', 'Temperature'].map((item) => (
            <input key={item} aria-label={item} className="min-h-12 rounded-xl border border-slate-200 px-3" placeholder={item} />
          ))}
        </div>
        <textarea aria-label="Catatan treatment" className="mt-2 min-h-24 w-full rounded-xl border border-slate-200 p-3" placeholder="Treatment notes" />
        <textarea aria-label="Log medication" className="mt-2 min-h-20 w-full rounded-xl border border-slate-200 p-3" placeholder="Medication log" />
        <button aria-label="Kirim handover summary" className="mt-2 min-h-12 w-full rounded-2xl bg-primary text-sm font-semibold text-white">Kirim Handover Summary</button>
      </SectionCard>

      {monitoringQuery.isLoading ? (
        <SectionCard title="Riwayat monitoring">
          <SkeletonBlock className="h-4 w-1/3" />
        </SectionCard>
      ) : (
        <SectionCard title="Riwayat monitoring">
          <p className="text-sm text-slate-500">Total record: {monitoringQuery.data?.length ?? 0}</p>
        </SectionCard>
      )}
    </div>
  );
}

function ChatPage() {
  const teamChatQuery = useTeamChat('demo-emergency-id');

  return (
    <div className="space-y-4 p-4 pb-32">
      <SectionCard title="Pesan cepat" subtitle="Template untuk update real-time">
        <div className="grid grid-cols-2 gap-2 text-xs">
          {['En Route', 'On Scene', 'Need Backup', 'Arrive 5m'].map((msg) => (
            <button key={msg} aria-label={`Kirim quick message ${msg}`} className="min-h-11 rounded-xl border border-slate-200">{msg}</button>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Realtime case chat" subtitle="Dispatcher • RS • Tim lapangan">
        {teamChatQuery.isError ? (
          <EmptyState title="Chat gagal dimuat" description="Coba kembali ketika koneksi stabil." />
        ) : (
          <p className="text-sm text-slate-500">Pesan tersedia: {teamChatQuery.data?.length ?? 0}</p>
        )}
      </SectionCard>

      <SectionCard title="Urgent message">
        <div className="grid grid-cols-2 gap-2">
          <button aria-label="Kirim pesan urgent ke dispatcher" className="min-h-12 rounded-2xl bg-emergency text-white font-semibold">Urgent Dispatcher</button>
          <button aria-label="Telepon dispatcher" className="min-h-12 rounded-2xl border border-slate-200 font-semibold"><Phone className="mr-1 inline" size={16} />Call</button>
        </div>
      </SectionCard>
    </div>
  );
}

function StatusPage() {
  const trackingQuery = useAmbulanceTracking();
  const active = trackingQuery.data?.[0];

  return (
    <div className="space-y-4 p-4 pb-32">
      <SectionCard title="Ambulance availability" subtitle="Status operasional saat ini">
        <StatusBadge label={active?.status ?? 'available'} tone="info" />
      </SectionCard>

      <SectionCard title="Equipment checklist" subtitle="Checklist pergeseran shift">
        <div className="grid grid-cols-2 gap-2 text-sm">
          {[
            ['Oxygen', HeartPulse],
            ['Fuel', Fuel],
            ['Defibrillator', BatteryCharging],
            ['Stretcher', Stethoscope]
          ].map(([name, Icon]) => (
            <label key={String(name)} className="flex min-h-12 items-center gap-2 rounded-xl border border-slate-200 px-3">
              <input type="checkbox" aria-label={`Checklist ${String(name)}`} />
              <Icon size={15} /> {String(name)}
            </label>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Shift info">
        <p className="text-sm text-slate-700"><UserRound className="mr-1 inline" size={16} /> Driver aktif: {active?.driver_id ?? '-'}</p>
      </SectionCard>
    </div>
  );
}

const AmbulanceBottomNavigation = memo(function AmbulanceBottomNavigation() {
  return (
    <nav
      aria-label="Navigasi utama ambulance"
      className="fixed bottom-0 left-0 right-0 mx-auto grid w-full max-w-md grid-cols-5 border-t border-slate-200 bg-white/95 p-2 backdrop-blur"
      style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}
    >
      {nav.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/ambulance-mobile'}
          className={({ isActive }) => `flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-medium ${isActive ? 'bg-blue-50 text-primary' : 'text-slate-500'}`}
        >
          <Icon size={18} /><span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
});

export function AmbulanceMobileApp() {
  return (
    <main className="mx-auto min-h-screen max-w-md bg-slate-50">
      <Routes>
        <Route path="/ambulance-mobile" element={<TasksPage />} />
        <Route path="/ambulance-mobile/navigasi" element={<NavigationPage />} />
        <Route path="/ambulance-mobile/pasien" element={<PatientPage />} />
        <Route path="/ambulance-mobile/chat" element={<ChatPage />} />
        <Route path="/ambulance-mobile/status" element={<StatusPage />} />
      </Routes>
      <AmbulanceBottomNavigation />
    </main>
  );
}
