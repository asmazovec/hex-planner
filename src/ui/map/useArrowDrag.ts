import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import { routeFromPath, strokeStep, type RouteDraft } from '../../domain/route';
import { reducedMotion } from '../common/motion';
import { clearRect, edgePan, EDGE_PAN_MAX, EDGE_PAN_STEADY, EDGE_ZONE, type MapPan } from './edgePan';

/**
 * The route under way: `path` holds its hexes in the order they were drawn. `reverse` means the drag runs from the
 * active system towards a source. The screen point is given while a finger pulls it: where the pointer was when the
 * path last changed. A route laid by taps has neither.
 */
export interface RouteDraftView { path: string[]; reverse?: boolean; clientX?: number; clientY?: number }

/** The route a finger is pulling: it always has its screen point and direction. */
export type ArrowPreview = Required<RouteDraftView>;

export interface ArrowDragOptions {
  activeSystem: string | null;
  /** The route in flight order, whichever way it was drawn. */
  onComplete: (route: RouteDraft) => void;
  onCancel: () => void;
  /** The finger was lifted short of the end of the route: the path waits for more taps or another stroke. */
  onPause?: (path: string[]) => void;
  /** Only such hexes join a route; by default every hex. */
  isSystem?: (slot: string) => boolean;
  /** The map under the stroke: a finger near the edge of its area moves it. Without it the map stays. */
  pan?: RefObject<MapPan | null>;
}

const slotAt = (x: number, y: number): string | null =>
  document.elementFromPoint(x, y)?.closest<HTMLElement | SVGElement>('[data-slot]')?.dataset.slot ?? null;

/** Below this a press has gone nowhere, in screen pixels: a tap near the edge does not move the map. */
const TAP_SLOP = 6;
const FIRST_FRAME_MS = 16;
/** A frame that came late moves the map no further than this many milliseconds would. */
const LONGEST_FRAME_MS = 50;

/**
 * One finger pulls a route between a tile and the active system, hex by hex: each hex entered is added, the previous one
 * removes the last step. Only a change of the route renders; a second finger cancels the stroke, so the map can pinch.
 * A stroke can go on from a path laid before, and one lifted short of the active system hands its path to `onPause`.
 * Near the edge of the map area the map follows the finger, and the systems it brings under the finger join the route.
 */
export function useArrowDrag(options: ArrowDragOptions) {
  const { activeSystem } = options;
  const [drag, setDrag] = useState<(ArrowPreview & { pointerId: number }) | null>(null);
  const pointerId = drag?.pointerId ?? null;
  const path = useRef<string[]>([]);
  /** The path the stroke began with: a press that changes nothing is a tap. */
  const started = useRef<string[]>([]);
  /** Where the stroke was pressed, and whether the finger has left that spot since. */
  const pressed = useRef({ x: 0, y: 0, left: false });
  /** What the screen asks of the stroke now: a stroke lasts over many renders, and each brings new callbacks. */
  const latest = useRef(options);
  useEffect(() => { latest.current = options; });

  useEffect(() => {
    if (pointerId === null) return undefined;
    const at = { x: pressed.current.x, y: pressed.current.y };
    let frame: number | null = null;
    let last: number | null = null;
    let area: ReturnType<MapPan['area']> | null = null;

    const step = (): boolean => {
      const { isSystem } = latest.current;
      const over = slotAt(at.x, at.y);
      if (over === null || (isSystem && !isSystem(over))) return false;
      const next = strokeStep(path.current, over);
      path.current = next.path;
      return next.kind !== 'none';
    };
    const draw = () => setDrag(d => (d ? { ...d, path: path.current, clientX: at.x, clientY: at.y } : d));

    /** Where the map goes under the finger now, in pixels per second; null away from the edges. */
    const speed = (): { dx: number; dy: number } | null => {
      const map = latest.current.pan?.current;
      if (!map || !pressed.current.left) return null;
      area ??= map.area();
      const even = reducedMotion();
      const { dx, dy } = edgePan(at, clearRect(area.rect, area.tabs, at.y), EDGE_ZONE, even ? EDGE_PAN_STEADY : EDGE_PAN_MAX, !even);
      return dx === 0 && dy === 0 ? null : { dx, dy };
    };
    const stopPan = () => {
      const moving = frame !== null || last !== null;
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      last = null;
      if (moving) latest.current.pan?.current?.rest();
    };
    const tick = (now: number) => {
      frame = null;
      const towards = speed();
      const seconds = Math.min(LONGEST_FRAME_MS, last === null ? FIRST_FRAME_MS : Math.max(0, now - last)) / 1000;
      last = last === null ? now : Math.max(last, now);
      if (!towards) {
        stopPan();
        return;
      }
      // The browser may give a frame the time of the one before, or an earlier one: no time has passed, and that is
      // no limit of the map, so the next frame is still asked for.
      if (seconds > 0) {
        // The view goes towards the edge, so the map slides the other way and brings what lies past the edge.
        if (!latest.current.pan?.current?.by(-towards.dx * seconds, -towards.dy * seconds)) {
          stopPan();
          return;
        }
        // The finger rests and the map moves under it: the hex under the finger changes as it does on a move.
        if (step()) draw();
      }
      frame = requestAnimationFrame(tick);
    };
    const followEdge = () => {
      if (frame !== null) return;
      if (speed()) frame = requestAnimationFrame(tick);
      else stopPan();
    };

    const cancel = () => {
      setDrag(null);
      latest.current.onCancel();
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      at.x = e.clientX;
      at.y = e.clientY;
      if (Math.hypot(at.x - pressed.current.x, at.y - pressed.current.y) >= TAP_SLOP) pressed.current.left = true;
      if (step()) draw();
      followEdge();
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      at.x = e.clientX;
      at.y = e.clientY;
      step();
      const { activeSystem: active, onComplete, onPause } = latest.current;
      const route = active === null ? null : routeFromPath(path.current, active);
      if (route !== null) {
        setDrag(null);
        onComplete(route);
      } else if (onPause && active !== null && path.current.join() !== started.current.join()) {
        setDrag(null);
        onPause(path.current);
      } else {
        cancel();
      }
    };
    const onCancelEvent = (e: PointerEvent) => {
      if (e.pointerId === pointerId) cancel();
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) cancel();
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancelEvent);
    window.addEventListener('pointerdown', onDown);
    return () => {
      stopPan();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancelEvent);
      window.removeEventListener('pointerdown', onDown);
    };
  }, [pointerId]);

  const onTilePointerDown = (systemId: string, e: ReactPointerEvent, laid?: string[]) => {
    if (!e.isPrimary || e.button !== 0 || activeSystem === null || drag) return;
    path.current = laid ?? [systemId];
    started.current = path.current;
    pressed.current = { x: e.clientX, y: e.clientY, left: false };
    setDrag({ pointerId: e.pointerId, path: path.current, clientX: e.clientX, clientY: e.clientY, reverse: path.current[0] === activeSystem });
  };

  const preview: ArrowPreview | null = drag
    ? { path: drag.path, clientX: drag.clientX, clientY: drag.clientY, reverse: drag.reverse }
    : null;
  return { preview, onTilePointerDown };
}
