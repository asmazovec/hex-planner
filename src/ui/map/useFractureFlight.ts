import { useMemo, useState, type CSSProperties } from 'react';
import { fractureSlots } from '../../domain/thundersEdge';
import type { DataPack } from '../../domain/types';
import { mapSource } from '../../game/space';
import { seatCount } from '../../game/tile';
import type { Board, Table } from '../../game/types';
import { animates } from '../common/motion';
import { fractureFrame } from './geometry';

/** Where a Fracture tile flies in from: out from the middle of the group, further for those at its ends. */
const FLY_FROM = 1.6;
const FLY_OUT = 150;
const FLY_STEP_MS = 55;

/**
 * Where the Fracture stands on the map and how it comes and goes: opening it or moving it flies its tiles in, and the
 * seat it left fades. Only opening it or moving it plays: coming back to a map where it stands open does not.
 * `mapSlots` are the slots of the map without the Fracture.
 */
export function useFractureFlight(table: Table, board: Board, pack: DataPack, mapSlots: { q: number; r: number }[]) {
  const { active, seat } = mapSource(table, board).fracture;
  const playerCount = seatCount(table);
  const layout = table.layout;
  const fractureAt = useMemo(() => (active ? fractureSlots(seat, playerCount, pack, layout) : []), [pack, active, seat, playerCount, layout]);
  const fracture = useMemo(() => (fractureAt.length === 0 ? null : fractureFrame(mapSlots, fractureAt)), [fractureAt, mapSlots]);
  // A new run starts the animation anew.
  const [seenPlace, setSeenPlace] = useState({ active, seat });
  const [opening, setOpening] = useState(false);
  const [flyRun, setFlyRun] = useState(0);
  /** The seat the Fracture has just left: it stays there a moment, fading, and no longer counts for the frame of the map. */
  const [leftSeat, setLeftSeat] = useState<{ seat: number | null } | null>(null);
  if (seenPlace.active !== active || seenPlace.seat !== seat) {
    setSeenPlace({ active, seat });
    setOpening(active);
    setLeftSeat(seenPlace.active && animates() ? { seat: seenPlace.seat } : null);
    setFlyRun(flyRun + 1);
  }
  const leaving = useMemo(() => {
    if (!leftSeat) return null;
    const slots = fractureSlots(leftSeat.seat, playerCount, pack, layout);
    return slots.length === 0 ? null : fractureFrame(mapSlots, slots);
  }, [leftSeat, playerCount, pack, layout, mapSlots]);
  /** How a Fracture tile comes to its place. */
  const flyStyle = (index: number): CSSProperties | undefined => {
    if (!fracture) return undefined;
    const apex = fracture.spots[Math.floor(fracture.spots.length / 2)];
    const spot = fracture.spots[index];
    const length = Math.hypot(apex.x, apex.y) || 1;
    const x = (spot.x - apex.x) * FLY_FROM + (apex.x / length) * FLY_OUT;
    const y = (spot.y - apex.y) * FLY_FROM + (apex.y / length) * FLY_OUT;
    const step = Math.abs(index - Math.floor(fracture.spots.length / 2));
    return { '--fly-x': `${x.toFixed(1)}px`, '--fly-y': `${y.toFixed(1)}px`, animationDelay: `${step * FLY_STEP_MS}ms` } as CSSProperties;
  };
  /** The seat left behind has faded out. */
  const leftGone = () => setLeftSeat(null);
  return { fractureAt, fracture, leaving, opening, flyRun, flyStyle, leftGone };
}
