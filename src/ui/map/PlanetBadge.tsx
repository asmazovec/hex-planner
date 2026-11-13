import type { PlanetValues } from '../../domain/payment';
import type { PlanetDef } from '../../domain/types';
import { PlanetMark } from './TileView';

export interface PlanetBadgeProps {
  planet: PlanetDef;
  control?: 'me' | 'enemy';
  /** The colour number of the player who holds it, where the edge shows the holder and not only mine or theirs. */
  holderColor?: number;
  exhausted: boolean;
  /** Resources and influence after the components that change them; the printed ones without it. */
  values?: PlanetValues;
  /** A small line under the name: ready or exhausted, whose it is. */
  facts?: string;
  /** The place of a row: a smaller picture and a narrow name. */
  compact?: boolean;
  /** Only the picture: the name stands beside it in the caller's own words. */
  bare?: boolean;
}

const PX = 52;
const COMPACT_PX = 36;

/**
 * A planet as the map draws it, small, with its name beside it: the disc with its traits, resources and influence, the
 * marks of technology and legend, the strike when exhausted, the edge of who controls it. The one way to name a planet
 * beside a choice.
 */
export function PlanetBadge({ planet, control, holderColor, exhausted, values, facts, compact, bare }: PlanetBadgeProps) {
  const px = compact ? COMPACT_PX : PX;
  return (
    <span className={`planet-badge${compact ? ' planet-badge-compact' : ''}`}>
      <svg viewBox="-12 -12 24 24" width={px} height={px} aria-hidden="true">
        {/* The numbers of a planet take their size from the tile they stand on. */}
        <g className="tile">
          <g className={`planet${exhausted ? ' planet-exhausted' : ''}`} data-control={control ?? 'none'} data-exhausted={exhausted ? 'true' : 'false'}>
            <PlanetMark planet={planet} control={control} holderColor={holderColor} exhausted={exhausted} values={values} />
          </g>
        </g>
      </svg>
      {!bare && (
        <span>
          <strong>{planet.name}</strong>
          {facts && <small>{facts}</small>}
        </span>
      )}
    </span>
  );
}

/** The space area of a system as the place of a row: a quiet hexagon and its name, in the box of a compact planet. */
export function SpaceBadge({ label }: { label: string }) {
  return (
    <span className="planet-badge planet-badge-compact">
      <svg viewBox="-12 -12 24 24" width={COMPACT_PX} height={COMPACT_PX} aria-hidden="true">
        <polygon points="9,0 4.5,7.8 -4.5,7.8 -9,0 -4.5,-7.8 4.5,-7.8" className="space-mark" />
      </svg>
      <span><strong>{label}</strong></span>
    </span>
  );
}
