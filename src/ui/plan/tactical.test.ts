import { describe, expect, test } from 'vitest';
import { loadPack } from '../../data/loadPack';
import { hexLayout } from '../../domain/hexLayout';
import { createGame } from '../../testing/old/domain/newGame';
import { project } from '../../testing/old/domain/project';
import { routeShapes } from '../map/geometry';
import type { Entry, Game } from '../../testing/old/domain/types';
import type { GameState } from '../../testing/old/domain/types';
import { emptySources } from '../../testing/old/domain/tactical';
import { tableOf, turnOf } from '../../testing/old/game/fromLegacy';
import { arrowsOf, entrySystems, flies, flightRoutes, sourcesOf, viaOf, withRoute, withoutEmptySources, withoutSource, type Move, type TacticalEntry } from './tactical';
import { stateInFlight } from '../../testing/old/domain/tactical';

const pack = loadPack(['pok']);
const HOME = '1,0';
const WAY = '1,1';
const TARGET = '0,1';

function game(): Game {
  const g = createGame({ expansions: ['pok'], playerCount: 6, faction: 'arborec' }, pack);
  Object.assign(g.map, { [HOME]: '5', [WAY]: '25', [TARGET]: '39' });
  return g;
}
const entry = (moves: Move[], over: Partial<TacticalEntry> = {}): TacticalEntry => ({
  id: 'e', phase: 'action', status: 'planned', type: 'tactical', systemId: TARGET, moves, landings: [], production: {}, payment: { planets: [], tradeGoods: 0 }, ...over,
});

const ROUTE: Move[] = [
  { from: HOME, units: { carrier: 1, fighter: 1 }, via: [WAY] },
  { from: WAY, units: { fighter: 2 }, pickupOf: HOME },
  { from: 'quann', units: { infantry: 1 }, pickupOf: HOME },
];
const before = (): GameState => ({
  ...project(game(), game().plans[0], 'forecast', pack).state,
  systems: { [HOME]: { carrier: 2, fighter: 1 }, [WAY]: { fighter: 2, cruiser: 1 } },
  ground: { quann: { infantry: 1 } },
});

describe('a source and its route', () => {
  test('the sources leave out pickups, and the way belongs to the source', () => {
    const e = entry(ROUTE);
    expect(sourcesOf(game(), pack, e)).toEqual([HOME]);
    expect(viaOf(e, HOME)).toEqual([WAY]);
    expect(viaOf(e, WAY)).toEqual([]);
  });

  test('a system that is both on a way and a source of its own stays apart', () => {
    const moves = [...ROUTE, { from: WAY, units: { cruiser: 1 } }];
    expect(sourcesOf(game(), pack, entry(moves))).toEqual([HOME, WAY]);
    expect(withoutSource(game(), pack, moves, WAY)).toEqual(ROUTE);
    expect(withoutSource(game(), pack, moves, HOME)).toEqual([{ from: WAY, units: { cruiser: 1 } }]);
  });

  test('a new way keeps the units, and what was picked up in systems no longer on it goes', () => {
    expect(withRoute(game(), pack, ROUTE, HOME, [])).toEqual([{ from: HOME, units: { carrier: 1, fighter: 1 } }]);
  });

  test('a new source is added after the others', () => {
    expect(withRoute(game(), pack, ROUTE, '0,0', ['0,1'])).toEqual([...ROUTE, { from: '0,0', units: {}, via: ['0,1'] }]);
  });

  test('closing drops a source with nothing chosen, not the way of a source with only cargo chosen', () => {
    const cargoOnly: Move[] = [{ from: HOME, units: {}, via: [WAY] }, { from: WAY, units: { fighter: 1 }, pickupOf: HOME }];
    expect(withoutEmptySources(game(), pack, [...cargoOnly, { from: '0,0', units: {}, via: ['0,1'] }])).toEqual(cargoOnly);
  });

  test('one arrow per source, with its way and a tag per system where cargo is taken', () => {
    const [arrow, ...rest] = arrowsOf(game(), pack, entry(ROUTE));
    expect(rest).toEqual([]);
    expect(arrow).toMatchObject({ from: HOME, via: [WAY], to: TARGET, pickups: [{ slot: WAY, count: 3 }] });
  });

  test('an empty source has an arrow all the same', () => {
    expect(arrowsOf(game(), pack, entry([{ from: HOME, units: {} }]))).toHaveLength(1);
  });
});

describe('the flight', () => {
  const routesOf = (e: TacticalEntry, shapeOf: Parameters<typeof flightRoutes>[2]) => flightRoutes({ map: game(), pack }, turnOf(tableOf(game()), e, pack), shapeOf);
  const shapes = (e: TacticalEntry) => routeShapes(sourcesOf(game(), pack, e).map(from => [from, ...viaOf(e, from), TARGET]));

  test('each route is one formation, laid out as a tile with no planets, with cells of the same size as there', () => {
    const e = entry(ROUTE);
    const [route] = routesOf(e, () => shapes(e)[0]);
    const { items } = hexLayout({ planets: 0, ground: [], space: [{ kind: 'carrier', owner: 'me', count: 1 }, { kind: 'fighter', owner: 'me', count: 3 }, { kind: 'infantry', owner: 'me', count: 1 }] });
    expect(route.stacks.map(s => [s.kind, s.x, s.y, s.size]).sort()).toEqual(items.map(i => [i.kind, i.x, i.y, i.size]).sort());
    expect(route.durationMs).toBe(600);
    expect(route.delayMs).toBe(0);
  });

  test('stacks of the source start at once, picked-up ones join where the leader passes their hex', () => {
    const e = entry(ROUTE);
    const [route] = routesOf(e, () => shapes(e)[0]);
    const joins = Object.fromEntries(route.stacks.map(s => [s.kind, s.joins]));
    expect(joins.carrier).toEqual([{ at: 0, count: 1, move: 0 }]);
    expect(joins.fighter[0]).toEqual({ at: 0, count: 1, move: 0 });
    expect(joins.fighter[1]).toMatchObject({ count: 2, move: 1 });
    expect(joins.fighter[1].at).toBeGreaterThan(0.2);
    expect(joins.fighter[1].at).toBeLessThan(0.8);
    expect(joins.infantry[0].move).toBe(2);
  });

  test('what was entered flies, whether or not it stands at the source; a stagger stands between routes', () => {
    const e = entry([
      { from: HOME, units: { carrier: 5 } }, { from: '0,0', units: { dreadnought: 1 } }, { from: WAY, units: { cruiser: 1 } },
    ]);
    const all = shapes(e);
    const routes = routesOf(e, from => all[sourcesOf(game(), pack, e).indexOf(from)]);
    expect(routes).toHaveLength(3);
    expect(routes[0].stacks[0].joins[0].count).toBe(5);
    expect(routes.map(r => r.delayMs)).toEqual([0, 60, 120]);
  });

  test('what flies has left its tile; a pickup leaves when passed; the token of the action stands', () => {
    const state = stateInFlight(pack, entry(ROUTE), before(), []);
    expect(state.systems[HOME]).toEqual({ carrier: 1 });
    expect(state.systems[WAY]).toEqual({ fighter: 2, cruiser: 1 });
    expect(state.ground.quann).toEqual({ infantry: 1 });
    expect(state.systems[TARGET]).toBeUndefined();
    expect(state.tokensOnMap).toContain(TARGET);
    const later = stateInFlight(pack, entry(ROUTE), before(), [1, 2]);
    expect(later.systems[WAY]).toEqual({ cruiser: 1 });
    expect(later.ground.quann).toEqual({});
    expect(stateInFlight(pack, entry(ROUTE, { free: true }), before(), []).tokensOnMap).not.toContain(TARGET);
  });
});

test('a flight has something to show with a destination and units entered, standing at the source or not', () => {
  const body = (from: string, systemId: string | null, units: Move['units'] = { carrier: 1 }) => ({ id: 'f', phase: 'action', status: 'planned', type: 'tactical', systemId, moves: [{ from, units }], landings: [], production: {}, payment: { planets: [], tradeGoods: 0 } }) as unknown as TacticalEntry;
  expect(flies(body(HOME, TARGET))).toBe(true);
  expect(flies(body(WAY, TARGET))).toBe(true);
  expect(flies(body(HOME, TARGET, {}))).toBe(false);
  expect(flies(body(HOME, null))).toBe(false);
});

test('the systems an entry touches, for the camera', () => {
  const add = (body: object) => body as Entry;
  expect(entrySystems(game(), pack, add({ ...entry(ROUTE) })).sort()).toEqual([HOME, TARGET, WAY].sort());
  expect(entrySystems(game(), pack, add({ id: 'c', phase: 'action', status: 'planned', type: 'component', note: '' }))).toEqual([]);
  expect(entrySystems(game(), pack, add({ id: 's', phase: 'action', status: 'planned', type: 'strategic', effects: { systemId: WAY } }))).toEqual([WAY]);
  expect(entrySystems(game(), pack, add({ id: 'a', phase: 'action', status: 'planned', type: 'adjustment', label: '', delta: { units: { systemId: HOME, units: {} } } }))).toEqual([HOME]);
});

describe('the sources of an action with nothing chosen', () => {
  test('a route alone is an empty source, whether or not ships stand there', () => {
    expect(emptySources(game(), pack, entry([{ from: HOME, units: {} }, { from: WAY, units: {}, via: [HOME] }]))).toEqual([HOME, WAY]);
  });

  test('a source that flies or only picks up on its way is not empty', () => {
    const moves: Move[] = [
      { from: HOME, units: { carrier: 1 } },
      { from: WAY, units: {}, via: [HOME] },
      { from: HOME, units: { fighter: 1 }, pickupOf: WAY },
      { from: '2,0', units: {} },
    ];
    expect(emptySources(game(), pack, entry(moves))).toEqual(['2,0']);
  });
});
