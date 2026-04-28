import { memo } from 'react';
import {
  Ambulance,
  MapPinned,
  Activity,
  MessageSquare,
  SlidersHorizontal,
  TriangleAlert,
  Fuel,
  HeartPulse,
  Stethoscope,
  UserRound,
  WifiOff
} from 'lucide-react';
import { NavLink, Route, Routes } from 'react-router-dom';
import { EmptyState, SectionCard, StatusBadge } from '@harjo/ui';
import { useAmbulanceTracking, useEmergencyReports, useOfflineSync, usePatientMonitoring, useTeamChat } from '@harjo/lib';

const nav = [
  { to: '/ambulance-mobile', label: 'Tugas', icon: Ambulance },
  { to: '/ambulance-mobile/navigasi', label: 'Navigasi', icon: MapPinned },
  { to: '/ambulance-mobile/pasien', label: 'Pasien', icon: Activity },
  { to: '/ambulance-mobile/chat', label: 'Chat', icon: MessageSquare },
  { to: '/ambulance-mobile/status', label: 'Status', icon: SlidersHorizontal }
] as const;

function TasksPage() {
  const { data: reports } = useEmergencyReports();
  const current = reports?.find((item) => !['completed', 'cancelled'].includes(item.status));

  return (
    <div className="space-y-4 p-4 pb-28">
      <SectionCard title="Unit A-12" subtitle="Driver: Budi Santoso • Shift Pagi">
        <StatusBadge label={current ? 'Dispatched' : 'Available'} tone={current ? 'info' : 'safe'} />
      </SectionCard>

      {current ? (
        <SectionCard title="Current Assignment" subtitle="Prioritas dispatch real-time">
          <div className="space-y-2 text-sm text-slate-600">
            <p>{current.type} • Severity: {current.severity}</p>
            <p>Distance: 3.1 km • ETA 8 menit • Korban {current.victimCount}</p>
            <div className="grid grid-cols-2 gap-2">
              <button className="min-h-12 rounded-2xl bg-primary text-white">Accept</button>
              <button className="min-h-12 rounded-2xl border border-slate-200">Start Route</button>
            </div>
            {current.severity === 'kritis' ? (
              <div className="flex items-center gap-2 rounded-2xl bg-rose-50 p-3 text-sm text-rose-700"><TriangleAlert size={16} />Kasus kritis diprioritaskan.</div>
            ) : null}
          </div>
        </SectionCard>
      ) : (
        <EmptyState title="Tidak ada tugas aktif" description="Saat dispatch masuk, tugas akan muncul di halaman ini." />
      )}

      <SectionCard title="Checklist sebelum berangkat" subtitle="Pastikan peralatan siap">
        <div className="grid grid-cols-2 gap-2 text-sm text-slate-700">
          {['Fuel', 'Oxygen', 'AED/Defibrillator', 'Stretcher', 'Medical Bag', 'Crew Ready'].map((item) => (
            <label key={item} className="flex min-h-12 items-center gap-2 rounded-xl border border-slate-200 px-3"><input type="checkbox" />{item}</label>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function NavigationPage() {
  const sync = useOfflineSync();
  return (
    <div className="space-y-4 p-4 pb-28">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700"><WifiOff className="mr-2 inline" size={16} />Jika offline, update status disimpan ke sync_queue.</div>
      <SectionCard title="Navigasi live" subtitle="Mode map fullscreen siap untuk integrasi Leaflet/Mapbox">
        <div className="h-64 rounded-2xl bg-slate-100 p-4 text-sm text-slate-500">Map placeholder • ETA 8 menit • 3.1 km • Turn-by-turn</div>
      </SectionCard>
      <SectionCard title="Update status perjalanan">
        <div className="grid grid-cols-2 gap-2">
          {['Dispatched', 'En Route', 'On Scene', 'Transporting', 'Arrived Hospital', 'Available'].map((status) => (
            <button
              key={status}
              className="min-h-12 rounded-2xl border border-slate-200 text-xs"
              onClick={() => {
                void sync.enqueue({ type: 'status_update', status, at: new Date().toISOString() });
              }}
            >
              {status}
            </button>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function PatientPage() {
  const { data } = usePatientMonitoring();
  return (
    <div className="space-y-4 p-4 pb-28">
      <SectionCard title="Monitoring pasien" subtitle="Tambah vital signs + SOAP note dengan timestamp otomatis">
        <div className="grid grid-cols-2 gap-2 text-sm">
          {['Nama pasien', 'Usia', 'Gender', 'Blood pressure', 'Heart rate', 'Respiratory rate', 'SpO2', 'Temperature', 'Consciousness'].map((item) => (
            <input key={item} className="min-h-12 rounded-xl border border-slate-200 px-3" placeholder={item} />
          ))}
        </div>
        <textarea className="mt-2 min-h-24 w-full rounded-xl border border-slate-200 p-3" placeholder="Treatment notes / medication given" />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button className="min-h-12 rounded-2xl bg-primary text-white">Tambah Vital Signs</button>
          <button className="min-h-12 rounded-2xl border border-slate-200">Kirim Handover</button>
        </div>
      </SectionCard>
      <SectionCard title="Rekaman terbaru"><p className="text-sm text-slate-500">Total record: {data?.length ?? 0}</p></SectionCard>
    </div>
  );
}

function ChatPage() {
  const { data } = useTeamChat('demo-emergency-id');
  return (
    <div className="space-y-4 p-4 pb-28">
      <SectionCard title="Channel komunikasi" subtitle="Dispatcher • Dokter • Admin • Tim ambulans">
        <div className="grid grid-cols-2 gap-2 text-xs">
          {['text', 'location', 'status', 'image', 'urgent'].map((type) => (
            <button key={type} className="min-h-11 rounded-xl border border-slate-200">{type}</button>
          ))}
        </div>
      </SectionCard>
      <SectionCard title="Realtime chat">
        <p className="text-sm text-slate-500">Pesan tersedia: {data?.length ?? 0} (menunggu emergency aktif valid).</p>
      </SectionCard>
    </div>
  );
}

function StatusPage() {
  const { data: tracking } = useAmbulanceTracking();
  return (
    <div className="space-y-4 p-4 pb-28">
      <SectionCard title="Ambulance status" subtitle="Available / Dispatched / En Route / On Scene / Transporting / Maintenance">
        <StatusBadge label={tracking?.[0]?.status ?? 'available'} tone="info" />
      </SectionCard>
      <SectionCard title="Driver & shift" subtitle="Profil driver + shift status">
        <div className="space-y-2 text-sm text-slate-600"><p><UserRound className="mr-1 inline" size={16} />Driver aktif: {tracking?.[0]?.driver_id ?? '-'}</p></div>
      </SectionCard>
      <SectionCard title="Equipment tracker">
        <div className="grid grid-cols-2 gap-2 text-sm">
          {[
            ['oxygen', HeartPulse],
            ['fuel', Fuel],
            ['AED', HeartPulse],
            ['stretcher', Stethoscope],
            ['medical bag', Stethoscope],
            ['medicines', Stethoscope]
          ].map(([name, Icon]) => (
            <div key={String(name)} className="flex min-h-12 items-center gap-2 rounded-xl border border-slate-200 px-3"><Icon size={16} />{String(name)}</div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

const BottomNav = memo(function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 grid grid-cols-5 border-t border-slate-200 bg-white p-2" style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>
      {nav.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} end={to === '/ambulance-mobile'} className={({ isActive }) => `flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-xs ${isActive ? 'bg-blue-50 text-primary' : 'text-slate-500'}`}>
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
      <BottomNav />
    </main>
  );
}
