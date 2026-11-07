import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { extendPath, routeFromPath, type RouteDraft } from '../../domain/route';

/**
 * The route being drawn: `path` holds its hexes in the order the finger passed them. `reverse` means the drag runs from
 * the active system towards a source. The screen point is where the pointer was when the path last changed.
 */
export interface ArrowPreview { path: string[]; clientX: number; clientY: number; reverse: boolean }

export interface ArrowDragOptions {
  activeSystem: string | null;
  /** The route in flight order, whichever way it was drawn. */
  onComplete: (route: RouteDraft) => void;
  onCancel: () => void;
  /** The finger was lifted short of the end of the route: the path waits for more taps or another stroke. */
  onPause?: (path: string[]) => void;
  /** Only such hexes join a route; by default every hex. */
  isSystem?: (slot: string) => boolean;
}

const slotAt = (x: number, y: number): string | null =>
  document.elementFromPoint(x, y)?.closest<HTMLElement | SVGElement>('[data-slot]')?.dataset.slot ?? null;

/**
 * One finger pulls a route between a tile and the active system, hex by hex: each hex entered is added, the previous one
 * removes the last step. Only a change of the route renders; a second finger cancels the stroke, so the map can pinch.
 * A stroke can go on from a path laid before, and one lifted short of the active system hands its path to `onPause`.
 */
export function useArrowDrag({ activeSystem, onComplete, onCancel, onPause, isSystem }: ArrowDragOptions) {
  const [drag, setDrag] = useState<(ArrowPreview & { pointerId: number }) | null>(null);
  const pointerId = drag?.pointerId ?? null;
  const path = useRef<string[]>([]);
  /** The path the stroke began with: a press that changes nothing is a tap. */
  const started = useRef<string[]>([]);

  useEffect(() => {
    if (pointerId === null) return undefined;
    const cancel = () => {
      setDrag(null);
      onCancel();
    };
    const step = (x: number, y: number): boolean => {
      const over = slotAt(x, y);
      if (over === null || (isSystem && !isSystem(over))) return false;
      const next = extendPath(path.current, over);
      if (next === path.current) return false;
      path.current = next;
      return true;
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== pointerId || !step(e.clientX, e.clientY)) return;
      setDrag(d => (d ? { ...d, path: path.current, clientX: e.clientX, clientY: e.clientY } : d));
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      step(e.clientX, e.clientY);
      const route = activeSystem === null ? null : routeFromPath(path.current, activeSystem);
      if (route !== null) {
        setDrag(null);
        onComplete(route);
      } else if (onPause && activeSystem !== null && path.current.join() !== started.current.join()) {
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
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancelEvent);
      window.removeEventListener('pointerdown', onDown);
    };
  }, [pointerId, activeSystem, onComplete, onCancel, onPause, isSystem]);

  const onTilePointerDown = (systemId: string, e: ReactPointerEvent, laid?: string[]) => {
    if (!e.isPrimary || e.button !== 0 || activeSystem === null || drag) return;
    path.current = laid ?? [systemId];
    started.current = path.current;
    setDrag({ pointerId: e.pointerId, path: path.current, clientX: e.clientX, clientY: e.clientY, reverse: path.current[0] === activeSystem });
  };

  const preview: ArrowPreview | null = drag
    ? { path: drag.path, clientX: drag.clientX, clientY: drag.clientY, reverse: drag.reverse }
    : null;
  return { preview, onTilePointerDown };
}
