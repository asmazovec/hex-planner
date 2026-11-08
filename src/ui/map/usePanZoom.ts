import { useCallback, useEffect, useRef, useState, type MouseEvent, type PointerEvent, type RefObject } from 'react';
import type { Rect } from './geometry';
import { reducedMotion } from '../common/motion';
import { clampView, type View } from './viewLimits';

export type { View };

const MIN_SCALE = 0.6;
const MAX_SCALE = 4;
const IDENTITY: View = { x: 0, y: 0, scale: 1 };
/** Below this a press on empty space is a tap, in screen pixels. */
const TAP_SLOP = 6;
/** How much of a drag past the limit still moves the map. */
const STRETCH = 0.35;
/** The time constant of the approach to the target, in milliseconds. */
const SMOOTHING_MS = 70;
const FIRST_FRAME_MS = 16;
/** The camera moves to an area of the map more slowly than a reset or the wheel. */
const FOCUS_SMOOTHING_MS = 130;

const clampScale = (v: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, v));
/** The tile under a press. */
const tileAt = (target: EventTarget | null): Element | null =>
  (target instanceof Element ? target.closest('[data-slot]') : null);

/**
 * One pointer anywhere, two pointers anywhere and the mouse wheel move and scale the map, so a zoomed-in map with
 * no free space can still be moved. A press on a tile for which `startsArrow` is true is left alone for the arrow
 * drag. A press on any other tile stays a tap until it moves past the slop. The view follows a finger at once, may
 * stretch past the limit, and returns after release; reset and wheel approach their target over several frames.
 * `x` and `y` of the view are measured from the centre of `viewBox`, in viewBox units. The limits apply to
 * `limitRect`, by default the whole `viewBox`.
 */
export function usePanZoom(
  viewBox: Rect, svgRef: RefObject<SVGSVGElement | null>, onEmptyTap?: () => void, limitRect: Rect = viewBox,
  startsArrow?: (slot: string) => boolean,
) {
  const [view, setView] = useState<View>(IDENTITY);
  const shown = useRef<View>(IDENTITY);
  /** The target of the animation, or the view of a gesture before it stretches at the limit. */
  const goal = useRef<View>(IDENTITY);
  const frame = useRef<number | null>(null);
  const smoothing = useRef(SMOOTHING_MS);
  /** The view to go back to when the camera leaves a focused area. */
  const focused = useRef(false);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pan = useRef<{ id: number; startX: number; startY: number; moved: boolean; onTile: boolean } | null>(null);
  /** A gesture has moved the view since the last settle; a press alone leaves a running animation alone. */
  const moved = useRef(false);
  /** The click the browser sends at the end of a pan must not act as a tap on the tile under it. */
  const swallowClick = useRef(false);

  const show = useCallback((next: View) => {
    shown.current = next;
    setView(next);
  }, []);

  const stopAnimation = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
  }, []);

  /** Viewbox units per screen pixel, the limits of the view in those units, and a screen point measured from the centre. */
  const mapping = useCallback(() => {
    const rect = svgRef.current?.getBoundingClientRect();
    const sized = rect !== undefined && rect.width > 0 && rect.height > 0;
    const midX = viewBox.x + viewBox.width / 2;
    const midY = viewBox.y + viewBox.height / 2;
    const k = sized ? Math.max(viewBox.width / rect.width, viewBox.height / rect.height) : 1;
    return {
      k,
      viewport: sized ? { width: rect.width * k, height: rect.height * k } : { width: viewBox.width, height: viewBox.height },
      map: {
        width: limitRect.width,
        height: limitRect.height,
        centerX: limitRect.x + limitRect.width / 2 - midX,
        centerY: limitRect.y + limitRect.height / 2 - midY,
      },
      fromCentre: (x: number, y: number) => (sized
        ? { x: (x - rect.left - rect.width / 2) * k, y: (y - rect.top - rect.height / 2) * k }
        : { x, y }),
    };
  }, [svgRef, viewBox.x, viewBox.y, viewBox.width, viewBox.height, limitRect.x, limitRect.y, limitRect.width, limitRect.height]);

  /** Scales by `factor` and shifts by `move` screen pixels, keeping the screen point `at` fixed. */
  const stepped = useCallback((from: View, factor: number, at: { x: number; y: number }, move: { x: number; y: number }): View => {
    const { k, fromCentre } = mapping();
    const focus = fromCentre(at.x, at.y);
    const scale = clampScale(from.scale * factor);
    const real = scale / from.scale;
    return {
      scale,
      x: focus.x - (focus.x - from.x) * real + move.x * k,
      y: focus.y - (focus.y - from.y) * real + move.y * k,
    };
  }, [mapping]);

  const animateTo = useCallback((target: View, smoothingMs: number = SMOOTHING_MS) => {
    goal.current = target;
    smoothing.current = smoothingMs;
    if (reducedMotion()) {
      stopAnimation();
      show(target);
      return;
    }
    if (frame.current !== null) return;
    let last: number | null = null;
    const tick = (now: number) => {
      const elapsed = last === null ? FIRST_FRAME_MS : now - last;
      last = now;
      const share = 1 - Math.exp(-elapsed / smoothing.current);
      const from = shown.current;
      const to = goal.current;
      const next = {
        x: from.x + (to.x - from.x) * share,
        y: from.y + (to.y - from.y) * share,
        scale: from.scale + (to.scale - from.scale) * share,
      };
      if (Math.abs(next.x - to.x) < 0.2 && Math.abs(next.y - to.y) < 0.2 && Math.abs(next.scale - to.scale) < 0.001) {
        frame.current = null;
        show(to);
        return;
      }
      show(next);
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }, [show, stopAnimation]);

  /** Applies a gesture step at once; past the limit the view gives way only partly. */
  const follow = useCallback((factor: number, at: { x: number; y: number }, move: { x: number; y: number }) => {
    // The finger takes over from any animation, and from a reset or wheel during the gesture.
    if (frame.current !== null || !moved.current) goal.current = shown.current;
    stopAnimation();
    moved.current = true;
    const { viewport, map } = mapping();
    const next = stepped(goal.current, factor, at, move);
    goal.current = next;
    const inside = clampView(next, viewport, map);
    show(inside === next ? next : {
      scale: next.scale,
      x: inside.x + (next.x - inside.x) * STRETCH,
      y: inside.y + (next.y - inside.y) * STRETCH,
    });
  }, [mapping, stepped, show, stopAnimation]);

  /** The gesture is over: its stretch is what is left on screen, and that returns to the limit. */
  const settle = useCallback(() => {
    const { viewport, map } = mapping();
    moved.current = false;
    goal.current = shown.current;
    animateTo(clampView(shown.current, viewport, map));
  }, [mapping, animateTo]);

  const onPointerDown = (e: PointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    swallowClick.current = false;
    if (pointers.current.size === 1 && e.button === 0) {
      const tile = tileAt(e.target);
      const slot = tile?.getAttribute('data-slot') ?? null;
      if (slot !== null && startsArrow?.(slot)) return;
      pan.current = { id: e.pointerId, startX: e.clientX, startY: e.clientY, moved: false, onTile: tile !== null };
      // Capturing now would send a tap's click to the map instead of the tile, so a tile waits for real movement.
      if (tile === null) svgRef.current?.setPointerCapture?.(e.pointerId);
    } else if (pointers.current.size === 2) {
      pan.current = null;
    }
  };

  const onPointerMove = (e: PointerEvent) => {
    const known = pointers.current.get(e.pointerId);
    if (!known) return;
    const panning = pan.current;
    if (panning && panning.id === e.pointerId) {
      if (!panning.moved && Math.hypot(e.clientX - panning.startX, e.clientY - panning.startY) < TAP_SLOP) return;
      if (!panning.moved && panning.onTile) svgRef.current?.setPointerCapture?.(e.pointerId);
      panning.moved = true;
      swallowClick.current = panning.onTile;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      follow(1, { x: e.clientX, y: e.clientY }, { x: e.clientX - known.x, y: e.clientY - known.y });
      return;
    }
    if (pointers.current.size !== 2) {
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      return;
    }
    const [a, b] = [...pointers.current.values()];
    const before = { mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, gap: Math.hypot(a.x - b.x, a.y - b.y) };
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const [c, d] = [...pointers.current.values()];
    const mid = { x: (c.x + d.x) / 2, y: (c.y + d.y) / 2 };
    const gap = Math.hypot(c.x - d.x, c.y - d.y);
    follow(before.gap > 0 && gap > 0 ? gap / before.gap : 1, mid, { x: mid.x - before.mid.x, y: mid.y - before.mid.y });
  };

  const endPointer = useCallback((pointerId: number, cancelled: boolean) => {
    if (!pointers.current.delete(pointerId)) return;
    const panning = pan.current;
    if (panning?.id === pointerId) {
      pan.current = null;
      if (!panning.moved && !panning.onTile && !cancelled) onEmptyTap?.();
    }
    if (moved.current && pan.current === null && pointers.current.size < 2) settle();
  }, [settle, onEmptyTap]);

  const onPointerUp = (e: PointerEvent) => endPointer(e.pointerId, false);
  const onPointerCancel = (e: PointerEvent) => endPointer(e.pointerId, true);
  const onClickCapture = (e: MouseEvent) => {
    if (!swallowClick.current) return;
    swallowClick.current = false;
    e.stopPropagation();
    e.preventDefault();
  };

  /** A pointer released outside the map still ends its gesture. */
  useEffect(() => {
    const onUp = (e: globalThis.PointerEvent) => endPointer(e.pointerId, false);
    const onCancel = (e: globalThis.PointerEvent) => endPointer(e.pointerId, true);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    return () => {
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
    };
  }, [endPointer]);

  /** A non-passive listener, so the page does not scroll while the wheel zooms the map. */
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return undefined;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { viewport, map } = mapping();
      const next = stepped(goal.current, Math.exp(-e.deltaY * 0.0015), { x: e.clientX, y: e.clientY }, { x: 0, y: 0 });
      animateTo(clampView(next, viewport, map));
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [svgRef, mapping, stepped, animateTo]);

  /** The map can change size, when the Fracture opens for example. */
  useEffect(() => {
    if (moved.current) return;
    const { viewport, map } = mapping();
    const inside = clampView(goal.current, viewport, map);
    if (inside !== goal.current) animateTo(inside);
  }, [mapping, animateTo]);

  useEffect(() => stopAnimation, [stopAnimation]);

  /** Moves the camera so that `rect` fills the view, within the limits; null brings the whole map back, as the reset does. */
  const focus = useCallback((rect: Rect | null) => {
    if (rect === null) {
      if (focused.current) animateTo(IDENTITY, FOCUS_SMOOTHING_MS);
      focused.current = false;
      return;
    }
    focused.current = true;
    const { viewport, map } = mapping();
    const scale = clampScale(Math.min(viewport.width / rect.width, viewport.height / rect.height));
    const x = -(rect.x + rect.width / 2 - (viewBox.x + viewBox.width / 2)) * scale;
    const y = -(rect.y + rect.height / 2 - (viewBox.y + viewBox.height / 2)) * scale;
    animateTo(clampView({ x, y, scale }, viewport, map), FOCUS_SMOOTHING_MS);
  }, [mapping, animateTo, viewBox.x, viewBox.y, viewBox.width, viewBox.height]);

  const reset = useCallback(() => {
    focused.current = false;
    animateTo(IDENTITY);
  }, [animateTo]);

  return {
    view,
    focus,
    reset,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onClickCapture },
  };
}
