import type { TechType } from '../../domain/types';
import { playerStyle } from '../primitives/player';

/** One simple shape per technology type in a box of 8 around the centre, so the colour is not the only sign. */
export const TECH_SHAPES: Record<TechType, string> = {
  propulsion: 'M0,-3.9 L3.6,2.6 L-3.6,2.6 Z',
  biotic: 'M0,-3.6 A3.6,3.6 0 1 1 0,3.6 A3.6,3.6 0 1 1 0,-3.6 Z',
  cybernetic: 'M0,-4 L4,0 L0,4 L-4,0 Z',
  warfare: 'M-3.2,-3.2 L3.2,-3.2 L3.2,3.2 L-3.2,3.2 Z',
};

/** The legendary mark of a planet: a four-point star in the same box as the technology shapes. */
export const LEGENDARY_SHAPE = 'M0,-4.2 L1.2,-1.2 L4.2,0 L1.2,1.2 L0,4.2 L-1.2,1.2 L-4.2,0 L-1.2,-1.2 Z';

/** A technology type as the planets on the map show it, standing alone in the text. */
export function TechMark({ type, size = 12 }: { type: TechType; size?: number }) {
  return (
    <svg viewBox="-5 -5 10 10" width={size} height={size} className="tech-mark" aria-hidden="true">
      <path d={TECH_SHAPES[type]} className={`planet-tech planet-tech-${type}`} />
    </svg>
  );
}

/**
 * The hexagon of an arrow's number, and the gap cut around it in the arrows: the same hexagon, 1.4 times its size. They
 * are hexPoints(10.5) and hexPoints(15) rounded as they were first drawn; hexPoints itself writes 9.09 for 9.1 and moves
 * the edges by a tenth of a pixel. The legend draws its small hexes with the larger one.
 */
export const BADGE_HEX = '10.5,0 5.25,9.1 -5.25,9.1 -10.5,0 -5.25,-9.1 5.25,-9.1';
export const BADGE_CUT = '15,0 7.5,13 -7.5,13 -15,0 -7.5,-13 7.5,-13';

/** A command token in a box of 14 around the centre: mine without a colour, an opponent's in theirs. */
export function CommandTokenMark({ color }: { color?: number }) {
  return (
    <>
      <circle r={7} className="token" style={playerStyle('fill', color)} />
      <path d="M-3,2 L0,-4 L3,2 Z" className="token-mark" />
    </>
  );
}

/** The marker of a Fracture ingress, in a box of 16 around the centre. */
export function IngressMark() {
  return <path d="M0,-8 L8,0 L0,8 L-8,0 Z" className="ingress" />;
}

/** The number of an arrow in its hexagon; on the map a casing parts it from what lies under it. */
export function RouteBadge({ number, casing }: { number: number; casing?: boolean }) {
  return (
    <>
      {casing && <polygon points={BADGE_HEX} className="route-badge-casing" />}
      <polygon points={BADGE_HEX} className="route-badge-hex" />
      <text y={4} className="route-badge-number">{number}</text>
    </>
  );
}

/** How many units a route picks up on the way, beside the system where it takes them. */
export function PickupTag({ count }: { count: number }) {
  return (
    <>
      <rect x={-14} y={-9} width={28} height={18} rx={9} />
      <text y={4}>+{count}</text>
    </>
  );
}
