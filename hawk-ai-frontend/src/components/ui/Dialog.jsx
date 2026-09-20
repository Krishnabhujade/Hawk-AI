import { useEffect, useRef } from 'react';
import Blueprint from './Blueprint';

/**
 * Modal dialog. Closes on Escape or a click on the backdrop, moves keyboard
 * focus into the dialog when it opens and gives it back when it closes.
 */
export default function Dialog({ open, onClose, labelledBy, children }) {
  const boxRef = useRef(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    boxRef.current?.querySelector('[data-autofocus], .dialog-actions button')?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <Blueprint className="dialog" role="dialog" aria-modal="true" aria-labelledby={labelledBy} ref={boxRef}>
        {children}
      </Blueprint>
    </div>
  );
}
