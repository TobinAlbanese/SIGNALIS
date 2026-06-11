import clsx from 'clsx';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
}

export function Button({ children, className, icon, variant = 'secondary', ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex min-h-9 items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium transition',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variant === 'primary' && 'border-[color:var(--c-accent)] bg-[color:var(--c-accent)] text-white hover:brightness-110',
        variant === 'secondary' && 'border-white/10 bg-white/[0.06] text-[color:var(--c-text)] hover:bg-white/[0.1]',
        variant === 'ghost' && 'border-transparent bg-transparent text-[color:var(--c-text-secondary)] hover:bg-white/[0.06] hover:text-[color:var(--c-text)]',
        variant === 'danger' && 'border-red-500/40 bg-red-500/15 text-red-100 hover:bg-red-500/25',
        className
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
