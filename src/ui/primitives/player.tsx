import type { CSSProperties, ReactNode } from 'react';

/** The theme variable of a player's colour: `--player-1` to `--player-8`. */
export const playerVar = (color: number): string => `var(--player-${color})`;

/** A style that paints one property, or a custom property such as `--owner`, in a player's colour; none without a colour. */
export const playerStyle = (property: string, color: number | undefined): CSSProperties | undefined =>
  (color === undefined ? undefined : { [property]: playerVar(color) } as CSSProperties);

export interface PlayerDotProps {
  color: number;
  /** The size and shape: the small dot before a name by default, a numbered badge with its own class. */
  className?: string;
  children?: ReactNode;
}

/** The circle of a player's colour: before a name, or as a badge with the seat number in it. */
export function PlayerDot({ color, className = 'owner-dot', children }: PlayerDotProps) {
  return <span className={className} aria-hidden={children === undefined ? 'true' : undefined} style={{ background: playerVar(color) }}>{children}</span>;
}

export interface PlayerOption {
  /** What a tap chooses; null stands for no player. */
  value: string | null;
  label: ReactNode;
  /** No colour, no dot: "none" has neither. */
  color?: number;
  /** A shorter label shown instead of the name keeps the full name for the screen reader. */
  ariaLabel?: string;
}

export interface PlayerChoiceProps {
  /** The name of the group; without it the buttons stand alone in their block. */
  label?: string;
  options: PlayerOption[];
  chosen: (value: string | null) => boolean;
  onPick: (value: string | null) => void;
  /** Added to the group, e.g. `acting-for`. */
  className?: string;
  /** The class of each button when they stand alone, e.g. `option`. */
  buttonClassName?: string;
  /**
   * How the colour shows: a dot before the name, or the `--owner` variable that the group's own rule paints with.
   */
  colour?: 'dot' | 'owner';
}

/** Players to choose from: joined buttons, each with the player's colour and name. */
export function PlayerChoice({ label, options, chosen, onPick, className, buttonClassName, colour = 'dot' }: PlayerChoiceProps) {
  const buttons = options.map(o => (
    <button
      key={String(o.value)} type="button" className={buttonClassName} aria-pressed={chosen(o.value)} aria-label={o.ariaLabel}
      style={colour === 'owner' ? playerStyle('--owner', o.color) : undefined} onClick={() => onPick(o.value)}
    >
      {colour === 'dot' && o.color !== undefined && <PlayerDot color={o.color} />}
      {o.label}
    </button>
  ));
  if (label === undefined) return <>{buttons}</>;
  return <div className={`segment player-choice${className ? ` ${className}` : ''}`} role="group" aria-label={label}>{buttons}</div>;
}
