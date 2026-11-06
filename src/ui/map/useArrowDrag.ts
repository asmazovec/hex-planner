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
  /** Only such hexes join a route; by default every hex. */
  isSystem?: (slot: string) => boolean;
}

const slotAt = (x: number, y: number): string | null =>
  document.elementFromPoint(x, y)?.closest<HTMLElement | SVGElement>('[data-slot]')?.dataset.slot ?? null;

/**
 * One finger pulls a route between a tile and the active system, hex by hex: each hex entered is added, the previous one
 * removes the last step. Only a change of the route renders; a second finger cancels it, so the map can pinch.
 */
export function useArrowDrag({ activeSystem, onComplete, onCancel, isSystem }: ArrowDragOptions) {
  const [drag, setDrag] = useState<(ArrowPreview & { pointerId: number }) | null>(null);
  const pointerId = drag?.pointerId ?? null;
  const path = useRef<string[]>([]);

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
      if (route === null) {
        cancel();
        return;
      }
      setDrag(null);
      onComplete(route);
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
  }, [pointerId, activeSystem, onComplete, onCancel, isSystem]);

  const onTilePointerDown = (systemId: string, e: ReactPointerEvent) => {
    if (!e.isPrimary || e.button !== 0 || activeSystem === null || drag) return;
    path.current = [systemId];
    setDrag({ pointerId: e.pointerId, path: path.current, clientX: e.clientX, clientY: e.clientY, reverse: systemId === activeSystem });
  };

  const preview: ArrowPreview | null = drag
    ? { path: drag.path, clientX: drag.clientX, clientY: drag.clientY, reverse: drag.reverse }
    : null;
  return { preview, onTilePointerDown };
}
