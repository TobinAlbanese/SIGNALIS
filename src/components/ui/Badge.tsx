import clsx from 'clsx';
import type { Confidence } from '../../types';

export function ConfidenceBadge({ value }: { value?: Confidence | string }) {
  const safe = value ?? '';
  return <span className={clsx('badge capitalize', safe ? `confidence-${safe}` : 'confidence-none')}>{safe ? safe.replaceAll('-', ' ') : 'No confidence'}</span>;
}

export function SourceBadge({ count }: { count: number }) {
  return <span className={clsx('badge', count ? 'confidence-high' : 'confidence-low')}>{count ? `${count} sources` : 'Unsourced'}</span>;
}

export function TypeBadge({ value }: { value: string }) {
  return <span className="badge bg-white/5 text-[color:var(--c-text-secondary)]">{value.replaceAll('-', ' ')}</span>;
}
