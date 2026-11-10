import { useEffect, useState, type AnimationEvent, type CSSProperties, type ReactNode } from 'react';
import { animates } from '../common/motion';

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
  return (
    <>
      {onDismiss && <div className={`drawer-scrim${open ? '' : ' drawer-scrim-leaving'}`} data-testid="drawer-scrim" onClick={open ? onDismiss : undefined} />}
      <div className={`drawer ${className}${open ? '' : ' drawer-leaving'}`} onAnimationEnd={onEnd}>{children}</div>
    </>
  );
}

export interface DrawerSheetProps {
  title: string;
  /** The sheet's own layout: `legend-panel`, `components-panel`, `te-panel`. */
  className: string;
  style?: CSSProperties;
  children: ReactNode;
}

/** What a drawer holds: a sheet with its title, read as a dialog. */
export function DrawerSheet({ title, className, style, children }: DrawerSheetProps) {
  return (
    <aside className={className} role="dialog" aria-label={title} style={style}>
      <h2>{title}</h2>
      {children}
    </aside>
  );
}

export interface DrawerTabProps {
  /** The feet of the letters face the side the tab hangs on: a left tab reads from the top down, a right one from the bottom up. */
  side: 'left' | 'right';
  open: boolean;
  label?: string;
  className?: string;
  /** The tab stands aside: it is drawn, as a shade or on its way out, but is not there for the finger nor the screen reader. */
  aside?: boolean;
  style?: CSSProperties;
  onClick: () => void;
  children: ReactNode;
}

/** The vertical tab a drawer hangs on. */
export function DrawerTab({ side, open, label, className, aside, style, onClick, children }: DrawerTabProps) {
  return (
    <button
      type="button" className={`drawer-tab drawer-tab-${side}${className ? ` ${className}` : ''}${aside ? ' drawer-tab-aside' : ''}`} style={style}
      aria-pressed={open} aria-label={label} aria-hidden={aside || undefined} disabled={aside} tabIndex={aside ? -1 : undefined} onClick={onClick}
    >
      <span>{children}</span>
    </button>
  );
}
