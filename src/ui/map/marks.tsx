import { playerStyle } from '../primitives/player';

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
