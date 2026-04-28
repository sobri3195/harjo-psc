import type { ReactNode } from 'react';

export const cardClass =
  'rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 dark:border-slate-800 dark:bg-slate-900';

export const badgeVariants = {
  safe: 'bg-emerald-100 text-emerald-800',
  warning: 'bg-amber-100 text-amber-800',
  danger: 'bg-rose-100 text-rose-800',
  info: 'bg-blue-100 text-blue-800'
};

export function SectionCard(props: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className={`${cardClass} p-4`}>
      <header className="mb-3">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{props.title}</h3>
        {props.subtitle ? <p className="text-sm text-slate-500">{props.subtitle}</p> : null}
      </header>
      {props.children}
    </section>
  );
}

export function StatusBadge({ label, tone }: { label: string; tone: keyof typeof badgeVariants }) {
  return (
    <span className={`inline-flex min-h-7 items-center rounded-full px-3 text-xs font-semibold ${badgeVariants[tone]}`}>
      {label}
    </span>
  );
}
