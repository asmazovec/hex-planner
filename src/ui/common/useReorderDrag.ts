import { useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';

const SHIFT = 'transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1)';
const LAND_MS = 180;

export interface ReorderOptions {
  axis: 'x' | 'y';
  /** A press becomes a drag past this many pixels. */
  threshold?: number;
  /** The element that moves for an item. */
  element: (id: string) => Element | null | undefined;
  /** The items it moves among, itself included, in their order. */
  siblings: (id: string) => string[];
  /** Whether the item still exists: one removed mid-drag ends the drag. */
  exists?: (id: string) => boolean;
  /** `toIndex` counts among the siblings without the item. */
  onDrop: (id: string, toIndex: number) => void;
}

interface Item { id: string; centre: number; /** Its size and the gap after it. */ span: number }
interface Drag {
  id: string;
  pointerId: number;
  start: number;
  /** Null until the press becomes a drag. */
  items: Item[] | null;
  from: number;
  /** How far the others move to make room: the item's size and the gap after it. */
  span: number;
  delta: number;
}

const placeOf = (drag: Drag): number => {
  const items = drag.items ?? [];
  const own = items[drag.from];
  // The leading edge decides: a neighbour makes way as soon as it reaches the neighbour's middle.
  const edge = (own?.centre ?? 0) + drag.delta + Math.sign(drag.delta) * (own?.span ?? 0) / 2;
  return items.filter((item, i) => i !== drag.from && item.centre < edge).length;
};

/** Dragging an item along a list: it follows the pointer and the others make way; on release it settles into its place. */
export function useReorderDrag({ axis, threshold = 0, element, siblings, exists, onDrop }: ReorderOptions) {
  const [state, setState] = useState<Drag | null>(null);
  // A removed item must not keep the drag, and with it every new one, from starting.
  const drag = state && (exists?.(state.id) ?? true) ? state : null;
  const landing = useRef<{ id: string; from: number } | null>(null);
  const dragged = useRef(false);

  useLayoutEffect(() => {
    const land = landing.current;
    if (!land) return;
    landing.current = null;
    const from = axis === 'x' ? `translateX(${land.from}px)` : `translateY(${land.from}px)`;
    element(land.id)?.animate?.([{ transform: from }, { transform: 'none' }], { duration: LAND_MS, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' });
  });

  const at = (e: { clientX: number; clientY: number }): number => (axis === 'x' ? e.clientX : e.clientY);

  /** Takes the sizes once, from where everything stands before it moves. */
  const measured = (current: Drag): Drag => {
    const ids = siblings(current.id);
    const rects = ids.map(id => element(id)?.getBoundingClientRect());
    const startOf = (r: DOMRect | undefined) => (axis === 'x' ? r?.left : r?.top) ?? 0;
    const sizeOf = (r: DOMRect | undefined) => (axis === 'x' ? r?.width : r?.height) ?? 0;
    const from = ids.indexOf(current.id);
    const next = rects[from + 1] ?? rects[from - 1];
    const own = rects[from];
    const gap = next ? Math.max(0, from + 1 < rects.length ? startOf(next) - startOf(own) - sizeOf(own) : startOf(own) - startOf(next) - sizeOf(next)) : 0;
    return {
      ...current, from, span: sizeOf(own) + gap,
      items: ids.map((id, i) => ({ id, centre: startOf(rects[i]) + sizeOf(rects[i]) / 2, span: sizeOf(rects[i]) + gap })),
    };
  };

  const handlers = (id: string) => ({
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      if (drag) return;
      e.currentTarget.setPointerCapture?.(e.pointerId);
      setState({ id, pointerId: e.pointerId, start: at(e), items: null, from: 0, span: 0, delta: 0 });
    },
    onPointerMove: (e: PointerEvent) => {
      if (drag?.id !== id || drag.pointerId !== e.pointerId) return;
      const delta = at(e) - drag.start;
      if (drag.items) setState({ ...drag, delta });
      else if (Math.abs(delta) >= threshold && delta !== 0) setState({ ...measured(drag), delta });
    },
    onPointerUp: (e: PointerEvent) => {
      if (drag?.id !== id || drag.pointerId !== e.pointerId) return;
      setState(null);
      if (!drag.items) return;
      const done = { ...drag, delta: at(e) - drag.start };
      const to = placeOf(done);
      dragged.current = true;
      // Its new place is as far as the items it passed take up; the rest of the way is played after the list changes.
      const sum = (items: Item[]) => items.reduce((total, item) => total + item.span, 0);
      const slot = to > done.from ? sum(done.items!.slice(done.from + 1, to + 1)) : -sum(done.items!.slice(to, done.from));
      landing.current = { id, from: done.delta - slot };
      onDrop(id, to);
    },
    onPointerCancel: () => setState(null),
  });

  /** The style of an item while something is dragged. */
  const styleOf = (id: string): CSSProperties | undefined => {
    if (!drag?.items) return undefined;
    const index = drag.items.findIndex(item => item.id === id);
    if (index < 0) return undefined;
    const move = (px: number) => (axis === 'x' ? `translateX(${px}px)` : `translateY(${px}px)`);
    if (index === drag.from) return { transform: move(drag.delta), transition: 'none', position: 'relative', zIndex: 5 };
    const to = placeOf(drag);
    const shift = drag.from < index && index <= to ? -drag.span : to <= index && index < drag.from ? drag.span : 0;
    return { transform: move(shift), transition: SHIFT };
  };

  /** Whether the click closing this press belongs to a drag, and must not act as a tap. */
  const wasDrag = (): boolean => {
    const was = dragged.current;
    dragged.current = false;
    return was;
  };

  return { draggingId: drag?.items ? drag.id : null, handlers, styleOf, wasDrag };
}
