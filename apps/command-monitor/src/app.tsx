import { lazy, Suspense, useMemo, useState } from 'react';
import { Route, Routes, NavLink, Navigate } from 'react-router-dom';
import { Bell, Search, Siren, Ambulance, Activity, BarChart3, Megaphone, ShieldCheck, Users, ClipboardList, LogIn } from 'lucide-react';
import { SectionCard, SkeletonBlock, StatusBadge } from '@harjo/ui';
import {
  useAmbulanceTracking,
  useAuth,
  useDispatchNearestAmbulance,
  useEmergencyTimeline,
  useRealtimeAmbulanceTracking,
  useRealtimeEmergencyReports,
  useUserRole
} from '@harjo/lib';

const menu = [
  { label: 'Live Command Center', path: '/command-monitor/live-command-center', icon: Siren },
  { label: 'Emergency Reports', path: '/command-monitor/emergency-reports', icon: ClipboardList },
  { label: 'Dispatch Board', path: '/command-monitor/dispatch-board', icon: Activity },
  { label: 'Fleet Monitor', path: '/command-monitor/fleet-monitor', icon: Ambulance },
  { label: 'Medical Team', path: '/command-monitor/medical-team', icon: Users },
  { label: 'Patient Monitoring', path: '/command-monitor/patient-monitoring', icon: Activity },
  { label: 'Analytics', path: '/command-monitor/analytics', icon: BarChart3 },
  { label: 'Broadcast Alert', path: '/command-monitor/broadcast-alert', icon: Megaphone },
  { label: 'Settings & Audit', path: '/command-monitor/settings-and-audit', icon: ShieldCheck }
] as const;

const LazyAnalytics = lazy(async () => ({
  default: () => (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Analytics</h1>
      <div className="grid grid-cols-2 gap-4">
        <SectionCard title="Response Time"><p className="text-sm text-slate-600">Trend harian/mingguan/bulanan.</p></SectionCard>
        <SectionCard title="SLA Compliance"><p className="text-sm text-slate-600">Distribusi kepatuhan SLA per area.</p></SectionCard>
      </div>
      <SectionCard title="Export"><p className="text-sm text-slate-600">Export CSV/PDF placeholder.</p></SectionCard>
    </section>
  )
}));

function Layout({ children }: { children: React.ReactNode }) {
  const { data: role } = useUserRole();

  return (
    <div className="grid min-h-screen grid-cols-[280px_1fr] bg-slate-50">
      <aside className="border-r border-slate-200 bg-white p-4">
        <h2 className="mb-4 text-lg font-semibold">Harjo Command Monitor</h2>
        <nav className="space-y-1">
          {menu.map(({ label, path, icon: Icon }) => (
            <NavLink key={label} to={path} className={({ isActive }) => `flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm ${isActive ? 'bg-blue-50 text-primary' : 'text-slate-600 hover:bg-slate-100'}`}>
              <Icon size={16} />{label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <section>
        <header className="flex h-[68px] items-center justify-between border-b border-slate-200 bg-white px-5">
          <div className="flex items-center gap-2 text-sm text-slate-500"><Search size={18} />Cari kejadian / unit / pasien</div>
          <div className="flex items-center gap-4 text-sm text-slate-600"><Bell size={18} />{role ?? 'admin'}</div>
        </header>
        <div className="p-5">{children}</div>
      </section>
    </div>
  );
}

function AuthPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <SectionCard title="Login Command Monitor" subtitle="Wajib login untuk akses admin website">
        <button className="min-h-12 w-full rounded-2xl bg-primary text-white"><LogIn className="mr-1 inline" size={16} />Masuk dengan Supabase Auth</button>
      </SectionCard>
    </main>
  );
}

function NotFoundPage() {
  return <main className="p-10 text-center text-slate-600">Halaman tidak ditemukan.</main>;
}

function Guard({ children }: { children: React.ReactNode }) {
  const { data: session } = useAuth();
  if (!session) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function LiveCommandCenterPage() {
  const [criticalToast, setCriticalToast] = useState<string | null>(null);
  const { data: reports = [], isLoading: reportsLoading, error: reportsError } = useRealtimeEmergencyReports({
    onCritical: (report) => {
      setCriticalToast(`🚨 CRITICAL: ${report.type}`);
      window.setTimeout(() => setCriticalToast(null), 4000);
    }
  });
  const { markers } = useRealtimeAmbulanceTracking(1000);
  const ambulanceSnapshot = useAmbulanceTracking();
  const dispatchNearest = useDispatchNearestAmbulance();

  const active = reports.filter((item) => !['completed', 'cancelled'].includes(item.status));
  const pending = active.filter((item) => ['reported', 'dispatching'].includes(item.status));
  const critical = active.filter((item) => item.severity === 'kritis');
  const activeDispatches = active.filter((item) => ['ambulance_assigned', 'en_route', 'on_scene', 'transporting'].includes(item.status));

  const avgResponse = useMemo(() => {
    const dispatchRows = (ambulanceSnapshot.data ?? []).filter((row) => typeof row.updated_at === 'string');
    if (!dispatchRows.length) return 'n/a';
    const avgMinutes = Math.round(
      dispatchRows.reduce((acc, row) => acc + (Date.now() - new Date(String(row.updated_at)).getTime()) / 60000, 0) / dispatchRows.length
    );
    return `${Math.max(avgMinutes, 1)}m`;
  }, [ambulanceSnapshot.data]);

  const firstPending = pending[0];
  const timeline = useEmergencyTimeline(firstPending?.id);

  return (
    <Layout>
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900">Live Command Center</h1>

        {criticalToast ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-700">{criticalToast}</div> : null}
        {reportsError ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Realtime error: {reportsError.message}</div> : null}

        <div className="grid grid-cols-5 gap-3">
          {[
            ['Pending reports', String(pending.length)],
            ['Critical cases', String(critical.length)],
            ['Ambulances available', String(markers.filter((x) => !x.isOffline && x.status === 'available').length)],
            ['Average response', avgResponse],
            ['Active dispatches', String(activeDispatches.length)]
          ].map(([label, value]) => (
            <SectionCard key={label} title={String(value)} subtitle={String(label)}><div /></SectionCard>
          ))}
        </div>

        <div className="grid grid-cols-[1fr_360px] gap-4">
          <SectionCard title="Live Map" subtitle="Emergency markers + ambulance markers + route lines (demo)">
            <div className="h-[420px] space-y-3 overflow-auto rounded-2xl bg-slate-100 p-4 text-sm text-slate-600">
              <p className="font-medium text-slate-700">Emergency markers</p>
              {active.slice(0, 8).map((incident) => (
                <p key={incident.id}>📍 {incident.type} ({incident.severity}) - {incident.latitude.toFixed(4)}, {incident.longitude.toFixed(4)}</p>
              ))}
              <p className="pt-2 font-medium text-slate-700">Ambulance markers</p>
              {markers.slice(0, 8).map((marker) => (
                <p key={marker.ambulanceId}>🚑 {marker.ambulanceId} - {marker.status} {marker.isOffline ? '(offline)' : '(online)'} @ {marker.latitude.toFixed(4)}, {marker.longitude.toFixed(4)}</p>
              ))}
              <p className="pt-2 font-medium text-slate-700">Route lines</p>
              {active.slice(0, 3).map((incident) => (
                <p key={`route-${incident.id}`}>↔ Route candidate for {incident.type} ({incident.status})</p>
              ))}
            </div>
          </SectionCard>

          <div className="space-y-4">
            <SectionCard
              title="Incident list"
              subtitle="Realtime + severity sorting"
              action={
                firstPending ? (
                  <button
                    className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
                    disabled={dispatchNearest.isPending}
                    onClick={() => dispatchNearest.mutate({
                      emergency_report_id: firstPending.id,
                      latitude: firstPending.latitude,
                      longitude: firstPending.longitude,
                      severity: firstPending.severity
                    })}
                  >
                    {dispatchNearest.isPending ? 'Dispatching...' : 'Auto Dispatch Nearest'}
                  </button>
                ) : null
              }
            >
              {reportsLoading ? <SkeletonBlock className="h-32" /> : null}
              <div className="space-y-2">
                {active.slice(0, 6).map((incident) => (
                  <article key={incident.id} className="rounded-xl border border-slate-200 p-3 text-sm">
                    <div className="flex items-center justify-between"><p className="font-medium">{incident.type}</p><StatusBadge label={incident.severity} tone={incident.severity === 'kritis' ? 'danger' : 'warning'} /></div>
                    <p className="mt-1 text-xs text-slate-500">{incident.status} • {new Date(incident.createdAt).toLocaleString('id-ID')}</p>
                  </article>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Timeline" subtitle={firstPending ? `Emergency ${firstPending.id.slice(0, 8)}` : 'Pilih laporan aktif'}>
              <div className="space-y-2 text-sm text-slate-600">
                {(timeline.data ?? []).map((item) => (
                  <p key={`${item.status}-${item.at}`}>• {item.status} — {new Date(item.at).toLocaleString('id-ID')}</p>
                ))}
                {!timeline.data?.length ? <p>Tidak ada event timeline.</p> : null}
              </div>
            </SectionCard>
          </div>
        </div>
      </section>
    </Layout>
  );
}

function GenericPage({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <Layout>
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        <SectionCard title={title} subtitle={subtitle}><p className="text-sm text-slate-600">Module siap untuk data Supabase realtime + audit log.</p></SectionCard>
      </section>
    </Layout>
  );
}

export function CommandMonitorApp() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/command-monitor" element={<Navigate to="/command-monitor/live-command-center" replace />} />
      <Route path="/command-monitor/live-command-center" element={<Guard><LiveCommandCenterPage /></Guard>} />
      <Route path="/command-monitor/emergency-reports" element={<Guard><GenericPage title="Emergency Reports" subtitle="Data table + filters + detail drawer + audit log" /></Guard>} />
      <Route path="/command-monitor/dispatch-board" element={<Guard><GenericPage title="Dispatch Board" subtitle="Kanban + auto-dispatch recommendation + manual override" /></Guard>} />
      <Route path="/command-monitor/fleet-monitor" element={<Guard><GenericPage title="Fleet Monitor" subtitle="Fleet table + map + maintenance queue" /></Guard>} />
      <Route path="/command-monitor/medical-team" element={<Guard><GenericPage title="Medical Team" subtitle="Roster + availability + certification + shift" /></Guard>} />
      <Route path="/command-monitor/patient-monitoring" element={<Guard><GenericPage title="Patient Monitoring" subtitle="Active patient list + chart + handover status" /></Guard>} />
      <Route
        path="/command-monitor/analytics"
        element={
          <Guard>
            <Layout>
              <Suspense fallback={<div className="space-y-3"><SkeletonBlock className="h-8 w-52" /><SkeletonBlock className="h-36" /></div>}>
                <LazyAnalytics />
              </Suspense>
            </Layout>
          </Guard>
        }
      />
      <Route path="/command-monitor/broadcast-alert" element={<Guard><GenericPage title="Broadcast Alert" subtitle="Form + preview + audit broadcast" /></Guard>} />
      <Route path="/command-monitor/settings-and-audit" element={<Guard><GenericPage title="Settings & Audit" subtitle="Role management + RLS policy mapping + system health" /></Guard>} />
      <Route path="/not-found" element={<NotFoundPage />} />
      <Route path="*" element={<Navigate to="/not-found" replace />} />
    </Routes>
  );
}
