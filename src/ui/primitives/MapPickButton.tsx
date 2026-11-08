import type { ReactNode } from 'react';

export interface MapPickButtonProps {
  /** The next tap on the map chooses for this button. */
  active: boolean;
  /** Starts the choice on the map, or calls it off when it is on. */
  onToggle: () => void;
  className?: string;
  children: ReactNode;
}

/** A button that hands the next tap on the map to its block: pressed while the map chooses for it. */
export function MapPickButton({ active, onToggle, className, children }: MapPickButtonProps) {
  return <button type="button" className={className} aria-pressed={active} onClick={onToggle}>{children}</button>;
}
