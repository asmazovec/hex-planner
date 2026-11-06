import { HEX_SIZE, hexToPixel, type Point, type Rect } from '../../domain/route';

export { HEX_SIZE, hexToPixel, slotToPixel, type Point, type Rect } from '../../domain/route';

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
