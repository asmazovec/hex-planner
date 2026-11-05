/** `x` and `y` move the map centre away from the viewport centre, in the units of `Size`. */
export interface View { x: number; y: number; scale: number }
export interface Size { width: number; height: number }
export interface HexRect { left: number; right: number; top: number; bottom: number }

/** The part of the viewport the map must keep covering on each axis. */
const KEPT_SHARE = 1 / 3;
const POPOVER_GAP = 10;
const POPOVER_MARGIN = 8;

/** The furthest the map centre may be from the viewport centre on one axis. */
function reach(screen: number, length: number): number {
  return screen / 2 + length / 2 - Math.min(screen * KEPT_SHARE, length);
}

/**
 * Keeps at least a third of the viewport covered by the map on each axis, or the whole map when it is smaller
 * than that. The map is given at scale 1, both it and the viewport are centred on the origin of the view.
 * A view inside the limits comes back as the same object.
 */
export function clampView(view: View, viewport: Size, map: Size): View {
  const limitX = reach(viewport.width, map.width * view.scale);
  const limitY = reach(viewport.height, map.height * view.scale);
  const x = Math.min(limitX, Math.max(-limitX, view.x));
  const y = Math.min(limitY, Math.max(-limitY, view.y));
  return x === view.x && y === view.y ? view : { x, y, scale: view.scale };
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
