/**
 * The helpers of the component files for movement (helpers/movement.ts): what a `modify` of `speed` and the `when` of
 * a waiver can ask. Each is tried with a throwaway effect in the registry of a bench's own pack.
 */
import { describe, expect, test } from 'vitest';
import { adjacentTo } from '../../movement';
import type { Entry } from '../../types';
import { bench, endOf, FAR, FARTHER, HOME, NEAR, TARGET, tactical, warningsOf, type Bench } from '../components/kit';
import { effectsOf } from '../registry';
import type { PermitContext } from '../../../game/abilities/types';
import type { Ability } from '../types';
import { activeNextToAnomaly, fastestOfGroup, playerHolds, plusSpeed, shipSlots, shortfall, startWormholes, startsAtHome, startsInFracture } from './movement';

const TECH = 'technology:gd';
const give = (table: Bench, effect: Partial<Ability>): void => {
  (effectsOf(table.pack) as Map<string, Ability>).set(TECH, { tier: 'passive', rule: 'test', ...effect });
};
const MAP = { [HOME]: 'r-home', [NEAR]: 'r-empty', [TARGET]: 'r-target', [FAR]: 'r-empty', [FARTHER]: 'r-empty' };
const sol = (extra: Partial<Parameters<typeof bench>[0]> = {}) =>
  bench({ faction: 'sol', start: { technologies: [TECH] }, game: { map: MAP }, ...extra });
const O1 = { id: 'o1', faction: 'naalu', vp: 0, seat: 2, color: 2 };
const flight = (units: Record<string, number>, via: string[], target: string, from = HOME): Entry =>
  tactical(target, { moves: [{ from, units, via }] });
const waived = (table: Bench, entry: Entry, code: string): boolean[] => warningsOf(table, entry).filter(w => w.code === code).map(w => (w.waivedBy?.length ?? 0) > 0);
const lifting = (code: string, when: (w: import('../../types').Warning, ctx: PermitContext) => boolean): Partial<Ability> =>
  ({ permit: [{ code: code as never, rule: 'test', when }] });

describe('plusSpeed', () => {
  test('adds to a ship and leaves a unit that does not move as it is', () => {
    expect(plusSpeed(1)(2)).toBe(3);
    expect(plusSpeed(1)(0)).toBe(0);
  });
});

describe('the start and the group of a move', () => {
  test('fastestOfGroup: a slow ship takes the move of the fastest companion', () => {
    const move = flight({ carrier: 1, destroyer: 1 }, [NEAR], TARGET);
    const table = sol({ units: { [HOME]: { carrier: 1, destroyer: 1 } }, entries: [move] });
    expect(warningsOf(table, move).map(w => w.code)).toContain('speedShort');
    give(table, { modify: { speed: (value, ctx) => (value > 0 ? Math.max(value, fastestOfGroup(ctx)) : value) } });
    expect(warningsOf(table, move).map(w => w.code)).not.toContain('speedShort');
  });

  test('startsAtHome and startWormholes tell where the ship begins', () => {
    const seen: Record<string, unknown>[] = [];
    const move = flight({ carrier: 1 }, [TARGET], FAR, NEAR);
    const table = sol({ units: { [NEAR]: { carrier: 1 } }, entries: [move], game: { map: { ...MAP, [NEAR]: 'r-alpha' } } });
    give(table, { modify: { speed: (value, ctx) => { seen.push({ home: startsAtHome(ctx), wormholes: startWormholes(ctx), fracture: startsInFracture(ctx) }); return plusSpeed(1)(value); } } });
    expect(warningsOf(table, move).map(w => w.code)).not.toContain('speedShort');
    expect(seen[0]).toEqual({ home: false, wormholes: ['alpha'], fracture: false });
    const home = flight({ carrier: 1 }, [NEAR], TARGET);
    const there = sol({ units: { [HOME]: { carrier: 1 } }, entries: [home] });
    const seenHome: unknown[] = [];
    give(there, { modify: { speed: (value, ctx) => { seenHome.push(startsAtHome(ctx)); return value; } } });
    warningsOf(there, home);
    expect(seenHome[0]).toBe(true);
  });

  test('activeNextToAnomaly: the active system beside a nebula, not the system itself', () => {
    const through = flight({ carrier: 1 }, [NEAR], TARGET);
    const table = sol({ units: { [HOME]: { carrier: 1 } }, entries: [through], game: { map: { ...MAP, [FAR]: 'r-nebula' } } });
    give(table, { modify: { speed: (value, ctx) => (activeNextToAnomaly(ctx) ? plusSpeed(1)(value) : value) } });
    expect(warningsOf(table, through).map(w => w.code)).not.toContain('speedShort');
    const away = sol({ units: { [HOME]: { carrier: 1 } }, entries: [through] });
    give(away, { modify: { speed: (value, ctx) => (activeNextToAnomaly(ctx) ? plusSpeed(1)(value) : value) } });
    expect(warningsOf(away, through).map(w => w.code)).toContain('speedShort');
  });
});

describe('what a route warning is about', () => {
  const kinds = (map: Record<string, string>, game: Parameters<typeof bench>[0]['game'] = {}): (string | undefined)[] => {
    const move = flight({ cruiser: 1 }, [NEAR], TARGET);
    const table = sol({ units: { [HOME]: { cruiser: 1 } }, entries: [move], game: { map, ...game } });
    const found: (string | undefined)[] = [];
    give(table, lifting('routeBlocked', (w, ctx) => { found.push(ctx.routeBlockKind(w)); return false; }));
    warningsOf(table, move);
    return found;
  };

  test('an asteroid field, a nebula and a supernova on the way', () => {
    expect(kinds({ ...MAP, [NEAR]: 'r-asteroid' })).toEqual(['asteroid']);
    expect(kinds({ ...MAP, [NEAR]: 'r-nebula' })).toEqual(['nebula']);
    expect(kinds({ ...MAP, [NEAR]: 'r-supernova' })).toEqual(['supernova']);
  });

  test('another player\'s ships on the way, and an anomaly before them', () => {
    const rival = { opponents: [O1], enemyUnits: { [NEAR]: { o1: { cruiser: 1 } } } };
    expect(kinds(MAP, rival)).toEqual(['ships']);
    expect(kinds({ ...MAP, [NEAR]: 'r-nebula' }, rival)).toEqual(['nebula']);
  });

  test('a hyperlane as the active system', () => {
    const move = flight({ cruiser: 1 }, [], NEAR);
    const table = sol({ units: { [HOME]: { cruiser: 1 } }, entries: [move], game: { map: { ...MAP, [NEAR]: 'r-lane' } } });
    const found: (string | undefined)[] = [];
    give(table, lifting('routeBlocked', (w, ctx) => { found.push(ctx.routeBlockKind(w)); return true; }));
    expect(waived(table, move, 'routeBlocked')).toEqual([true]);
    expect(found).toEqual(['hyperlane']);
  });
});

describe('oneShipShort', () => {
  const table = (units: Record<string, number>) => {
    const move = flight(units, [NEAR], TARGET);
    const t = sol({ units: { [HOME]: units }, entries: [move] });
    give(t, lifting('speedShort', (w, ctx) => ctx.oneShipShort(w)));
    return { t, move };
  };

  test('with a carrier and a dreadnought both a step short, the first is covered and the second stands', () => {
    const { t, move } = table({ carrier: 1, dreadnought: 1 });
    expect(warningsOf(t, move).filter(w => w.code === 'speedShort').map(shortfall)).toEqual([1, 1]);
    expect(waived(t, move, 'speedShort')).toEqual([true, false]);
  });

  test('two ships of one type short by a step are two ships, so none is covered', () => {
    const { t, move } = table({ carrier: 2 });
    expect(waived(t, move, 'speedShort')).toEqual([false]);
  });

  test('a shortfall of two steps is more than the component covers', () => {
    const move = flight({ carrier: 1 }, [NEAR, TARGET], FAR);
    const t = sol({ units: { [HOME]: { carrier: 1 } }, entries: [move] });
    give(t, lifting('speedShort', (w, ctx) => ctx.oneShipShort(w)));
    expect(waived(t, move, 'speedShort')).toEqual([false]);
  });
});

describe('the route of a warning', () => {
  const asked = (map: Record<string, string>, units: Record<string, number>, ask: (w: import('../../types').Warning, ctx: PermitContext) => unknown, game: Parameters<typeof bench>[0]['game'] = {}, via = [NEAR], target = TARGET) => {
    const move = flight(units, via, target);
    const t = sol({ units: { [HOME]: units }, entries: [move], game: { map, ...game } });
    const seen: unknown[] = [];
    give(t, lifting('speedShort', (w, ctx) => { seen.push(ask(w, ctx)); return false; }));
    warningsOf(t, move);
    return seen;
  };

  test('crossesRift: whether a gravity rift is left on the way', () => {
    const rift = { ...MAP, [NEAR]: 'r-rift' };
    expect(asked(rift, { carrier: 1 }, (w, ctx) => ctx.crossesRift(w), {}, [NEAR, TARGET], FAR)).toEqual([true]);
    expect(asked(MAP, { carrier: 1 }, (w, ctx) => ctx.crossesRift(w), {}, [NEAR, TARGET], FAR)).toEqual([false]);
  });

  test('speedWithoutAnomalies is the printed value, apart from a nebula start or a rift', () => {
    expect(asked({ ...MAP, [HOME]: 'r-nebula' }, { cruiser: 1 }, (w, ctx) => ctx.speedWithoutAnomalies(w), {}, [NEAR, TARGET], FAR)).toEqual([2]);
  });

  test('onlyUnits and shipsOnly: what the move carried', () => {
    expect(asked(MAP, { carrier: 1, cruiser: 1 }, (w, ctx) => [ctx.onlyUnits(w, ['carrier']), ctx.onlyUnits(w, ['carrier', 'cruiser']), ctx.shipsOnly(w)])[0]).toEqual([false, true, true]);
    expect(asked(MAP, { carrier: 1, infantry: 2, fighter: 1 }, (w, ctx) => ctx.shipsOnly(w))[0]).toBe(false);
  });

  test('othersShipsIn: other players\' ships, fighters and ground forces left out', () => {
    const rival = { opponents: [O1], enemyUnits: { [NEAR]: { o1: { cruiser: 2, fighter: 3, infantry: 1 } } } };
    expect(asked(MAP, { carrier: 1 }, (_w, ctx) => ctx.othersShipsIn(NEAR), rival)[0]).toEqual({ cruiser: 2 });
    expect(asked(MAP, { carrier: 1 }, (_w, ctx) => ctx.othersShipsIn(TARGET), rival)[0]).toEqual({});
  });
});

describe('the board of the others', () => {
  test('fastestOnBoard: every player\'s ships, mine included', () => {
    const seen: number[] = [];
    const move = flight({ carrier: 2 }, [NEAR], TARGET);
    const t = sol({ units: { [HOME]: { carrier: 2 } }, entries: [move], game: { opponents: [O1], enemyUnits: { [FARTHER]: { o1: { dreadnought: 1, cruiser: 1 } } } } });
    give(t, lifting('speedShort', (_w, ctx) => { seen.push(ctx.fastestOnBoard()); return false; }));
    warningsOf(t, move);
    expect(seen[0]).toBeGreaterThanOrEqual(2);
  });

  test('playerHolds: ships, ground forces and structures count, by the replayed state or by hand', () => {
    const t = sol({ units: { [HOME]: { carrier: 1 } }, game: { opponents: [O1], enemyUnits: { [FAR]: { o1: { cruiser: 1 } } }, enemyGround: { t1: { o1: { infantry: 1 } } } } });
    const state = endOf(t);
    expect(playerHolds(t.game, state, 'me', HOME, t.pack)).toBe(true);
    expect(playerHolds(t.game, state, 'me', NEAR, t.pack)).toBe(false);
    expect(playerHolds(t.game, state, 'o1', FAR, t.pack)).toBe(true);
    expect(playerHolds(t.game, state, 'o1', TARGET, t.pack)).toBe(true);
    expect(playerHolds(t.game, { ...state, docks: ['h1'] }, 'me', HOME, t.pack)).toBe(true);
    expect(shipSlots(state, t.pack)).toEqual([HOME]);
  });

  test('mecatolSlot finds tile 18 or 112, and playerNear asks the presence of another player in or next to it', () => {
    const game = { opponents: [O1], map: { ...MAP, [NEAR]: '18' } };
    const units = { carrier: 1 };
    const near = (ask: (ctx: PermitContext) => unknown): unknown => {
      const move = flight(units, [NEAR], TARGET);
      const t = sol({ units: { [HOME]: units }, entries: [move], game });
      const seen: unknown[] = [];
      give(t, lifting('speedShort', (_w, ctx) => { seen.push(ask(ctx)); return false; }));
      warningsOf(t, move);
      return seen[0];
    };
    expect(near(ctx => ctx.mecatolSlot())).toBe(NEAR);
    expect(near(ctx => ctx.playerNear('me', NEAR))).toBe(true);
    expect(near(ctx => ctx.playerNear('me', FARTHER))).toBe(false);
    const t = sol({ game });
    expect(adjacentTo(t.game, NEAR, t.pack).sort()).toEqual([HOME, TARGET].sort());
  });
});
