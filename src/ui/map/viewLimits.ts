import { HEX_SIZE, type Point, type Rect } from './geometry';

/** `x` and `y` move the map centre away from the viewport centre, in the units of `Size`. */
export interface View { x: number; y: number; scale: number }
export interface Size { width: number; height: number }
export interface HexRect { left: number; right: number; top: number; bottom: number }
/** The rectangle the limits apply to, at scale 1; its centre may lie away from the origin of the view. */
export interface LimitRect extends Size { centerX?: number; centerY?: number }

/** The part of the viewport the map must keep covering on each axis. */
const KEPT_SHARE = 1 / 3;
const POPOVER_GAP = 10;
const POPOVER_MARGIN = 8;
/** What beside the map may shrink its fit: the window around it grows at most this much on each axis. */
const MAX_FIT_GROWTH = 1.25;

/** The furthest the map centre may be from the viewport centre on one axis. */
function reach(screen: number, length: number): number {
  return screen / 2 + length / 2 - Math.min(screen * KEPT_SHARE, length);
}

/**
 * Keeps at least a third of the viewport covered by the map on each axis, or the whole map when it is smaller
 * than that. The map is given at scale 1 and centred on the origin of the view unless it says otherwise; the
 * viewport is centred on that origin. A view inside the limits comes back as the same object.
 */
export function clampView(view: View, viewport: Size, map: LimitRect): View {
  const offsetX = (map.centerX ?? 0) * view.scale;
  const offsetY = (map.centerY ?? 0) * view.scale;
  const limitX = reach(viewport.width, map.width * view.scale);
  const limitY = reach(viewport.height, map.height * view.scale);
  const x = Math.min(limitX - offsetX, Math.max(-limitX - offsetX, view.x));
  const y = Math.min(limitY - offsetY, Math.max(-limitY - offsetY, view.y));
  return x === view.x && y === view.y ? view : { x, y, scale: view.scale };
}

/**
 * The part of the whole drawing to fit on screen: it holds the base map and grows towards whatever lies beside
 * it, by at most a quarter per axis, so the map stays at least 80% of its own scale. The rest is reached by panning.
 */
export function capFit(base: Rect, full: Rect): Rect {
  const axis = (start: number, length: number, fullStart: number, fullLength: number) => {
    const size = Math.min(fullLength, length * MAX_FIT_GROWTH);
    if (size === fullLength) return { start: fullStart, size };
    const before = fullStart < start;
    const after = fullStart + fullLength > start + length;
    if (before && !after) return { start: start + length - size, size };
    if (after && !before) return { start, size };
    return { start: start + (length - size) / 2, size };
  };
  const h = axis(base.x, base.width, full.x, full.width);
  const v = axis(base.y, base.height, full.y, full.height);
  return { x: h.start, y: v.start, width: h.size, height: v.size };
}

/** Free room between the hexes and each edge of the map area when the map opens, in screen pixels. */
export const FIT_MARGIN = 8;

/** Whether a flat-top hex of radius `size` around `centre` and a rectangle have a point in common. */
function hexMeets(centre: Point, size: number, rect: Rect): boolean {
  // The point of the rectangle nearest to the centre on each axis: the hex is convex and symmetric, so it decides.
  const dx = Math.max(rect.x - centre.x, 0, centre.x - (rect.x + rect.width));
  const dy = Math.max(rect.y - centre.y, 0, centre.y - (rect.y + rect.height));
  return dy < (size * Math.sqrt(3)) / 2 && dy < Math.sqrt(3) * (size - dx);
}

/**
 * The viewBox the map opens on: `content` whole in an area of `viewport` screen pixels, with `margin` pixels free on
 * every side, and no hex of `hexes` (centres, in the units of `content`) under a rectangle of `tabs` (pixels from the
 * top left corner of the area). The box has the proportions of the area and is centred on `content`, so the browser
 * adds nothing around it. Tabs make the map smaller only as far as they are in its way. An area with no size yet
 * leaves `content` as it is.
 */
export function fitBox(content: Rect, viewport: Size, hexes: Point[] = [], tabs: Rect[] = [], hexSize: number = HEX_SIZE, margin: number = FIT_MARGIN): Rect {
  const roomX = viewport.width - 2 * margin;
  const roomY = viewport.height - 2 * margin;
  if (roomX <= 0 || roomY <= 0 || content.width <= 0 || content.height <= 0) return content;
  const midX = content.x + content.width / 2;
  const midY = content.y + content.height / 2;
  const clear = (scale: number) => !hexes.some(hex => {
    const at = { x: viewport.width / 2 + (hex.x - midX) * scale, y: viewport.height / 2 + (hex.y - midY) * scale };
    return tabs.some(tab => hexMeets(at, hexSize * scale, tab));
  });
  let scale = Math.min(roomX / content.width, roomY / content.height);
  if (!clear(scale)) {
    // Between the tabs of both sides nothing is in the way: the largest scale that is clear lies from there up.
    const reach = Math.max(0, ...tabs.map(tab => (tab.x + tab.width / 2 < viewport.width / 2 ? tab.x + tab.width : viewport.width - tab.x)));
    let low = Math.min((roomX - 2 * reach) / content.width, scale);
    if (low > 0) {
      for (let i = 0; i < 24; i += 1) {
        const middle = (low + scale) / 2;
        if (clear(middle)) low = middle;
        else scale = middle;
      }
      scale = low;
    }
  }
  const width = viewport.width / scale;
  const height = viewport.height / scale;
  return { x: midX - width / 2, y: midY - height / 2, width, height };
}

/** Right of the hex if the popup fits there, left if it fits there, otherwise the roomier side. */
export function popoverSide(hex: HexRect, popup: Size, viewport: Size): 'right' | 'left' {
  const right = viewport.width - hex.right;
  const left = hex.left;
  const needed = popup.width + POPOVER_GAP + POPOVER_MARGIN;
  if (right >= needed) return 'right';
  if (left >= needed) return 'left';
  return right >= left ? 'right' : 'left';
}

/** Beside the hex and centred on it, moved back on screen where needed. Coordinates are relative to the viewport. */
export function popoverPosition(hex: HexRect, popup: Size, viewport: Size): { side: 'right' | 'left'; left: number; top: number } {
  const side = popoverSide(hex, popup, viewport);
  const within = (value: number, length: number, screen: number) =>
    Math.max(POPOVER_MARGIN, Math.min(value, screen - length - POPOVER_MARGIN));
  const beside = side === 'right' ? hex.right + POPOVER_GAP : hex.left - popup.width - POPOVER_GAP;
  return {
    side,
    left: within(beside, popup.width, viewport.width),
    top: within((hex.top + hex.bottom - popup.height) / 2, popup.height, viewport.height),
  };
}
