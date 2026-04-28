import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export const cardClass =
  'rounded-3xl border border-slate-200 bg-white shadow-sm transition-all duration-200 dark:border-slate-800 dark:bg-slate-900';

export const badgeVariants = {
  safe: 'bg-emerald-100 text-emerald-800',
  warning: 'bg-amber-100 text-amber-800',
  danger: 'bg-rose-100 text-rose-800',
  info: 'bg-blue-100 text-blue-800',
  critical: 'bg-violet-100 text-violet-800'
};

export function SectionCard(props: { title: string; subtitle?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className={`${cardClass} p-4`}>
      <header className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{props.title}</h3>
          {props.subtitle ? <p className="text-sm text-slate-500">{props.subtitle}</p> : null}
        </div>
        {props.action}
      </header>
      {props.children}
    </section>
  );
}

export function StatusBadge({ label, tone }: { label: string; tone: keyof typeof badgeVariants }) {
  return (
    <span className={`inline-flex min-h-7 items-center gap-1 rounded-full px-3 text-xs font-semibold ${badgeVariants[tone]}`}>
      <span className="h-2 w-2 rounded-full bg-current" aria-hidden />
      {label}
    </span>
  );
}

export function StatsGrid({ items }: { items: Array<{ label: string; value: string; icon?: LucideIcon }> }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map(({ label, value, icon: Icon }) => (
        <article key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <p className="flex items-center gap-2 text-xs text-slate-500">{Icon ? <Icon size={14} /> : null}{label}</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
        </article>
      ))}
    </div>
  );
}

export function EmptyState({ title, description, cta }: { title: string; description: string; cta?: ReactNode }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-center">
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
      {cta ? <div className="mt-4">{cta}</div> : null}
    </div>
  );
}

export function SkeletonBlock({ className = 'h-4 w-full' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200 ${className}`} />;
}
