import type { UnitId } from '../../domain/types';

/** Own silhouettes, drawn in a box of about 20 x 20 centred on the origin. */
const SHAPES: Record<UnitId, string> = {
  fighter: 'M0,-8 L6,8 L0,4 L-6,8 Z',
  destroyer: 'M0,-10 L4,2 L3,9 L-3,9 L-4,2 Z',
  cruiser: 'M0,-10 L7,0 L4,9 L-4,9 L-7,0 Z',
  carrier: 'M-9,-4 L-4,-8 L4,-8 L9,-4 L9,5 L4,9 L-4,9 L-9,5 Z',
  dreadnought: 'M0,-10 L3,-4 L9,-2 L9,3 L3,4 L5,10 L-5,10 L-3,4 L-9,3 L-9,-2 L-3,-4 Z',
  warsun: 'M0,-9 A9,9 0 1 1 0,9 A9,9 0 1 1 0,-9 Z M0,-4 A4,4 0 1 0 0,4 A4,4 0 1 0 0,-4 Z',
  flagship: 'M0,-10 L3,-3 L10,-3 L4.5,2 L6.5,9 L0,5 L-6.5,9 L-4.5,2 L-10,-3 L-3,-3 Z',
  infantry: 'M0,-9 A3,3 0 1 1 0,-3 A3,3 0 1 1 0,-9 Z M-4,9 L-4,-1 L4,-1 L4,9 Z',
  mech: 'M-5,-9 L5,-9 L7,-2 L7,3 L4,3 L5,10 L1,10 L0,4 L-1,4 L-1,10 L-5,10 L-4,3 L-7,3 L-7,-2 Z',
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

/** A silhouette and, above one unit, the count beside it. Drawn at the origin; the caller positions it. */
export function UnitGlyph({ unit, owner, count, label, scale = 0.75 }: UnitGlyphProps) {
  return (
    <g role="img" aria-label={label} data-unit={unit} data-owner={owner}>
      <path d={SHAPES[unit]} fillRule="evenodd" transform={`scale(${scale})`} className={`unit unit-${owner}`} />
      {count > 1 && <text x={11 * scale + 3} y={4} className="unit-count">{count}</text>}
    </g>
  );
}
