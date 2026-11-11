import type { Point, Rect } from './geometry';

/** How near an edge of the visible map area a finger drawing a route starts to move the map, in screen pixels. */
export const EDGE_ZONE = 56;
/** The speed of the map under a finger at the very edge, in screen pixels per second. */
export const EDGE_PAN_MAX = 720;
/** The one speed anywhere in the zone when smooth motion is off: the map still has to be reached. */
export const EDGE_PAN_STEADY = 320;

/** What a map hands to a stroke that moves it: its area on screen with what hangs over it, and steps of the view. */
export interface MapPan {
  /** The map area and the tabs over its sides, in pixels of the screen. */
  area(): { rect: Rect; tabs: Rect[] };
  /** Moves the map by screen pixels within its limits; false when a limit stopped it. */
  by(dx: number, dy: number): boolean;
  /** The movement is over: the view comes to rest. */
  rest(): void;
}

/** One axis: -1 at the near edge and before it, +1 at the far edge and past it, 0 between the zones. */
function depth(at: number, start: number, length: number, zone: number, ramp: boolean): number {
  if (length <= 0 || zone <= 0) return 0;
  const share = (inside: number) => Math.min(1, Math.max(0, (zone - inside) / zone));
  const signed = share(start + length - at) - share(at - start);
  return ramp ? signed : Math.sign(signed);
}

/**
 * Where the view goes while a finger at `point` draws near an edge of `rect`, in pixels per second on each axis:
 * towards that edge, so the map under the finger slides the other way. Nothing further than `zone` from every edge,
 * `max` at the edge and past it; in between it grows evenly, or is `max` at once without `ramp`.
 */
export function edgePan(point: Point, rect: Rect, zone: number, max: number, ramp: boolean = true): { dx: number; dy: number } {
  // `|| 0` keeps a resting axis a plain zero, not a negative one.
  return {
    dx: depth(point.x, rect.x, rect.width, zone, ramp) * max || 0,
    dy: depth(point.y, rect.y, rect.height, zone, ramp) * max || 0,
  };
}

/** The part of the map area seen at the height `y`: a tab over its left or right side moves that edge inwards. */
export function clearRect(rect: Rect, tabs: Rect[], y: number): Rect {
  let left = rect.x;
  let right = rect.x + rect.width;
  const middle = rect.x + rect.width / 2;
  for (const tab of tabs) {
    if (y < tab.y || y > tab.y + tab.height || tab.x + tab.width <= rect.x || tab.x >= rect.x + rect.width) continue;
    if (tab.x + tab.width / 2 < middle) left = Math.max(left, tab.x + tab.width);
    else right = Math.min(right, tab.x);
  }
  return left === rect.x && right === rect.x + rect.width ? rect : { ...rect, x: left, width: Math.max(0, right - left) };
}
