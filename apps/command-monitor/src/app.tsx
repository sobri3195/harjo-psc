import { Route, Routes, NavLink } from 'react-router-dom';
import { Bell, Search } from 'lucide-react';

const menu = [
  'Live Command Center',
  'Emergency Reports',
  'Dispatch Board',
  'Fleet Monitor',
  'Medical Team',
  'Patient Monitoring',
  'Analytics',
  'Broadcast Alert',
  'Settings & Audit'
];

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', minHeight: '100vh', background: '#f8fafc' }}>
      <aside style={{ borderRight: '1px solid #e2e8f0', padding: 16, background: '#fff' }}>
        <h2>Harjo Command Monitor</h2>
        {menu.map((item) => (
          <NavLink key={item} to={`/command-monitor/${item.toLowerCase().replaceAll(' ', '-').replaceAll('&', 'and')}`} style={{ display: 'block', padding: '12px 10px', borderRadius: 12, minHeight: 44 }}>
            {item}
          </NavLink>
        ))}
      </aside>
      <section>
        <header style={{ height: 68, borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', background: '#fff' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Search size={18} />Cari kejadian / unit</div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><Bell size={18} />admin</div>
        </header>
        <div style={{ padding: 20 }}>{children}</div>
      </section>
    </div>
  );
}

const Page = ({ title }: { title: string }) => <Layout><h1>{title}</h1></Layout>;

export function CommandMonitorApp() {
  return (
    <Routes>
      <Route path="/command-monitor" element={<Page title="Live Command Center" />} />
      <Route path="/command-monitor/live-command-center" element={<Page title="Live Command Center" />} />
      <Route path="/command-monitor/emergency-reports" element={<Page title="Emergency Reports" />} />
      <Route path="/command-monitor/dispatch-board" element={<Page title="Dispatch Board" />} />
      <Route path="/command-monitor/fleet-monitor" element={<Page title="Fleet Monitor" />} />
      <Route path="/command-monitor/medical-team" element={<Page title="Medical Team" />} />
      <Route path="/command-monitor/patient-monitoring" element={<Page title="Patient Monitoring" />} />
      <Route path="/command-monitor/analytics" element={<Page title="Analytics (lazy load ready)" />} />
      <Route path="/command-monitor/broadcast-alert" element={<Page title="Broadcast Alert" />} />
      <Route path="/command-monitor/settings-and-audit" element={<Page title="Settings & Audit" />} />
    </Routes>
  );
}
