/**
 * The context of the points of the count that components needed to know more for (pass 2, wave 3): the system and the
 * holdings of `productionCost`, the wormholes of `spaceProduction`, the dock of `planetResources`, the entry of
 * `researchCost`, and the one `appliedFor` that skips a note of the player's own and asks for a ready component.
 * A throwaway effect is put in the registry of the test's own pack, as in `production.test.ts`.
 */
import { describe, expect, test } from 'vitest';
import { applyPayment } from '../../replay/payment';
import { adjust, bench, HOME, NEAR, tactical, TARGET, using, FAR, FARTHER, type Bench } from '../components/kit';
import { appliedFor } from '../entryApply';
import { effectsOf, holderOf } from '../registry';
import type { ComponentEffect, ModifierContext } from '../types';
import { forecast } from '../../rules/kit';

const give = (table: Bench, id: string, effect: Partial<ComponentEffect>): void => {
  (effectsOf(table.pack) as Map<string, ComponentEffect>).set(id, { tier: 'passive', rule: 'test', ...effect });
};
const TECH = 'technology:aida';
const MAP = { [HOME]: 'r-home', [NEAR]: 'r-alpha', [TARGET]: 'r-target', [FAR]: 'r-empty', [FARTHER]: 'r-empty' };

describe('productionCost and spaceProduction know the system', () => {
  test('productionCost is asked with the system the entry produces in, its wormholes and what the owner holds', () => {
    const seen: ModifierContext['productionCost'][] = [];
    const entry = tactical(NEAR, { production: { destroyer: 1 } });
    const table = bench({ faction: 'sol', start: { technologies: [TECH, 'technology:dd2'] }, units: { [NEAR]: { cruiser: 1 } }, entries: [entry], game: { map: MAP } });
    give(table, TECH, { modify: { productionCost: (v, ctx) => { seen.push(ctx); return v; }, spaceProduction: (v, ctx) => v + ctx.wormholes.length } });
    forecast(table.game, table.pack);
    expect(seen.length).toBeGreaterThan(0);
    expect(seen[0]).toMatchObject({ faction: 'sol', systemId: NEAR, wormholes: ['alpha'] });
    expect(seen[0].holdings.technologies).toContain('technology:dd2');
  });
});

describe('planetResources knows the dock', () => {
  test('a modifier sees dock only on a planet with the player\'s space dock', () => {
    const table = bench({ faction: 'sol', start: { technologies: [TECH] }, game: { docks: ['h1'], planetControl: { h1: 'me', h2: 'me' } } });
    give(table, TECH, { modify: { planetResources: (v, ctx) => (ctx.dock ? v + 2 : v) } });
    const state = forecast(table.game, table.pack).state;
    const view = { faction: 'sol' };
    expect(applyPayment({ ...state, exhausted: [] }, { planets: ['h1'], tradeGoods: 0 }, 'resources', table.pack, view)).toBe(3 + 2);
    expect(applyPayment({ ...state, exhausted: [] }, { planets: ['h2'], tradeGoods: 0 }, 'resources', table.pack, view)).toBe(1);
  });
});

describe('the one appliedFor', () => {
  const NOTE = 'promissory:ce';
  const point = (table: Bench, entry: ReturnType<typeof using>, state?: Parameters<typeof appliedFor>[6]) => {
    give(table, NOTE, { tier: 'play', modify: { tokensGained: v => v + 1 } });
    const end = forecast(table.game, table.pack).state;
    return appliedFor(table.pack, holderOf(table.game, end), entry, 'tokensGained', 2, { step: 'status' }, state).value;
  };

  test('a note of another player counts, a note of the entry owner\'s own does not (69.2)', () => {
    const table = bench({ faction: 'l1z1x', expansions: ['pok'], entries: [] });
    expect(point(table, using(adjust({}, 'strategy'), `${NOTE}@o1`))).toBe(3);
    expect(point(table, using(adjust({}, 'strategy'), `${NOTE}@me`))).toBe(2);
  });

  test('with the owner\'s board, a component counts only while held ready', () => {
    const table = bench({ faction: 'l1z1x', expansions: ['pok'], entries: [] });
    const board = forecast(table.game, table.pack).state;
    const entry = using(adjust({}, 'strategy'), `${NOTE}@o1`);
    expect(point(table, entry, { ...board, holdings: { ...board.holdings, promissory: [] } })).toBe(2);
    expect(point(table, entry, { ...board, holdings: { ...board.holdings, promissory: [`${NOTE}@o1`] } })).toBe(3);
  });
});
