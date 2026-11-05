import { useEffect, useState, type PointerEvent as ReactPointerEvent } from 'react';

/** `reverse` means the drag runs from the active system towards a source. */
export interface ArrowPreview { from: string; clientX: number; clientY: number; reverse: boolean }

export interface ArrowDragOptions {
  activeSystem: string | null;
  /** `from` is always the source system, whichever way the arrow was drawn. */
  onComplete: (from: string) => void;
  onCancel: () => void;
}

const slotAt = (x: number, y: number): string | null =>
  document.elementFromPoint(x, y)?.closest<HTMLElement | SVGElement>('[data-slot]')?.dataset.slot ?? null;

/** One finger pulls an arrow between a tile and the active system; a second finger cancels it, so the map can pinch. */
export function useArrowDrag({ activeSystem, onComplete, onCancel }: ArrowDragOptions) {
  const [drag, setDrag] = useState<(ArrowPreview & { pointerId: number }) | null>(null);
  const pointerId = drag?.pointerId ?? null;
  const from = drag?.from ?? null;

  useEffect(() => {
    if (pointerId === null || from === null) return undefined;
    const cancel = () => {
      setDrag(null);
      onCancel();
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      setDrag(d => (d ? { ...d, clientX: e.clientX, clientY: e.clientY } : d));
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      const over = slotAt(e.clientX, e.clientY);
      const source = from === activeSystem ? over : from;
      const joined = from === activeSystem ? over !== null && over !== activeSystem : over === activeSystem;
      if (!joined || source === null) {
        cancel();
        return;
      }
      setDrag(null);
      onComplete(source);
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
  }, [pointerId, from, activeSystem, onComplete, onCancel]);

  const onTilePointerDown = (systemId: string, e: ReactPointerEvent) => {
    if (!e.isPrimary || e.button !== 0 || activeSystem === null || drag) return;
    setDrag({
      pointerId: e.pointerId, from: systemId, clientX: e.clientX, clientY: e.clientY, reverse: systemId === activeSystem,
    });
  };

  const preview: ArrowPreview | null = drag
    ? { from: drag.from, clientX: drag.clientX, clientY: drag.clientY, reverse: drag.reverse }
    : null;
  return { preview, onTilePointerDown };
}
