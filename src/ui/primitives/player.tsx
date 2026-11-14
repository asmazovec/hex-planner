import type { CSSProperties, ReactNode } from 'react';
import type { DataPack } from '../../domain/types';
import { nameTag, shortName } from '../players/names';

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
  /** The name: a short faction name, "mine", "none". */
  label: string;
  /** No colour, no underline: "none" has neither. */
  color?: number;
  /** What stands instead of the name when many players share the line; the name stays for the screen reader. */
  tag?: string;
}

/** Up to this many players on the line keep whole names; with more, each shows its tag. */
const FULL_NAMES_UP_TO = 4;

/** The tag of a player on a crowded line: three letters of a faction, the seat number without one. */
export const playerTag = (name: string, hasFaction: boolean, seat: number): string => (hasFaction ? nameTag(name) : String(seat));

/**
 * Players as the options of a choice, named as everywhere: the short name of the faction (`named` says what a player
 * without a faction is called), the colour, the tag for a crowded line.
 */
export const playerOptions = (players: { id: string; faction: string; color: number; seat: number }[], pack: DataPack, named: (id: string) => string): PlayerOption[] => players.map(o => {
  const label = shortName(pack, o.faction, named(o.id));
  return { value: o.id, label, color: o.color, tag: playerTag(label, Boolean(pack.factions[o.faction]), o.seat) };
});

export interface PlayerChoiceProps {
  /** The name of the group for the screen reader. */
  label: string;
  options: PlayerOption[];
  chosen: (value: string | null) => boolean;
  onPick: (value: string | null) => void;
  /** Added to the group. */
  className?: string;
}

/**
 * Players to choose from: one line of joined buttons, each underlined in the player's colour. With many players the
 * names give way to tags, so six or eight still fit on the line.
 */
export function PlayerChoice({ label, options, chosen, onPick, className }: PlayerChoiceProps) {
  const crowded = options.filter(o => o.color !== undefined).length > FULL_NAMES_UP_TO;
  return (
    <div className={`segment player-choice${className ? ` ${className}` : ''}`} role="group" aria-label={label}>
      {options.map(o => {
        const short = crowded && o.tag !== undefined;
        return (
          <button
            key={String(o.value)} type="button" aria-pressed={chosen(o.value)} aria-label={short ? o.label : undefined}
            style={playerStyle('--owner', o.color)} onClick={() => onPick(o.value)}
          >
            {short ? o.tag : o.label}
          </button>
        );
      })}
    </div>
  );
}
