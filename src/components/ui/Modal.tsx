import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from './Button';

export function Modal({
  title,
  children,
  onClose,
  footer
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[color:var(--c-bg-modal-backdrop)] p-4" role="dialog" aria-modal="true">
      <div className="max-h-[88vh] w-full max-w-3xl overflow-hidden rounded-lg border border-white/10 bg-[#181818] shadow-glow">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="text-base font-semibold">{title}</h2>
          <Button aria-label="Close modal" variant="ghost" className="h-9 w-9 px-0" onClick={onClose} icon={<X size={18} />} />
        </div>
        <div className="max-h-[68vh] overflow-auto p-4 subtle-scroll">{children}</div>
        {footer ? <div className="border-t border-white/10 p-4">{footer}</div> : null}
      </div>
    </div>
  );
}
