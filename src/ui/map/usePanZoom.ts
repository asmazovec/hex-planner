import { useCallback, useRef, useState, type PointerEvent, type RefObject, type WheelEvent } from 'react';
import type { Rect } from './geometry';

export interface View { x: number; y: number; scale: number }
const MIN_SCALE = 0.6;
const MAX_SCALE = 4;
const IDENTITY: View = { x: 0, y: 0, scale: 1 };

const clamp = (v: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, v));

/**
 * Two fingers or the mouse wheel move and scale the map; a single pointer is left alone so taps and
 * arrow drags keep working. The returned view is applied as `translate(x y) scale(scale)` in viewBox units.
 */
export function usePanZoom(viewBox: Rect, svgRef: RefObject<SVGSVGElement | null>) {
  const [view, setView] = useState<View>(IDENTITY);
  const pointers = useRef(new Map<number, { x: number; y: number }>());

  /** Viewbox units per screen pixel, and the viewBox point under a screen point. */
  const mapping = useCallback(() => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return { k: 1, toView: (x: number, y: number) => ({ x, y }) };
    const k = Math.max(viewBox.width / rect.width, viewBox.height / rect.height);
    const offX = (rect.width - viewBox.width / k) / 2;
    const offY = (rect.height - viewBox.height / k) / 2;
    return {
      k,
      toView: (x: number, y: number) => ({ x: viewBox.x + (x - rect.left - offX) * k, y: viewBox.y + (y - rect.top - offY) * k }),
    };
  }, [svgRef, viewBox]);

  /** Scales by `factor` and shifts by `pan` screen pixels, keeping the point `at` fixed. */
  const apply = useCallback((factor: number, at: { x: number; y: number }, pan: { x: number; y: number }) => {
    const { k, toView } = mapping();
    const focus = toView(at.x, at.y);
    setView(v => {
      const scale = clamp(v.scale * factor);
      const real = scale / v.scale;
      return {
        scale,
        x: focus.x - (focus.x - v.x) * real + pan.x * k,
        y: focus.y - (focus.y - v.y) * real + pan.y * k,
      };
    });
  }, [mapping]);

  const onPointerDown = (e: PointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
  };

  const onPointerMove = (e: PointerEvent) => {
    const known = pointers.current.get(e.pointerId);
    if (!known || pointers.current.size !== 2) {
      if (known) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      return;
    }
    const [a, b] = [...pointers.current.values()];
    const before = { mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, gap: Math.hypot(a.x - b.x, a.y - b.y) };
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const [c, d] = [...pointers.current.values()];
    const mid = { x: (c.x + d.x) / 2, y: (c.y + d.y) / 2 };
    const gap = Math.hypot(c.x - d.x, c.y - d.y);
    apply(before.gap > 0 && gap > 0 ? gap / before.gap : 1, mid, { x: mid.x - before.mid.x, y: mid.y - before.mid.y });
  };

  const onPointerEnd = (e: PointerEvent) => { pointers.current.delete(e.pointerId); };

  const onWheel = (e: WheelEvent) => apply(Math.exp(-e.deltaY * 0.0015), { x: e.clientX, y: e.clientY }, { x: 0, y: 0 });

  return {
    view,
    reset: () => setView(IDENTITY),
    handlers: { onPointerDown, onPointerMove, onPointerUp: onPointerEnd, onPointerCancel: onPointerEnd, onWheel },
  };
}
