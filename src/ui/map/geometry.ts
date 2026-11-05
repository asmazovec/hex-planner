/** Flat-top hexes on axial coordinates: north is r - 1, north-east is q + 1, r - 1. */
export const HEX_SIZE = 60;

export interface Point { x: number; y: number }
export interface Rect { x: number; y: number; width: number; height: number }

export function hexToPixel(q: number, r: number, size: number = HEX_SIZE): Point {
  return { x: size * 1.5 * q, y: size * Math.sqrt(3) * (q / 2 + r) };
}

/** Corners of a hex centred on the origin, starting at the east corner and going clockwise on screen. */
export function hexCorners(size: number = HEX_SIZE): Point[] {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i;
    return { x: size * Math.cos(angle), y: size * Math.sin(angle) };
  });
}

export const hexPoints = (size: number = HEX_SIZE): string =>
  hexCorners(size).map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');

/** Smallest rectangle holding every hex of the slots, with a small margin. */
export function mapBounds(slots: { q: number; r: number }[], size: number = HEX_SIZE, margin = 6): Rect {
  const half = (size * Math.sqrt(3)) / 2;
  const xs = slots.map(s => hexToPixel(s.q, s.r, size).x);
  const ys = slots.map(s => hexToPixel(s.q, s.r, size).y);
  const minX = Math.min(...xs) - size - margin;
  const minY = Math.min(...ys) - half - margin;
  return { x: minX, y: minY, width: Math.max(...xs) + size + margin - minX, height: Math.max(...ys) + half + margin - minY };
}
