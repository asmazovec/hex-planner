import type { UnitId } from '../../domain/types';

/** Own silhouettes, seen from the side with the bow to the right, in a box of about 24 x 16 centred on the origin. */
const SHAPES: Record<UnitId, string> = {
  fighter: 'M-7.7,-6.6 L-2.2,-1.8 L7.7,0 L-2.2,1.8 L-7.7,6.6 L-4.8,0 Z',
  destroyer: 'M-11,0 L-4.4,-3.5 L2.2,-2.2 L12.1,0 L2.2,2.2 L-4.4,3.5 Z',
  cruiser: 'M-11,-2.6 L2.2,-4 L12.1,0 L2.2,4 L-11,2.6 Z',
  carrier: 'M-11,-4.4 L7.7,-4.4 L12.1,0 L7.7,4.4 L-11,4.4 L-11,1.8 L-6.6,1.8 L-6.6,-1.8 L-11,-1.8 Z',
  dreadnought: 'M-12.1,-6.6 L4.4,-6.6 L12.1,-2.2 L12.1,2.2 L4.4,6.6 L-12.1,6.6 L-8.8,2.2 L-8.8,-2.2 Z',
  warsun: 'M0,-8.8 A8.8,8.8 0 1 1 0,8.8 A8.8,8.8 0 1 1 0,-8.8 Z M0,-3.6 A3.6,3.6 0 1 0 0,3.6 A3.6,3.6 0 1 0 0,-3.6 Z',
  flagship: 'M-12.1,-3.3 L-6.6,-3.3 L-8.8,-7.7 L-2.2,-7.7 L2.2,-3.3 L8.8,-2.2 L13,0 L8.8,2.2 L2.2,3.3 L-2.2,7.7 L-8.8,7.7 L-6.6,3.3 L-12.1,3.3 Z',
  infantry: 'M0,-8.4 A3.1,3.1 0 1 1 0,-2.2 A3.1,3.1 0 1 1 0,-8.4 Z M-4.4,-1.3 L4.4,-1.3 L3.3,3.1 L4,7.5 L1.1,7.5 L0,4 L-1.1,7.5 L-4,7.5 L-3.3,3.1 Z',
  mech: 'M-3.7,-8.8 H3.7 V-4 H-3.7 Z M-6.6,-3.3 H6.6 V3.3 H-6.6 Z M-10.1,-3.3 H-7.5 V4.2 H-10.1 Z M7.5,-3.3 H10.1 V4.2 H7.5 Z M-5.7,4 H-1.7 V9.2 H-5.7 Z M1.7,4 H5.7 V9.2 H1.7 Z',
};

export const UNIT_ORDER: UnitId[] = [
  'flagship', 'warsun', 'dreadnought', 'carrier', 'cruiser', 'destroyer', 'fighter', 'mech', 'infantry',
];

export interface UnitGlyphProps {
  unit: UnitId;
  owner: 'me' | 'enemy';
  count: number;
  /** Accessible name, e.g. "Carrier ×2". */
  label: string;
  scale?: number;
}

const BADGE_RADIUS = 6.5;

/** A silhouette and, above one unit, a count badge at its lower right. Drawn at the origin; the caller positions it. */
export function UnitGlyph({ unit, owner, count, label, scale = 0.85 }: UnitGlyphProps) {
  return (
    <g role="img" aria-label={label} data-unit={unit} data-owner={owner}>
      <path d={SHAPES[unit]} fillRule="evenodd" transform={`scale(${scale})`} className={`unit unit-${owner}`} />
      {count > 1 && (
        <g transform={`translate(${12 * scale + 2} ${BADGE_RADIUS - 1})`}>
          <circle r={BADGE_RADIUS} className={`unit-badge unit-badge-${owner}`} />
          <text y={3.2} className="unit-count">{count}</text>
        </g>
      )}
    </g>
  );
}
