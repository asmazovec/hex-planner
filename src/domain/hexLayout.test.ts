import { describe, expect, test } from 'vitest';
import { HEX_INNER, hexLayout, type GroundStack, type HexLayout, type HexLayoutInput, type SpaceStack, type StackOwner, type TokenKind } from './hexLayout';

const SHIPS: TokenKind[] = ['flagship', 'warsun', 'dreadnought', 'carrier', 'cruiser', 'destroyer', 'fighter'];
const GROUND: TokenKind[] = ['infantry', 'mech', 'pds', 'spacedock'];

/** Every kind only once per owner: my seven ships, the enemy's seven, then ground stacks without a planet. */
function spaceStacks(count: number): SpaceStack[] {
  const extras: { kind: TokenKind; owner: StackOwner }[] = [
    { kind: 'infantry', owner: 'me' }, { kind: 'mech', owner: 'me' }, { kind: 'infantry', owner: 'enemy' },
  ];
  return Array.from({ length: count }, (_, i) => ({
    ...(i < 14 ? { kind: SHIPS[i % 7], owner: (i < 7 ? 'me' : 'enemy') as StackOwner } : extras[i - 14]),
    count: 1 + (i % 3),
  }));
}

function groundStacks(count: number, planets: number): GroundStack[] {
  return Array.from({ length: count }, (_, i) => ({
    kind: GROUND[i % 4], owner: (i % 8 < 4 ? 'me' : 'enemy') as StackOwner, planet: planets > 0 ? i % planets : 0, count: 1,
  }));
}

const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

function expectApart(layout: HexLayout, context: string): void {
  layout.items.forEach((a, i) => layout.items.slice(i + 1).forEach(b => {
    expect(distance(a, b), `${context}: ${a.key} and ${b.key}`).toBeGreaterThanOrEqual((0.95 * (a.size + b.size)) / 2);
  }));
}

describe('hexLayout', () => {
  test('every stack is placed and nothing overlaps for 0 to 3 planets, 1 to 17 space stacks, up to 10 ground stacks', () => {
    for (let planets = 0; planets <= 3; planets += 1) {
      for (let space = 1; space <= 17; space += 1) {
        for (let ground = 0; ground <= 10; ground += 1) {
          const input: HexLayoutInput = { planets, space: spaceStacks(space), ground: groundStacks(ground, planets) };
          const layout = hexLayout(input);
          const context = `planets ${planets}, space ${space}, ground ${ground}`;
          expect(layout.items, context).toHaveLength(space + ground);
          expect(layout.planets, context).toHaveLength(planets);
          expectApart(layout, context);
        }
      }
    }
  });

  test('all ground stacks on one planet still fit', () => {
    for (const planets of [1, 2, 3]) {
      const ground = groundStacks(10, 1);
      const layout = hexLayout({ planets, space: spaceStacks(17), ground });
      expect(layout.items).toHaveLength(27);
      expectApart(layout, `planets ${planets}`);
    }
  });

  test('the most a tile can hold still fits: every kind for both owners on each of three planets', () => {
    const ground = [0, 1, 2].flatMap(planet => GROUND.flatMap(kind => (['me', 'enemy'] as const).map(owner => ({ kind, owner, planet, count: 1 }))));
    const layout = hexLayout({ planets: 3, ground, space: spaceStacks(14) });
    expect(layout.items).toHaveLength(38);
  });

  test('the approved picture comes out as in the prototype', () => {
    const k = HEX_INNER / 53;
    const { items, size } = hexLayout({
      planets: 1,
      space: [
        { kind: 'flagship', owner: 'me', count: 1 }, { kind: 'dreadnought', owner: 'me', count: 1 }, { kind: 'carrier', owner: 'me', count: 2 },
        { kind: 'fighter', owner: 'me', count: 3 }, { kind: 'destroyer', owner: 'enemy', count: 2 }, { kind: 'cruiser', owner: 'enemy', count: 1 },
      ],
      ground: [
        { kind: 'infantry', owner: 'me', planet: 0, count: 2 }, { kind: 'mech', owner: 'me', planet: 0, count: 1 }, { kind: 'infantry', owner: 'enemy', planet: 0, count: 1 },
      ],
    });
    const at = (key: string) => {
      const item = items.find(i => i.key === key)!;
      return [Math.round((item.x / k) * 10) / 10, Math.round((item.y / k) * 10) / 10];
    };
    expect(size / k).toBeCloseTo(19.5);
    expect(at('me|infantry|0')).toEqual([-17.1, 16.3]);
    expect(at('me|mech|0')).toEqual([0, 23.9]);
    expect(at('enemy|infantry|0')).toEqual([17.1, 16.3]);
    expect(at('me|flagship|-')).toEqual([0, -31.5]);
    expect(at('me|dreadnought|-')).toEqual([-40.9, -7.9]);
    expect(at('me|carrier|-')).toEqual([-13.6, 39.4]);
    expect(at('me|fighter|-')).toEqual([13.7, 39.4]);
    expect(at('enemy|cruiser|-')).toEqual([27.3, -31.5]);
    expect(at('enemy|destroyer|-')).toEqual([40.9, -7.9]);
  });

  test('without stacks the tile keeps the largest size and full-size planets', () => {
    const empty = hexLayout({ planets: 1, space: [], ground: [] });
    expect(empty.items).toEqual([]);
    expect(empty.size).toBeCloseTo((22 * HEX_INNER) / 53);
    expect(empty.planets[0].r).toBeCloseTo((13 * HEX_INNER) / 53);
  });

  test('is deterministic', () => {
    const input: HexLayoutInput = { planets: 2, space: spaceStacks(9), ground: groundStacks(5, 2) };
    expect(hexLayout(input)).toEqual(hexLayout({ ...input, space: [...input.space], ground: [...input.ground] }));
  });

  test('an even count around one planet is mirror symmetric', () => {
    for (const count of [2, 4, 6, 8, 10, 12, 14, 16]) {
      const stacks = Array.from({ length: count }, (_, i) => ({ kind: SHIPS[i % 7], owner: (i < 7 ? 'me' : 'enemy') as StackOwner, count: 1 }));
      const { items } = hexLayout({ planets: 1, space: stacks, ground: [] });
      for (const item of items) {
        expect(items.some(other => Math.abs(other.x + item.x) < 0.6 && Math.abs(other.y - item.y) < 0.6), `${count} stacks, ${item.key}`).toBe(true);
      }
    }
  });

  test('ground stacks stay on the arc of their planet, own ones at one end and enemy ones at the other', () => {
    const ground: GroundStack[] = [
      { kind: 'infantry', owner: 'me', planet: 0, count: 2 },
      { kind: 'mech', owner: 'me', planet: 0, count: 1 },
      { kind: 'infantry', owner: 'enemy', planet: 0, count: 1 },
      { kind: 'pds', owner: 'me', planet: 1, count: 1 },
      { kind: 'spacedock', owner: 'me', planet: 1, count: 1 },
    ];
    const layout = hexLayout({ planets: 2, space: spaceStacks(5), ground });
    for (const item of layout.items.filter(i => i.planet !== undefined)) {
      const planet = layout.planets[item.planet!];
      const radius = distance(item, planet);
      expect(radius).toBeCloseTo(planet.r + item.size * 0.54 + (1 * HEX_INNER) / 53, 5);
    }
    const onFirst = layout.items.filter(i => i.planet === 0).sort((a, b) => a.x - b.x);
    expect(onFirst.at(-1)!.owner).toBe('enemy');
  });

  test('own ships lie left of enemy ships', () => {
    for (let planets = 0; planets <= 3; planets += 1) {
      for (let count = 2; count <= 14; count += 1) {
        const stacks = Array.from({ length: count }, (_, i) => ({
          kind: SHIPS[i % 7], owner: (i % 2 === 0 ? 'me' : 'enemy') as StackOwner, count: 1,
        })).map((stack, i) => ({ ...stack, kind: SHIPS[Math.floor(i / 2) % 7] }));
        const { items } = hexLayout({ planets, space: stacks, ground: [] });
        const own = Math.max(...items.filter(i => i.owner === 'me').map(i => i.x));
        const enemy = Math.min(...items.filter(i => i.owner === 'enemy').map(i => i.x));
        expect(own, `planets ${planets}, count ${count}`).toBeLessThanOrEqual(enemy + 1e-9);
      }
    }
  });

  test('heavy ships are larger than light ones', () => {
    const { items } = hexLayout({
      planets: 0, ground: [],
      space: [{ kind: 'flagship', owner: 'me', count: 1 }, { kind: 'carrier', owner: 'me', count: 1 }, { kind: 'fighter', owner: 'me', count: 1 }],
    });
    const size = (kind: TokenKind) => items.find(i => i.kind === kind)!.size;
    expect(size('flagship')).toBeGreaterThan(size('carrier'));
    expect(size('carrier')).toBeGreaterThan(size('fighter'));
  });

  test('a crowded system shrinks its planets, but never below 62%', () => {
    const roomy = hexLayout({ planets: 1, space: [{ kind: 'carrier', owner: 'me', count: 1 }], ground: [] });
    const crowded = hexLayout({ planets: 1, space: spaceStacks(17), ground: groundStacks(8, 1) });
    expect(crowded.size).toBeLessThan(roomy.size);
    expect(crowded.planets[0].r).toBeLessThan(roomy.planets[0].r);
    expect(crowded.planets[0].r).toBeGreaterThanOrEqual(roomy.planets[0].r * 0.62 - 1e-9);
  });

  test('planets stand as approved: one in the middle, two on a diagonal, three in a triangle', () => {
    const at = (planets: number) => hexLayout({ planets, space: [], ground: [] }).planets;
    expect(Math.abs(at(1)[0].x)).toBeLessThan(0.01);
    const [a, b] = at(2);
    expect(a.x).toBeLessThan(0);
    expect(b.x).toBeGreaterThan(0);
    expect(a.y).toBeLessThan(0);
    expect(b.y).toBeGreaterThan(0);
    const [top, left, right] = at(3);
    expect(distance(top, left)).toBeCloseTo(distance(left, right), 0);
    expect(distance(top, right)).toBeCloseTo(distance(left, right), 0);
  });

  test('ground stacks go on the comb when there is no planet, and planet numbers wrap', () => {
    const empty = hexLayout({ planets: 0, space: [], ground: [{ kind: 'infantry', owner: 'enemy', planet: 0, count: 2 }] });
    expect(empty.items).toHaveLength(1);
    expect(empty.items[0].planet).toBeUndefined();
    const wrapped = hexLayout({ planets: 2, space: [], ground: [{ kind: 'infantry', owner: 'me', planet: 3, count: 1 }] });
    expect(wrapped.items[0].planet).toBe(1);
  });

  test('a stack keeps the same key whichever way it is placed', () => {
    const ground: GroundStack = { kind: 'infantry', owner: 'me', planet: 1, count: 3 };
    const space: SpaceStack = { kind: 'carrier', owner: 'enemy', count: 2 };
    const { items } = hexLayout({ planets: 2, space: [space], ground: [ground] });
    expect(items.map(i => i.key).sort()).toEqual(['enemy|carrier|-', 'me|infantry|1']);
    expect(items.find(i => i.kind === 'carrier')!.count).toBe(2);
  });
});
