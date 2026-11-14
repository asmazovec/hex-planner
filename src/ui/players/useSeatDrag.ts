import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { Player } from '../../game/types';

const DRAG_DISTANCE = 6;
const LAND_MS = 230;

interface Gesture { index: number; x: number; y: number; on: boolean; }

const seatUnder = (x: number, y: number): number | null => {
  const seat = document.elementFromPoint(x, y)?.closest<SVGElement | HTMLElement>('[data-seat]')?.dataset.seat;
  return seat ? Number(seat) : null;
};
const placeGhost = (ghost: HTMLElement | null, x: number, y: number, scale: number) => {
  if (ghost) ghost.style.transform = `translate(${x + 14}px, ${y - 26}px) scale(${scale})`;
};

export interface SeatDrag {
  /** Player picked by a first tap; list position. */
  picked: number | null;
  /** Player being dragged; list position. */
  lifted: number | null;
  /** Seat the drag is over. */
  hoverSeat: number | null;
  /** Colours of the players that just changed seats, for the card badges. */
  bumped: number[];
  clearBump: () => void;
  ghostRef: React.RefObject<HTMLDivElement | null>;
  /** Starts a gesture on the token of a player. */
  onPointerDown: (index: number, event: ReactPointerEvent) => void;
  /** A tap from the keyboard. */
  tap: (index: number) => void;
}

/**
 * Moves seats by pointer: dragging a token onto another position swaps the two players, and two taps do the same.
 * Mouse and finger share pointer events; `pointercancel` drops the gesture and changes nothing.
 */
export function useSeatDrag(players: Player[], onSwap: (a: number, b: number) => void): SeatDrag {
  const [picked, setPicked] = useState<number | null>(null);
  const [lifted, setLifted] = useState<number | null>(null);
  const [hoverSeat, setHoverSeat] = useState<number | null>(null);
  const [bumped, setBumped] = useState<number[]>([]);
  const ghostRef = useRef<HTMLDivElement | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const landTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latest = useRef({ players, onSwap, picked });
  useEffect(() => { latest.current = { players, onSwap, picked }; });

  useEffect(() => () => {
    stopRef.current?.();
    clearTimeout(landTimer.current);
  }, []);

  const swap = useCallback((a: number, b: number) => {
    const { players: list, onSwap: apply } = latest.current;
    setBumped([list[a].color, list[b].color]);
    setPicked(null);
    apply(a, b);
  }, []);

  const tap = useCallback((index: number) => {
    const first = latest.current.picked;
    if (first === null) setPicked(index);
    else if (first === index) setPicked(null);
    else swap(first, index);
  }, [swap]);

  const finishGhost = useCallback((target: Element | null) => {
    const ghost = ghostRef.current;
    if (!ghost) return;
    ghost.classList.remove('up');
    if (!target) {
      ghost.style.display = 'none';
      return;
    }
    const rect = target.getBoundingClientRect();
    ghost.classList.add('land');
    ghost.style.transform = `translate(${rect.left + rect.width / 2 - 30}px, ${rect.top + rect.height / 2 - 25}px) scale(0.35)`;
    clearTimeout(landTimer.current);
    landTimer.current = setTimeout(() => {
      ghost.style.display = 'none';
      ghost.classList.remove('land');
    }, LAND_MS);
  }, []);

  const onPointerDown = useCallback((index: number, event: ReactPointerEvent) => {
    if (event.button !== 0 || event.isPrimary === false || stopRef.current) return;
    event.preventDefault();
    const gesture: Gesture = { index, x: event.clientX, y: event.clientY, on: false };
    const ghost = ghostRef.current;

    const lift = (e: PointerEvent) => {
      gesture.on = true;
      setLifted(index);
      document.body.classList.add('seat-dragging');
      if (!ghost) return;
      clearTimeout(landTimer.current);
      ghost.classList.remove('land');
      ghost.style.display = 'flex';
      ghost.style.transition = 'none';
      placeGhost(ghost, e.clientX, e.clientY, 0.92);
      ghost.getBoundingClientRect();
      ghost.style.transition = '';
      ghost.classList.add('up');
    };
    const move = (e: PointerEvent) => {
      if (!gesture.on && Math.hypot(e.clientX - gesture.x, e.clientY - gesture.y) < DRAG_DISTANCE) return;
      if (!gesture.on) lift(e);
      placeGhost(ghost, e.clientX, e.clientY, 1);
      setHoverSeat(seatUnder(e.clientX, e.clientY));
    };
    const stopScroll = (e: TouchEvent) => { if (gesture.on) e.preventDefault(); };
    const stop = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
      window.removeEventListener('touchmove', stopScroll);
      document.body.classList.remove('seat-dragging');
      stopRef.current = null;
      setLifted(null);
      setHoverSeat(null);
    };
    const up = (e: PointerEvent) => {
      stop();
      if (!gesture.on) {
        tap(index);
        return;
      }
      const { players: list } = latest.current;
      const seat = seatUnder(e.clientX, e.clientY);
      const other = seat === null ? -1 : list.findIndex(p => p.seat === seat);
      if (other >= 0 && other !== index) {
        swap(index, other);
        finishGhost(document.querySelector(`[data-seat-spot="${seat}"]`));
      } else {
        finishGhost(document.querySelector(`[data-seat-spot="${list[index].seat}"]`));
      }
    };
    const cancel = () => {
      stop();
      if (gesture.on) finishGhost(null);
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
    window.addEventListener('touchmove', stopScroll, { passive: false });
    stopRef.current = stop;
  }, [finishGhost, swap, tap]);

  const clearBump = useCallback(() => setBumped([]), []);

  return { picked, lifted, hoverSeat, bumped, clearBump, ghostRef, onPointerDown, tap };
}
