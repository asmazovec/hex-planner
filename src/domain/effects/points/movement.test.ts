/**
 * The points and hooks the movement subsystem adds for the components (docs/phase4/infra/movement.md), tried with
 * throwaway effects put in the registry of a bench's own pack: no component file is involved.
 */
import { describe, expect, test } from 'vitest';
import { fleetCount, checkSystem } from '../../replay/transport';
import { adjacentTo, fleetSpeed, joined, linksOf, routeDistances, routeReach, shipSpeed, wormholesOf, type MoveView } from '../../movement';
import type { GameState } from '../../types';
import { bench, endOf, FAR, FARTHER, HOME, NEAR, TARGET, tactical, using, warningsOf, type Bench } from '../components/kit';
import { tech } from '../../rules/kit';
import { effectsOf } from '../registry';
import type { Ability } from '../types';
import './movement';

/** The technology of the effect: held from the start, its effect replaced in this bench's registry. */
const TECH = 'technology:gd';
const give = (table: Bench, effect: Partial<Ability>, id = TECH): void => {
  (effectsOf(table.pack) as Map<string, Ability>).set(id, { tier: 'passive', rule: 'test', ...effect });
};
const MAP = { [HOME]: 'r-home', [NEAR]: 'r-empty', [TARGET]: 'r-target', [FAR]: 'r-empty', [FARTHER]: 'r-empty' };
const sol = (extra: Partial<Parameters<typeof bench>[0]> = {}) =>
  bench({ faction: 'sol', start: { technologies: [TECH] }, game: { map: MAP }, ...extra });

const flight = (units: Record<string, number>, via: string[], target: string, from = HOME) =>
  tactical(target, { moves: [{ from, units, via }] });
const codes = (table: Bench, move: ReturnType<typeof flight>) => warningsOf(table, move).map(w => w.code);

describe('speed: the context of a route', () => {
  test('the start, the active system, the group and the board come with the speed of every ship of a move', () => {
    const seen: unknown[] = [];
    const move = flight({ carrier: 1, dreadnought: 1 }, [NEAR], TARGET);
    const table = sol({ units: { [HOME]: { carrier: 1, dreadnought: 1 } }, entries: [move] });
    give(table, { modify: { speed: (value, ctx) => { seen.push(ctx); return value; } } });
    warningsOf(table, move);
    expect(seen.length).toBeGreaterThan(0);
    expect(seen[0]).toMatchObject({ faction: 'sol', from: HOME, systemId: TARGET, group: { carrier: 1, dreadnought: 1 }, pack: table.pack });
    // What the move reads of the board comes as `at`: the map the kernel holds, where the mover's home lies.
    expect((seen[0] as { at: { map: unknown; home: unknown } }).at).toMatchObject({ map: { map: table.game.map }, home: HOME });
  });

  test('a speed asked for a display only carries no start: the old context still works', () => {
    const table = sol();
    expect(shipSpeed(table.game, 'carrier', { ...endOf(table).holdings }, table.pack)).toBe(1);
  });

  test('the speed of a group is that of its fastest ship, with the view passed along', () => {
    const table = sol();
    const view: MoveView = { from: HOME };
    expect(fleetSpeed(table.game, { carrier: 1, destroyer: 1 }, endOf(table).holdings, table.pack, view)).toBe(2);
  });
});

describe('modifyWhenNamed: a play or hint effect changes the move for the entry that names it', () => {
  const FLANK = 'actionCard:fs1';
  const plus = (value: number): number => (value > 0 ? value + 1 : value);
  const table = (named: number, long = false) => {
    const move = long ? flight({ cruiser: 1 }, [NEAR, TARGET, FAR], FARTHER) : flight({ cruiser: 1 }, [NEAR, TARGET], FAR);
    let entry = move;
    for (let i = 0; i < named; i += 1) entry = using(entry, FLANK);
    const t = sol({ units: { [HOME]: { cruiser: 1 } }, entries: [entry] });
    give(t, { tier: 'hint', modifyWhenNamed: { speed: plus } }, FLANK);
    return { t, entry };
  };

  test('the entry that names the component gets the change', () => {
    const { t, entry } = table(1);
    expect(codes(t, entry)).not.toContain('speedShort');
  });

  test('the same component named twice changes the move once', () => {
    const { t, entry } = table(2, true);
    const short = warningsOf(t, entry).find(w => w.code === 'speedShort');
    expect(short?.params).toMatchObject({ move: 3, steps: 4 });
  });

  test('an entry that does not name it keeps the printed move', () => {
    const { t, entry } = table(0, true);
    expect(warningsOf(t, entry).find(w => w.code === 'speedShort')?.params).toMatchObject({ move: 2, steps: 4 });
  });
});

describe('nebulaStart: the move value of a ship that starts in a nebula', () => {
  const nebula = { ...MAP, [NEAR]: 'r-nebula' };
  const flightFromNebula = () => flight({ cruiser: 1 }, [TARGET], FAR, NEAR);
  const table = (lift: boolean) => {
    const move = flightFromNebula();
    const t = sol({ units: { [NEAR]: { cruiser: 1 } }, entries: [move], game: { map: nebula } });
    if (lift) give(t, { modify: { nebulaStart: (_value, ctx) => ctx.speed } });
    return { t, move };
  };

  test('59.2 without a component the ship starts with 1', () => {
    const { t, move } = table(false);
    expect(warningsOf(t, move).find(w => w.code === 'speedShort')?.params).toMatchObject({ move: 1, steps: 2 });
  });

  test('a component of the mover can give the ship its own value, and the warning then names it', () => {
    const { t, move } = table(true);
    expect(codes(t, move)).not.toContain('speedShort');
  });
});

describe('gravityRift: a system that is a rift for the mover', () => {
  test('41.1 a component that makes the start system a rift gives its 1', () => {
    const move = flight({ carrier: 1 }, [NEAR], TARGET);
    const plain = sol({ units: { [HOME]: { carrier: 1 } }, entries: [move] });
    expect(codes(plain, move)).toContain('speedShort');
    const rift = sol({ units: { [HOME]: { carrier: 1 } }, entries: [move] });
    give(rift, { modify: { gravityRift: (value, ctx) => (ctx.systemId === HOME ? 1 : value) } });
    expect(codes(rift, move)).not.toContain('speedShort');
  });
});

describe('links: adjacency beyond the board', () => {
  test('a component in force joins two systems: the distance is one step, the reach includes it', () => {
    const table = sol({ units: { [HOME]: { carrier: 1 } } });
    give(table, { links: () => [[HOME, FARTHER]] });
    const state = endOf(table);
    const links = linksOf(table.game, table.pack, { state, during: 'tactical' });
    expect(links).toEqual([[HOME, FARTHER]]);
    expect(routeDistances(table.game, HOME, table.pack).get(FARTHER)).toBe(4);
    expect(routeDistances(table.game, HOME, table.pack, links).get(FARTHER)).toBe(1);
    expect(joined(table.game, FARTHER, HOME, table.pack, links)).toBe(true);
    expect(adjacentTo(table.game, HOME, table.pack, links).sort()).toEqual([NEAR, FARTHER].sort());
    const reach = routeReach(table.game, [HOME], 1, TARGET, table.pack, new Set(), { links });
    expect(reach.has(FARTHER)).toBe(true);
  });

  test('a component the entry names joins systems for it; one that is merely held back is not asked when it has no links', () => {
    const table = sol({});
    give(table, { tier: 'play', links: () => [[NEAR, FAR]] }, 'actionCard:lost_star');
    const state = endOf(table);
    expect(linksOf(table.game, table.pack, { state, during: 'tactical' })).toEqual([]);
    expect(linksOf(table.game, table.pack, { state, named: ['actionCard:lost_star'], during: 'tactical' })).toEqual([[NEAR, FAR]]);
  });

  test('6.1 a wormhole token joins its system to every system with a matching wormhole', () => {
    const table = sol({ game: { map: { ...MAP, [FARTHER]: 'r-alpha' } } });
    const state: GameState = { ...endOf(table), wormholeTokens: { alpha: HOME } };
    const links = linksOf(table.game, table.pack, { state, during: 'tactical' });
    expect(links).toEqual([[HOME, FARTHER]]);
    expect(wormholesOf(table.game, table.pack, HOME, state.wormholeTokens)).toEqual(['alpha']);
    expect(wormholesOf(table.game, table.pack, HOME)).toEqual([]);
    expect(joined(table.game, HOME, FARTHER, table.pack, links)).toBe(true);
  });
});

describe('dockFighters and excessFighters: the transport counts', () => {
  const docked = (extra: Partial<Parameters<typeof bench>[0]> = {}) =>
    sol({ units: { [HOME]: { fighter: 5 } }, game: { map: MAP, docks: ['h1'], start: { me: { technologies: [TECH] }, opponents: {} } }, ...extra });

  test('79.2 a space dock keeps 3 fighters; the rest is load', () => {
    const table = docked();
    expect(checkSystem(table.game, endOf(table), HOME, table.pack).find(w => w.code === 'capacitySystem')?.params).toMatchObject({ load: 2 });
  });

  test('a component of the player raises what a dock keeps', () => {
    const table = docked();
    give(table, { modify: { dockFighters: (value, ctx) => (ctx.planetId === 'h1' ? value + 9 : value) } });
    expect(checkSystem(table.game, endOf(table), HOME, table.pack).map(w => w.code)).not.toContain('capacitySystem');
  });

  test('the excess flying fighters counted against the fleet pool pass through a point', () => {
    const upgrade = { technologies: [TECH, tech('fighter')] };
    const table = bench({ faction: 'sol', start: upgrade, units: { [HOME]: { cruiser: 1, fighter: 6 } }, game: { map: MAP } });
    const holdings = endOf(table).holdings;
    const whole = fleetCount(table.game, { cruiser: 1, fighter: 6 }, holdings, table.pack);
    give(table, { modify: { excessFighters: value => value / 2 } });
    const half = fleetCount(table.game, { cruiser: 1, fighter: 6 }, holdings, table.pack);
    expect(whole).toBeGreaterThan(half);
    expect(whole - half).toBe(Math.floor((whole - 1) / 2));
  });
});
