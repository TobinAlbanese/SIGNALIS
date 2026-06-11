import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import clsx from 'clsx';

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium text-[color:var(--c-text-secondary)]">{label}</span>
      {children}
      {hint ? <span className="text-xs text-[color:var(--c-text-secondary)]">{hint}</span> : null}
    </label>
  );
}

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function TextInput(props, ref) {
  return (
    <input
      {...props}
      ref={ref}
      className={clsx(
        'min-h-10 rounded-md border border-[color:var(--c-input-border)] bg-black/20 px-3 text-sm text-[color:var(--c-text)] placeholder:text-white/35',
        props.className
      )}
    />
  );
});

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function TextArea(props, ref) {
  return (
    <textarea
      {...props}
      ref={ref}
      className={clsx(
        'min-h-24 resize-y rounded-md border border-[color:var(--c-input-border)] bg-black/20 px-3 py-2 text-sm text-[color:var(--c-text)] placeholder:text-white/35',
        props.className
      )}
    />
  );
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(props, ref) {
  return (
    <select
      {...props}
      ref={ref}
      className={clsx(
        'min-h-10 rounded-md border border-[color:var(--c-input-border)] bg-[color:var(--dropdown-bg)] px-3 text-sm text-[color:var(--dropdown-text)]',
        props.className
      )}
    />
  );
});
