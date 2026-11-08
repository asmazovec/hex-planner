import { useEffect, useState, type AnimationEvent, type ReactNode } from 'react';
// TODO(P2-237) #ws:ui-structure #type:arch #dep:P2-235 #size:s #drawer #overlays — Шторка и язычок — общие оверлеи, а лежат в map/ и тянут animates из хука жестов: перенести в overlays/, motion из common/motion.ts
import { animates } from './usePanZoom';

export interface DrawerProps {
  open: boolean;
  /** Where it comes from and how wide it is. */
  className: string;
  /** Given, the screen waits behind a blurring scrim, and a tap on it or Escape closes the drawer. Without it the drawer leaves the screen usable and only its tab closes it. */
  onDismiss?: () => void;
  children: ReactNode;
}

/** A sheet that slides out and back: it stays on the screen until its closing animation ends. */
export function Drawer({ open, className, onDismiss, children }: DrawerProps) {
  const [rendered, setRendered] = useState(open);
  if (open && !rendered) setRendered(true);
  if (!open && rendered && !animates()) setRendered(false);

  useEffect(() => {
    if (!open || !onDismiss) return undefined;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onDismiss(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onDismiss]);

  if (!rendered) return null;
  const onEnd = (event: AnimationEvent) => {
    if (!open && event.target === event.currentTarget) setRendered(false);
  };
  // TODO(P2-238) #ws:ui-containers #type:ui #size:m #drawer #drawer-sheet — Шторка даёт только коробку: каждое содержимое (легенда, улучшения, Thunder's Edge, игроки) собирает свой aside с role=dialog и h2; добавить DrawerSheet с title
  return (
    <>
      {onDismiss && <div className={`drawer-scrim${open ? '' : ' drawer-scrim-leaving'}`} data-testid="drawer-scrim" onClick={open ? onDismiss : undefined} />}
      <div className={`drawer ${className}${open ? '' : ' drawer-leaving'}`} onAnimationEnd={onEnd}>{children}</div>
    </>
  );
}

export interface DrawerTabProps {
  /** The feet of the letters face the side the tab hangs on: a left tab reads from the top down, a right one from the bottom up. */
  side: 'left' | 'right';
  open: boolean;
  label?: string;
  className?: string;
  onClick: () => void;
  children: ReactNode;
}

/** The vertical tab a drawer hangs on. */
export function DrawerTab({ side, open, label, className, onClick, children }: DrawerTabProps) {
  return (
    <button type="button" className={`drawer-tab drawer-tab-${side}${className ? ` ${className}` : ''}`} aria-pressed={open} aria-label={label} onClick={onClick}>
      <span>{children}</span>
    </button>
  );
}
