import type { ReactNode } from 'react';

export function SectionHeader({ title, eyebrow, actions }: { title: string; eyebrow?: string; actions?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow ? <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--c-accent)]">{eyebrow}</div> : null}
        <h1 className="text-2xl font-semibold leading-tight">{title}</h1>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
