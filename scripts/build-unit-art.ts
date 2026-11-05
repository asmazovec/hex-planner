/**
 * Writes src/ui/units/unitArt.ts: one small set of paths per unit, its viewBox and its contour centre and radius.
 * Run with `npx tsx scripts/build-unit-art.ts`. The app itself never measures a path.
 *
 * Ships come from the Recraft files in src/assets/units-source. Each is thousands of tiny curves, so its outlines are
 * flattened, thinned and rounded until they fit the budget. The game-icons files are small and are copied as they are:
 * rewriting their numbers would risk their compact arc flags.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT = join(root, 'src/ui/units/unitArt.ts');
const BUDGET = 12_000;
const RECRAFT = ['flagship', 'dreadnought', 'carrier', 'cruiser', 'destroyer', 'fighter'];
const GAME_ICONS = ['warsun', 'infantry', 'mech', 'pds', 'spacedock'];
/** Order of the output; the same as the prototype's. */
const ORDER = ['flagship', 'warsun', 'dreadnought', 'carrier', 'cruiser', 'destroyer', 'fighter', 'infantry', 'mech', 'pds', 'spacedock'];
/** Tolerances in viewBox units; a ship is 1024 wide and at 94 px one unit is about an eighth of a pixel. */
const FIRST_TOLERANCE = 0.4;
const TOLERANCE_STEP = 0.1;
const LAST_TOLERANCE = 2.5;
/** Outlines smaller than this vanish at any size the map draws. */
const SMALLEST_OUTLINE = 2;

type Point = [number, number];
interface Art { paths: string[]; viewBox: string; cx: number; cy: number; r: number }

const NUMBER = /[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/y;

/** Splits path data into commands. Arc flags are read one character at a time: they may touch the next number. */
function parsePath(d: string): { cmd: string; args: number[] }[] {
  const out: { cmd: string; args: number[] }[] = [];
  const argCount: Record<string, number> = { m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7, z: 0 };
  let i = 0;
  const skip = () => { while (i < d.length && /[\s,]/.test(d[i])) i += 1; };
  const number = (): number => {
    skip();
    NUMBER.lastIndex = i;
    const match = NUMBER.exec(d);
    if (!match) throw new Error(`No number at ${i} in ${d.slice(i, i + 20)}`);
    i += match[0].length;
    return Number(match[0]);
  };
  const flag = (): number => {
    skip();
    const c = d[i];
    if (c !== '0' && c !== '1') throw new Error(`No arc flag at ${i}`);
    i += 1;
    return Number(c);
  };
  let cmd = '';
  for (skip(); i < d.length; skip()) {
    if (/[a-zA-Z]/.test(d[i])) { cmd = d[i]; i += 1; }
    const count = argCount[cmd.toLowerCase()];
    if (count === undefined) throw new Error(`Unknown path command ${cmd}`);
    if (count === 0) { out.push({ cmd, args: [] }); continue; }
    const args = cmd.toLowerCase() === 'a'
      ? [number(), number(), number(), flag(), flag(), number(), number()]
      : Array.from({ length: count }, number);
    out.push({ cmd, args });
    // Further coordinates after a moveto are linetos.
    if (cmd === 'M') cmd = 'L';
    if (cmd === 'm') cmd = 'l';
  }
  return out;
}

function flattenCubic(from: Point, c1: Point, c2: Point, to: Point, out: Point[]): void {
  const reach = Math.hypot(c1[0] - from[0], c1[1] - from[1]) + Math.hypot(c2[0] - c1[0], c2[1] - c1[1]) + Math.hypot(to[0] - c2[0], to[1] - c2[1]);
  const steps = Math.max(1, Math.min(64, Math.ceil(reach / 2)));
  for (let s = 1; s <= steps; s += 1) {
    const t = s / steps;
    const u = 1 - t;
    out.push([
      u * u * u * from[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * to[0],
      u * u * u * from[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * to[1],
    ]);
  }
}

/** A quadratic curve is a cubic with its controls two thirds of the way to the single control point. */
function flattenQuad(from: Point, control: Point, to: Point, out: Point[]): void {
  const toward = (p: Point): Point => [p[0] + (2 / 3) * (control[0] - p[0]), p[1] + (2 / 3) * (control[1] - p[1])];
  flattenCubic(from, toward(from), toward(to), to, out);
}

/** An SVG arc as straight pieces, by the endpoint-to-centre conversion of the SVG specification. */
function flattenArc(from: Point, args: number[], to: Point, out: Point[]): void {
  let [rx, ry] = [Math.abs(args[0]), Math.abs(args[1])];
  const phi = (args[2] * Math.PI) / 180;
  if (rx === 0 || ry === 0) { out.push(to); return; }
  const [cos, sin] = [Math.cos(phi), Math.sin(phi)];
  const dx = (from[0] - to[0]) / 2;
  const dy = (from[1] - to[1]) / 2;
  const x1 = cos * dx + sin * dy;
  const y1 = -sin * dx + cos * dy;
  const excess = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry);
  if (excess > 1) { rx *= Math.sqrt(excess); ry *= Math.sqrt(excess); }
  const top = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1;
  const bottom = rx * rx * y1 * y1 + ry * ry * x1 * x1;
  const co = (args[3] === args[4] ? -1 : 1) * Math.sqrt(Math.max(0, top / bottom));
  const cxp = (co * rx * y1) / ry;
  const cyp = (-co * ry * x1) / rx;
  const cx = cos * cxp - sin * cyp + (from[0] + to[0]) / 2;
  const cy = sin * cxp + cos * cyp + (from[1] + to[1]) / 2;
  const start = Math.atan2((y1 - cyp) / ry, (x1 - cxp) / rx);
  let sweep = Math.atan2((-y1 - cyp) / ry, (-x1 - cxp) / rx) - start;
  if (args[4] === 0 && sweep > 0) sweep -= 2 * Math.PI;
  if (args[4] === 1 && sweep < 0) sweep += 2 * Math.PI;
  const steps = Math.max(4, Math.ceil((Math.abs(sweep) * Math.max(rx, ry)) / 2));
  for (let s = 1; s <= steps; s += 1) {
    const a = start + (sweep * s) / steps;
    const [px, py] = [rx * Math.cos(a), ry * Math.sin(a)];
    out.push([cos * px - sin * py + cx, sin * px + cos * py + cy]);
  }
}

/** Every subpath of a path as a list of points. */
function flatten(d: string): Point[][] {
  const subpaths: Point[][] = [];
  let points: Point[] = [];
  let at: Point = [0, 0];
  let start: Point = [0, 0];
  let lastControl: Point | null = null;
  let lastQuad: Point | null = null;
  for (const { cmd, args } of parsePath(d)) {
    const lower = cmd.toLowerCase();
    const rel = cmd === lower;
    const abs = (x: number, y: number): Point => (rel ? [at[0] + x, at[1] + y] : [x, y]);
    let control: Point | null = null;
    let quad: Point | null = null;
    if (lower === 'm') {
      if (points.length > 1) subpaths.push(points);
      at = abs(args[0], args[1]);
      start = at;
      points = [at];
    } else if (lower === 'l') {
      at = abs(args[0], args[1]);
      points.push(at);
    } else if (lower === 'h') {
      at = [rel ? at[0] + args[0] : args[0], at[1]];
      points.push(at);
    } else if (lower === 'v') {
      at = [at[0], rel ? at[1] + args[0] : args[0]];
      points.push(at);
    } else if (lower === 'c' || lower === 's') {
      const c1: Point = lower === 'c' ? abs(args[0], args[1]) : lastControl ? [2 * at[0] - lastControl[0], 2 * at[1] - lastControl[1]] : at;
      const rest = lower === 'c' ? args.slice(2) : args;
      control = abs(rest[0], rest[1]);
      const to = abs(rest[2], rest[3]);
      flattenCubic(at, c1, control, to, points);
      at = to;
    } else if (lower === 'q' || lower === 't') {
      quad = lower === 'q' ? abs(args[0], args[1]) : lastQuad ? [2 * at[0] - lastQuad[0], 2 * at[1] - lastQuad[1]] : at;
      const to = lower === 'q' ? abs(args[2], args[3]) : abs(args[0], args[1]);
      flattenQuad(at, quad, to, points);
      at = to;
    } else if (lower === 'a') {
      const to = abs(args[5], args[6]);
      flattenArc(at, args, to, points);
      at = to;
    } else {
      points.push(start);
      if (points.length > 1) subpaths.push(points);
      points = [start];
      at = start;
    }
    lastControl = control;
    lastQuad = quad;
  }
  if (points.length > 1) subpaths.push(points);
  return subpaths;
}

/** Ramer-Douglas-Peucker on an open run of points. */
function thin(points: Point[], tolerance: number): Point[] {
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length > 0) {
    const [a, b] = stack.pop()!;
    const [ax, ay] = points[a];
    const dx = points[b][0] - ax;
    const dy = points[b][1] - ay;
    const length = Math.hypot(dx, dy);
    let far = -1;
    let most = tolerance;
    for (let i = a + 1; i < b; i += 1) {
      const px = points[i][0] - ax;
      const py = points[i][1] - ay;
      const distance = length === 0 ? Math.hypot(px, py) : Math.abs(px * dy - py * dx) / length;
      if (distance > most) { most = distance; far = i; }
    }
    if (far >= 0) {
      keep[far] = 1;
      stack.push([a, far], [far, b]);
    }
  }
  return points.filter((_, i) => keep[i] === 1);
}

/** A closed outline, thinned; split at the point farthest from the start so that both ends stay fixed. */
function thinRing(points: Point[], tolerance: number): Point[] {
  let far = 0;
  let most = -1;
  points.forEach((p, i) => {
    const distance = Math.hypot(p[0] - points[0][0], p[1] - points[0][1]);
    if (distance > most) { most = distance; far = i; }
  });
  const first = thin(points.slice(0, far + 1), tolerance);
  const second = thin(points.slice(far), tolerance);
  return [...first, ...second.slice(1)];
}

const joinNumbers = (values: number[]): string =>
  values.reduce((text, value, i) => text + (i > 0 && value >= 0 ? ' ' : '') + String(value), '');

function ringToPath(points: Point[]): string {
  const rounded = points.map(([x, y]): Point => [Math.round(x), Math.round(y)]);
  const unique = rounded.filter((p, i) => i === 0 || p[0] !== rounded[i - 1][0] || p[1] !== rounded[i - 1][1]);
  if (unique.length > 1 && unique[0][0] === unique.at(-1)![0] && unique[0][1] === unique.at(-1)![1]) unique.pop();
  if (unique.length < 3) return '';
  const deltas = unique.slice(1).flatMap((p, i) => [p[0] - unique[i][0], p[1] - unique[i][1]]);
  return `M${joinNumbers(unique[0])}l${joinNumbers(deltas)}z`;
}

function simplify(d: string, tolerance: number): string {
  return flatten(d).map(points => {
    const xs = points.map(p => p[0]);
    const ys = points.map(p => p[1]);
    if (Math.max(...xs) - Math.min(...xs) < SMALLEST_OUTLINE && Math.max(...ys) - Math.min(...ys) < SMALLEST_OUTLINE) return '';
    return ringToPath(thinRing(points, tolerance));
  }).join('');
}

/** Points spaced evenly along a path, as many as the prototype's `measure` takes. */
function samples(d: string): Point[] {
  const pieces: { from: Point; to: Point; length: number }[] = [];
  for (const run of flatten(d)) {
    for (let i = 1; i < run.length; i += 1) {
      pieces.push({ from: run[i - 1], to: run[i], length: Math.hypot(run[i][0] - run[i - 1][0], run[i][1] - run[i - 1][1]) });
    }
  }
  const total = pieces.reduce((sum, piece) => sum + piece.length, 0);
  const n = Math.max(24, Math.min(240, Math.floor(total / 8)));
  const out: Point[] = [];
  let index = 0;
  let passed = 0;
  for (let i = 0; i <= n; i += 1) {
    const wanted = (total * i) / n;
    while (index < pieces.length - 1 && passed + pieces[index].length < wanted) {
      passed += pieces[index].length;
      index += 1;
    }
    const piece = pieces[index];
    const t = piece.length === 0 ? 0 : (wanted - passed) / piece.length;
    out.push([piece.from[0] + (piece.to[0] - piece.from[0]) * t, piece.from[1] + (piece.to[1] - piece.from[1]) * t]);
  }
  return out;
}

/** The prototype's `measure`: the centre of a nearly smallest circle around the contour, and its radius. */
function measure(paths: string[]): { cx: number; cy: number; r: number } {
  const points = paths.flatMap(samples);
  const xs = points.map(p => p[0]);
  const ys = points.map(p => p[1]);
  let cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  let cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  for (let it = 0; it < 80; it += 1) {
    let far = points[0];
    let most = 0;
    for (const p of points) {
      const distance = (p[0] - cx) ** 2 + (p[1] - cy) ** 2;
      if (distance > most) { most = distance; far = p; }
    }
    const step = 1 / (it + 2);
    cx += (far[0] - cx) * step;
    cy += (far[1] - cy) * step;
  }
  const r = points.reduce((most, p) => Math.max(most, Math.hypot(p[0] - cx, p[1] - cy)), 0);
  return { cx, cy, r };
}

const attribute = (tag: string, name: string): string | undefined => new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1];

function readSvg(file: string): { viewBox: string; paths: { d: string; fill: string | undefined }[] } {
  const text = readFileSync(file, 'utf8');
  const viewBox = attribute(/<svg[^>]*>/.exec(text)![0], 'viewBox');
  if (!viewBox) throw new Error(`No viewBox in ${file}`);
  const paths = [...text.matchAll(/<path[^>]*>/g)].map(([tag]) => ({ d: attribute(tag, 'd')!, fill: attribute(tag, 'fill') }));
  return { viewBox, paths };
}

function recraft(unit: string): Art {
  const { viewBox, paths } = readSvg(join(root, 'src/assets/units-source', `${unit}.svg`));
  // White flecks are the vectoriser's highlights, not part of the silhouette.
  const kept = paths.filter(path => !/^(white|#fefefe|#ffffff)$/i.test(path.fill ?? '')).map(path => path.d);
  for (let tolerance = FIRST_TOLERANCE; tolerance <= LAST_TOLERANCE + 1e-9; tolerance += TOLERANCE_STEP) {
    const thinned = kept.map(d => simplify(d, tolerance)).filter(d => d !== '');
    const bytes = thinned.reduce((sum, d) => sum + d.length, 0);
    if (bytes <= BUDGET) {
      console.log(`${unit}: tolerance ${tolerance.toFixed(1)}, ${bytes} bytes in ${thinned.length} paths`);
      return { paths: thinned, viewBox, ...measure(kept) };
    }
  }
  throw new Error(`${unit} does not fit ${BUDGET} bytes at tolerance ${LAST_TOLERANCE}`);
}

function gameIcon(unit: string): Art {
  const { viewBox, paths } = readSvg(join(root, 'docs/icon-references', `${unit}.svg`));
  const kept = paths.map(path => path.d);
  const bytes = kept.reduce((sum, d) => sum + d.length, 0);
  if (bytes > BUDGET) throw new Error(`${unit} has ${bytes} bytes`);
  console.log(`${unit}: copied, ${bytes} bytes`);
  return { paths: kept, viewBox, ...measure(kept) };
}

const art = new Map<string, Art>([...RECRAFT.map(u => [u, recraft(u)] as const), ...GAME_ICONS.map(u => [u, gameIcon(u)] as const)]);
const rounded = (value: number) => Math.round(value * 100) / 100;
const entries = ORDER.map(unit => {
  const { paths, viewBox, cx, cy, r } = art.get(unit)!;
  return `  ${unit}: {\n    viewBox: '${viewBox}', cx: ${rounded(cx)}, cy: ${rounded(cy)}, r: ${rounded(r)},\n    paths: [\n${paths.map(d => `      '${d}',`).join('\n')}\n    ],\n  },`;
});
mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, `// Generated by scripts/build-unit-art.ts. Do not edit.
import type { TokenKind } from '../../domain/hexLayout';

export interface UnitArt {
  paths: string[];
  viewBox: string;
  /** Centre and radius of a circle around the contour, in viewBox units. */
  cx: number;
  cy: number;
  r: number;
}

export const UNIT_ART: Record<TokenKind, UnitArt> = {
${entries.join('\n')}
};
`);
