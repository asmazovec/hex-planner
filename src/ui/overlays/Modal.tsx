import { useEffect, type MouseEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { HexRemove } from '../primitives/Icon';

export interface ModalProps {
  /** The name of the dialog for the screen reader. */
  label: string;
  /** The box: `stage-dialog` for the big hex, `fac-sheet`, `link-dialog`. */
  className: string;
  /**
   * Given, Escape and a tap on the scrim close the window. Without it the window waits for a choice made inside it.
   */
  onClose?: () => void;
  /** Given with `onClose`, the window opens with a head: this title and the one close control. */
  title?: ReactNode;
  /** Renders into the body, above everything on the page. */
  portal?: boolean;
  children: ReactNode;
}

/** A window over the whole screen on a blurring scrim. */
export function Modal({ label, className, onClose, title, portal, children }: ModalProps) {
  const { t } = useTranslation();
  useEffect(() => {
    if (!onClose) return undefined;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const closeOutside = onClose && ((e: MouseEvent) => { if (e.target === e.currentTarget) onClose(); });
  const box = (
    <div className="stage" onClick={closeOutside}>
      <div className={className} role="dialog" aria-modal="true" aria-label={label}>
        {title !== undefined && onClose && (
          <div className="stage-head">
            <strong>{title}</strong>
            <HexRemove label={t('map.sheet.close')} onClick={onClose} />
          </div>
        )}
        {children}
      </div>
    </div>
  );
  return portal ? createPortal(box, document.body) : box;
}
