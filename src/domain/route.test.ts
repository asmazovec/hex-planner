import { expect, test, describe } from 'vitest';
import {
  areAdjacent, badgeSpots, HEX_SIZE, curveSegments, curveThrough, extendPath, flightAt, flightDuration, focusRect, pathLength, pointAlong,
  routeFromPath, routeShapes, separateRoutes, slotToPixel, tacticalNumbers, tapStep,
} from './route';
import type { Entry } from './types';

const hypot = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

test('plain grid neighbours are adjacent, wormholes and hyperlanes mean nothing', () => {
  expect(areAdjacent('0,0', '1,0')).toBe(true);
  expect(areAdjacent('0,0', '1,-1')).toBe(true);
  expect(areAdjacent('0,0', '-1,1')).toBe(true);
  expect(areAdjacent('0,0', '1,1')).toBe(false);
  expect(areAdjacent('0,0', '2,0')).toBe(false);
  expect(areAdjacent('0,0', '0,0')).toBe(false);
  expect(areAdjacent('0,0', '51')).toBe(false);
});

test('building a route: append, back-step, a non-adjacent jump, no repeats', () => {
  expect(extendPath(['0,0'], '1,0')).toEqual(['0,0', '1,0']);
  expect(extendPath(['0,0', '1,0'], '1,0')).toEqual(['0,0', '1,0']);
  expect(extendPath(['0,0', '1,0'], '0,0')).toEqual(['0,0']);
  expect(extendPath(['0,0', '1,0'], '3,0')).toEqual(['0,0', '1,0', '3,0']);
  expect(extendPath(['0,0', '1,0', '2,0'], '0,0')).toEqual(['0,0', '1,0', '2,0']);
});

test('a finished drag gives the source and the systems on the way, in flight order, in either direction', () => {
  expect(routeFromPath(['a', 'b', 'c', 'X'], 'X')).toEqual({ from: 'a', via: ['b', 'c'] });
  expect(routeFromPath(['a', 'X'], 'X')).toEqual({ from: 'a', via: [] });
  expect(routeFromPath(['X', 'c', 'b', 'a'], 'X')).toEqual({ from: 'a', via: ['b', 'c'] });
  expect(routeFromPath(['X', 'a'], 'X')).toEqual({ from: 'a', via: [] });
});

test('a drag that does not join a system and the active one gives no route', () => {
  expect(routeFromPath(['a'], 'X')).toBeNull();
  expect(routeFromPath(['X'], 'X')).toBeNull();
  expect(routeFromPath(['a', 'b'], 'X')).toBeNull();
  expect(routeFromPath(['a', 'X', 'b'], 'X')).toBeNull();
});

test('taps: the source, hexes in order, the active system finishes; a tap on the last hex removes it', () => {
  expect(tapStep(null, 'a', 'X')).toEqual({ path: ['a'] });
  expect(tapStep(['a'], 'b', 'X')).toEqual({ path: ['a', 'b'] });
  expect(tapStep(['a', 'b'], 'b', 'X')).toEqual({ path: ['a'] });
  expect(tapStep(['a'], 'a', 'X')).toEqual({ path: null });
  expect(tapStep(['a', 'b', 'c'], 'a', 'X')).toEqual({ path: ['a', 'b', 'c'] });
  expect(tapStep(['a', 'b', 'c'], 'X', 'X')).toEqual({ path: null, route: { from: 'a', via: ['b', 'c'] } });
});

test('a tap on the active system with no route under way says so', () => {
  expect(tapStep(null, 'X', 'X')).toEqual({ path: null, onActive: true });
});

const continuous = (curve: { x: number; y: number }[]) => {
  for (let i = 1; i < curve.length; i += 1) expect(hypot(curve[i - 1], curve[i])).toBeLessThan(80);
};

test('two identical routes get distinct paths, spread evenly around the centre line', () => {
  const [a, b] = separateRoutes([['0,0', '1,0'], ['0,0', '1,0']]);
  expect(hypot(a[0], b[0])).toBeGreaterThan(10);
  expect(hypot(a[1], b[1])).toBeGreaterThan(10);
  const centre = slotToPixel('0,0');
  const direction = slotToPixel('1,0');
  const side = (p: { x: number; y: number }) => (direction.x - centre.x) * (p.y - centre.y) - (direction.y - centre.y) * (p.x - centre.x);
  expect(Math.sign(side(a[0]))).toBe(-Math.sign(side(b[0])));
  expect(Math.abs(side(a[0]))).toBeCloseTo(Math.abs(side(b[0])), 5);
});

test('many routes on one segment stay within a fifth of the hex width', () => {
  const routes = separateRoutes(Array.from({ length: 5 }, () => ['0,0', '1,0']));
  const first = routes[0][0];
  const widest = Math.max(...routes.map(r => hypot(r[0], first)));
  expect(widest).toBeLessThanOrEqual(25);
  expect(new Set(routes.map(r => r[0].x.toFixed(2))).size).toBe(5);
});

test('a shared middle segment separates only there, and each path stays continuous', () => {
  const [a, b] = separateRoutes([['0,0', '1,0', '2,0', '3,0'], ['1,-1', '1,0', '2,0', '2,1']]);
  // The first point has no shared segment: it is only moved along its line, so it stays on the centre line.
  const offLine = (p: { x: number; y: number }, slotA: string, slotB: string) => {
    const s = slotToPixel(slotA);
    const e = slotToPixel(slotB);
    return Math.abs((e.x - s.x) * (p.y - s.y) - (e.y - s.y) * (p.x - s.x)) / hypot(s, e);
  };
  expect(offLine(a[0], '0,0', '1,0')).toBeLessThan(10);
  expect(hypot(a[1], b[1])).toBeGreaterThan(10);
  expect(hypot(a[2], b[2])).toBeGreaterThan(10);
  continuous(curveThrough(a));
  continuous(curveThrough(b));
});

test('routes running along the same line bend apart too, though their hexes differ', () => {
  const [far, near] = separateRoutes([['0,-2', '0,0'], ['0,-1', '0,0']]);
  expect(hypot(far[1], near[1])).toBeGreaterThan(10);
});

test('the result is deterministic and unchanged by an unrelated route elsewhere', () => {
  const list = [['0,0', '1,0', '2,0'], ['0,0', '1,0', '2,0']];
  const first = separateRoutes(list);
  expect(separateRoutes(list)).toEqual(first);
  const more = separateRoutes([...list, ['-3,0', '-3,1']]);
  expect(more.slice(0, 2)).toEqual(first);
  expect(separateRoutes([['-3,0', '-3,1'], ...list]).slice(1)).toEqual(first);
});

test('routes from everywhere arrive at distinct points around the active system', () => {
  const target = '0,0';
  const list = [['1,0', target], ['0,1', target], ['-1,0', target], ['1,0', target], ['2,-1', target], ['1,-2', target]];
  const ends = separateRoutes(list).map(r => r.at(-1)!);
  for (let i = 0; i < ends.length; i += 1) {
    for (let j = i + 1; j < ends.length; j += 1) expect(hypot(ends[i], ends[j])).toBeGreaterThan(8);
    expect(hypot(ends[i], slotToPixel(target))).toBeGreaterThan(15);
  }
});

test('the segments cover the curve in order, and a step between hexes that are no neighbours is marked', () => {
  const slots = ['0,0', '1,0', '3,0', '4,0'];
  const [control] = separateRoutes([slots]);
  const segments = curveSegments(control, slots);
  expect(segments.map(s => s.gap)).toEqual([false, true, false]);
  expect(segments[0].points[0]).toEqual(control[0]);
  expect(segments.at(-1)!.points.at(-1)).toEqual(control.at(-1));
  for (let i = 1; i < segments.length; i += 1) expect(segments[i].points[0]).toEqual(segments[i - 1].points.at(-1));
});

test('a straight arrow is a straight line', () => {
  const [control] = separateRoutes([['0,0', '1,0']]);
  expect(curveThrough(control)).toEqual(control);
  expect(curveSegments(control, ['0,0', '1,0'])).toEqual([{ points: control, gap: false }]);
});

test('polyline timing: about 300 ms per hex, capped at 1.6 s, a broken step three times as fast', () => {
  expect(flightDuration(['0,0', '1,0'])).toBe(300);
  expect(flightDuration(['0,0', '1,0', '2,0', '3,0'])).toBe(900);
  expect(flightDuration(['0,0', '1,0', '3,0'])).toBe(400);
  expect(flightDuration(['0,0', '1,0', '2,0', '3,0', '4,0', '5,0', '6,0', '7,0'])).toBe(1600);
});

test('the flight runs at constant speed along the curve and three times as fast on a broken step', () => {
  const slots = ['0,0', '1,0', '3,0', '4,0'];
  const [control] = separateRoutes([slots]);
  const segments = curveSegments(control, slots);
  const curve = curveThrough(control);
  const total = pathLength(curve);
  expect(flightAt(segments, 0)).toMatchObject({ frac: 0, gap: false });
  expect(flightAt(segments, 1).frac).toBeCloseTo(1, 5);
  expect(hypot(flightAt(segments, 1).point, curve.at(-1)!)).toBeLessThan(0.01);
  const lengths = segments.map(s => pathLength(s.points));
  const times = lengths.map((l, i) => (segments[i].gap ? l / 3 : l));
  const time = times.reduce((a, b) => a + b);
  const midGap = flightAt(segments, (times[0] + times[1] / 2) / time);
  expect(midGap.gap).toBe(true);
  expect(midGap.frac).toBeCloseTo((lengths[0] + lengths[1] / 2) / total, 5);
  const midFirst = flightAt(segments, times[0] / 2 / time);
  expect(midFirst.gap).toBe(false);
  expect(midFirst.frac).toBeCloseTo(lengths[0] / 2 / total, 5);
});

test('a badge sits on the curve, at least 34 units before the head, and badges do not stack', () => {
  const shapes = routeShapes([['0,0', '1,0'], ['2,0', '3,0', '4,0', '5,0']]);
  for (const shape of shapes) {
    const nearest = Math.min(...shape.curve.slice(1).map((p, i) => hypot(pointAlong([shape.curve[i], p], 0.5), shape.badge)));
    expect(shape.curve.length === 2 ? 0 : nearest).toBeLessThan(6);
    expect(hypot(shape.badge, shape.curve.at(-1)!)).toBeGreaterThanOrEqual(33);
  }
  const line = curveThrough(separateRoutes([['0,0', '1,0']])[0]);
  const same = badgeSpots([line, line]);
  expect(hypot(same[0], same[1])).toBeGreaterThanOrEqual(21);
});

test('the focus keeps half a hex of margin and is never closer than about two hexes', () => {
  const one = focusRect(['0,0'])!;
  expect(one.width).toBeGreaterThanOrEqual(240);
  expect(one.height).toBeGreaterThanOrEqual(208);
  const far = focusRect(['-3,0', '3,0'])!;
  expect(far.x).toBeLessThanOrEqual(slotToPixel('-3,0').x - 90);
  expect(far.x + far.width).toBeGreaterThanOrEqual(slotToPixel('3,0').x + 90);
  expect(focusRect([])).toBeNull();
});

const tacticalEntry = (id: string, status: Entry['status'] = 'planned'): Entry => ({
  id, status, phase: 'action', type: 'tactical', systemId: '0,0', moves: [], landings: [], production: {}, payment: { planets: [], tradeGoods: 0 },
});
const pass = (id: string): Entry => ({ id, status: 'planned', phase: 'action', type: 'pass' });

test('numbering counts tactical actions only, in entry order; a cancelled one keeps no number', () => {
  const list = [tacticalEntry('a'), pass('p'), tacticalEntry('b', 'cancelled'), tacticalEntry('c', 'done'), tacticalEntry('d')];
  expect(tacticalNumbers(list)).toEqual({ a: 1, c: 2, d: 3 });
  expect(tacticalNumbers([list[4], list[1], list[3], list[0]])).toEqual({ d: 1, c: 2, a: 3 });
  expect(tacticalNumbers([])).toEqual({});
});

test('each player counts their own turns: the first action of everyone is 1, wherever it stands in the plan', () => {
  const action = (id: string, owner?: string, status = 'planned') => ({ id, type: 'tactical', status, owner }) as Entry;
  const list = [action('a'), action('b', 'hacan'), action('c', 'muaat'), action('d', 'hacan'), action('e'), action('f', 'hacan', 'cancelled'), action('g', 'hacan')];
  expect(tacticalNumbers(list)).toEqual({ a: 1, b: 1, c: 1, d: 2, e: 2, g: 3 });
  expect(tacticalNumbers([list[3], list[0], list[1]])).toEqual({ d: 1, a: 1, b: 2 });
});

test('on long legs a sharp turn stays in its hex instead of cutting the corner past it', () => {
  const slots = ['-4,0', '2,-3', '-3,2'];
  const control = separateRoutes([slots])[0];
  const curve = curveThrough(control);
  const corner = slotToPixel('2,-3');
  const nearest = Math.min(...curve.map(p => hypot(p, corner)));
  expect(nearest).toBeLessThan(HEX_SIZE * 0.6);
  const segments = curveSegments(control, slots);
  expect(segments).toHaveLength(2);
  expect(hypot(segments[0].points.at(-1)!, corner)).toBeLessThan(HEX_SIZE * 0.6);
});

test('between neighbours a corner keeps its smooth shape, and no point repeats', () => {
  const control = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 150, y: 85 }];
  const curve = curveThrough(control);
  expect(curve).toHaveLength(1 + 14);
  expect(curve.at(-1)).toEqual(control[2]);
  const long = curveThrough([{ x: 0, y: 0 }, { x: 400, y: 0 }, { x: 400, y: 400 }, { x: 800, y: 400 }]);
  for (let i = 1; i < long.length; i += 1) expect(hypot(long[i], long[i - 1])).toBeGreaterThan(0);
});

test('whatever its shape, a route passes through every hex on its way', () => {
  const slots: string[] = [];
  for (let q = -3; q <= 3; q += 1) for (let r = -3; r <= 3; r += 1) if (Math.abs(q + r) <= 3) slots.push(`${q},${r}`);
  const inner = HEX_SIZE * (Math.sqrt(3) / 2);
  let checked = 0;
  for (const a of slots) {
    for (const b of slots) {
      if (a === b) continue;
      for (const c of slots) {
        if (c === a || c === b) continue;
        const curve = curveThrough(separateRoutes([[a, b, c]])[0]);
        const corner = slotToPixel(b);
        expect(Math.min(...curve.map(p => hypot(p, corner)))).toBeLessThan(inner);
        checked += 1;
      }
    }
  }
  expect(checked).toBeGreaterThan(40000);
});

describe('routes over one line move apart', () => {
  const MAP: string[] = [];
  for (let q = -3; q <= 3; q += 1) for (let r = -3; r <= 3; r += 1) if (Math.abs(q + r) <= 3) MAP.push(`${q},${r}`);
  const STEPS = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];
  const step = (slot: string, [dq, dr]: number[]): string => {
    const [q, r] = slot.split(',').map(Number);
    return `${q + dq},${r + dr}`;
  };
  /** Every pair of neighbouring hexes on the map, each way. */
  const NEIGHBOURS = MAP.flatMap(slot => STEPS.map(s => [slot, step(slot, s)] as const).filter(([, other]) => MAP.includes(other)));
  type P = { x: number; y: number };
  const distanceToSegment = (p: P, a: P, b: P): number => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
  };
  const distanceToLine = (p: P, line: P[]): number => {
    let best = Infinity;
    for (let i = 1; i < line.length; i += 1) best = Math.min(best, distanceToSegment(p, line[i - 1], line[i]));
    return best;
  };
  const middle = (a: P, b: P): P => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const INNER = HEX_SIZE * (Math.sqrt(3) / 2);

  test('two routes over the same step never lie on each other, flying either way', () => {
    for (const [a, b] of NEIGHBOURS) {
      const after = step(b, [1, 0]);
      const before = step(a, [-1, 0]);
      for (const routes of [[[a, b, after], [before, a, b]], [[a, b], [a, b]], [[a, b], [b, a]]]) {
        const [one, two] = separateRoutes(routes);
        const iOne = routes[0].indexOf(a) === -1 ? 0 : Math.min(routes[0].indexOf(a), routes[0].indexOf(b));
        const iTwo = Math.min(routes[1].indexOf(a), routes[1].indexOf(b));
        const gap = hypot(middle(one[iOne], one[iOne + 1]), middle(two[iTwo], two[iTwo + 1]));
        expect(gap, `${JSON.stringify(routes)}`).toBeGreaterThan(5);
      }
    }
  });

  test('a shared step spreads routes evenly around it, in route order', () => {
    const [a, b, c] = separateRoutes([['0,0', '1,0'], ['0,0', '1,0'], ['0,0', '1,0']]);
    const mids = [a, b, c].map(line => middle(line[0], line[1]));
    const centre = middle(slotToPixel('0,0'), slotToPixel('1,0'));
    expect(hypot(mids[0], centre)).toBeCloseTo(hypot(mids[2], centre), 0);
    expect(hypot(mids[0], mids[1])).toBeCloseTo(hypot(mids[1], mids[2]), 0);
    expect(hypot(mids[1], centre)).toBeLessThan(hypot(mids[0], centre));
  });

  test('however many routes share a step, they stay apart and end inside the system they arrive at', () => {
    for (const count of [2, 3, 4, 6, 8, 12]) {
      const lines = separateRoutes(Array.from({ length: count }, () => ['0,0', '1,0']));
      const target = slotToPixel('1,0');
      for (const line of lines) expect(hypot(line.at(-1)!, target), String(count)).toBeLessThan(INNER);
      const starts = lines.map(line => line[0]);
      for (let i = 1; i < count; i += 1) expect(hypot(starts[i], starts[i - 1]), String(count)).toBeGreaterThan(1);
    }
  });

  test('flying the other way keeps a route on the same side of the shared line', () => {
    const a = slotToPixel('0,0');
    const b = slotToPixel('1,0');
    const length = hypot(a, b);
    /** How far a point stands off the line from a to b, on one fixed side; the two ways stop at different distances along it, not across. */
    const across = (p: P) => ((b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x)) / length;
    const [forward] = separateRoutes([['0,0', '1,0'], ['0,0', '1,0']]);
    const [backward] = separateRoutes([['1,0', '0,0'], ['1,0', '0,0']]);
    expect(Math.abs(across(forward[0]))).toBeGreaterThan(5);
    expect(across(backward[0])).toBeCloseTo(across(forward[0]), 5);
  });

  test('a route alone on its line is not moved aside', () => {
    for (const [a, b] of NEIGHBOURS) {
      const [line] = separateRoutes([[a, b]]);
      const centre = [slotToPixel(a), slotToPixel(b)];
      expect(distanceToSegment(middle(line[0], line[1]), centre[0], centre[1])).toBeLessThan(0.01);
    }
  });

  test('steps on one line that do not overlap leave each other alone', () => {
    const [left, right] = separateRoutes([['-2,0', '-1,0'], ['1,0', '2,0']]);
    const alone = separateRoutes([['-2,0', '-1,0']])[0];
    expect(left).toEqual(alone);
    expect(right).toEqual(separateRoutes([['1,0', '2,0']])[0]);
  });

  test('routes that arrive at one system end apart, from whatever direction', () => {
    for (const target of MAP) {
      const sources = STEPS.map(s => step(target, s)).filter(slot => MAP.includes(slot));
      const lines = separateRoutes(sources.map(source => [source, target]));
      const ends = lines.map(line => line.at(-1)!);
      for (let i = 0; i < ends.length; i += 1) for (let j = i + 1; j < ends.length; j += 1) expect(hypot(ends[i], ends[j]), `${target} ${i} ${j}`).toBeGreaterThanOrEqual(11.9);
    }
  });

  test('two routes through one corner both pass through its hex, for every shape', () => {
    for (const b of MAP) {
      const around = STEPS.map(s => step(b, s)).filter(slot => MAP.includes(slot));
      for (const a of around) {
        for (const c of around) {
          if (a === c) continue;
          for (const other of around) {
            if (other === a) continue;
            const routes = [[a, b, c], [a, b, other]];
            const curves = separateRoutes(routes).map(curveThrough);
            const corner = slotToPixel(b);
            for (const curve of curves) expect(distanceToLine(corner, curve), JSON.stringify(routes)).toBeLessThan(INNER);
          }
        }
      }
    }
  });

  test('adding routes keeps every line unbroken', () => {
    const lines = separateRoutes([['-2,0', '-1,0', '0,0', '1,0'], ['-1,0', '0,0', '1,0', '2,0'], ['0,-2', '0,-1', '0,0', '0,1']]);
    for (const line of lines) {
      const curve = curveThrough(line);
      expect(pathLength(curve)).toBeLessThan(pathLength(line) + 1);
      for (const p of curve) { expect(Number.isFinite(p.x)).toBe(true); expect(Number.isFinite(p.y)).toBe(true); }
    }
  });
});
