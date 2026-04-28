import { Ambulance, MapPinned, Activity, MessageSquare, SlidersHorizontal } from 'lucide-react';
import { NavLink, Route, Routes } from 'react-router-dom';

const nav = [
  { to: '/ambulance-mobile', label: 'Tugas', icon: Ambulance },
  { to: '/ambulance-mobile/navigasi', label: 'Navigasi', icon: MapPinned },
  { to: '/ambulance-mobile/pasien', label: 'Pasien', icon: Activity },
  { to: '/ambulance-mobile/chat', label: 'Chat', icon: MessageSquare },
  { to: '/ambulance-mobile/status', label: 'Status', icon: SlidersHorizontal }
] as const;

const Page = ({ t }: { t: string }) => <div style={{ padding: 16, paddingBottom: 92 }}>{t}</div>;

export function AmbulanceMobileApp() {
  return (
    <main>
      <Routes>
        <Route path="/ambulance-mobile" element={<Page t="Tugas + checklist + queue prioritas kritis" />} />
        <Route path="/ambulance-mobile/navigasi" element={<Page t="Live map + status buttons + offline queue" />} />
        <Route path="/ambulance-mobile/pasien" element={<Page t="Monitoring pasien + SOAP note + handover" />} />
        <Route path="/ambulance-mobile/chat" element={<Page t="Realtime chat per emergency" />} />
        <Route path="/ambulance-mobile/status" element={<Page t="Status ambulans, driver, equipment tracker" />} />
      </Routes>
      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', background: '#fff', borderTop: '1px solid #ddd', padding: 8 }}>
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/ambulance-mobile'} style={{ minHeight: 44, fontSize: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={18} />{label}
          </NavLink>
        ))}
      </nav>
    </main>
  );
}
