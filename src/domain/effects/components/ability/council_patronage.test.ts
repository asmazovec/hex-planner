import { describe, expect, test } from 'vitest';
import type { Entry, Opponent } from '../../../types';
import { adjust, bench, effect, endOf, expectNone, expectStanding, HOME, NEAR, planned, quote, warningsOf } from '../kit';
import { id } from './council_patronage';

const NEIGHBOUR: Opponent = { id: 'o1', faction: 'sol', vp: 0, seat: 2, color: 2 };

/** A turn of the action phase that only gives `commodities` to the neighbour o1, whose cruiser stands next to my carrier. */
const giving = (commodities: number): Entry =>
  planned({ type: 'pass', acts: [{ kind: 'transaction', with: 'o1', give: { commodities }, get: {} }] }, 'action');

const table = (faction: string, rounds: Entry[][]) => bench({
  faction, expansions: ['pok'], units: { [HOME]: { carrier: 1 } }, rounds,
  game: { opponents: [NEIGHBOUR], enemyUnits: { [NEAR]: { o1: { cruiser: 1 } } } },
});

describe('ability:council_patronage Council Patronage', () => {
  // "At the start of the strategy phase: Replenish your commodities, then gain 1 trade good."
  // Checks: after the strategy phase of round 1 the Keleres hold their full 2 commodities and 1 trade good.
  // Why the default count does not apply: by LRR 21.3 commodities are replenished only by an effect (Trade), and a
  // player begins with none (21 note 1); this ability is such an effect, every strategy phase, and adds a trade good.
  test('ability:council_patronage replenishes the commodities and gives 1 trade good at the start of the strategy phase', () => {
    const keleres = table('keleresm', [[adjust({}, 'strategy')]]);
    quote(keleres.pack, id, 'At the start of the strategy phase: Replenish your commodities, then gain 1 trade good.');
    const end = endOf(keleres);
    expect(end.commodities).toBe(2);
    expect(end.tradeGoods).toBe(1);
  });

  // LRR 21.3: commodities are replenished by the Trade strategy card or another game effect.
  // Checks: another faction with the same plan has no commodity and no trade good.
  // Why the check is NOT redundant here: the ability is the Keleres's own.
  test('ability:council_patronage is the Keleres\'s own: another faction starts the round with nothing', () => {
    const end = endOf(table('letnev', [[adjust({}, 'strategy')]]));
    expect(end.commodities).toBe(0);
    expect(end.tradeGoods).toBe(0);
  });

  // "... Replenish your commodities, then gain 1 trade good." Ruling (Keleres, Council Patronage 1): it is mandatory,
  //  every strategy phase; at full commodities the replenish gives none.
  // Checks: after two rounds the trade goods are 2 and the commodities stay at the faction's 2.
  // Why the number is right: the commodities stop at the faction's value (21.3); the trade good comes every round.
  test('ability:council_patronage gives its trade good every round, the commodities stopping at the faction\'s value', () => {
    const end = endOf(table('keleresm', [[adjust({}, 'strategy')], [adjust({}, 'strategy')]]));
    expect(end.commodities).toBe(2);
    expect(end.tradeGoods).toBe(2);
  });

  // LRR 94.2 and 21.5: commodities are traded in a transaction; one not held cannot be given.
  // Checks: in round 1, with no Trade played, the Keleres give their 2 commodities to a neighbour without a warning.
  // Why the check is redundant here: the commodities are there, replenished by the ability at the start of the round,
  // so the shortCommodities check finds nothing to warn of.
  test('ability:council_patronage lets the Keleres trade 2 commodities in round 1 without Trade', () => {
    const deal = giving(2);
    const keleres = table('keleresm', [[adjust({}, 'strategy'), deal]]);
    expectNone(warningsOf(keleres, deal), 'shortCommodities');
  });

  // Checks: another faction without Trade has no commodity to give, and is warned of.
  // Why the check is NOT redundant here: nothing replenished its commodities.
  test('ability:council_patronage another faction trading commodities it never replenished is warned of', () => {
    const deal = giving(2);
    expectStanding(warningsOf(table('letnev', [[adjust({}, 'strategy'), deal]]), deal), 'shortCommodities');
  });

  // Checks: a third commodity is beyond the Keleres's value of 2 and is warned of against the 2 held.
  // Why the check is NOT redundant here: the ability replenishes up to the faction's value, not beyond it.
  test('ability:council_patronage a third commodity is still warned of, against the two held', () => {
    const deal = giving(3);
    const warnings = warningsOf(table('keleresm', [[adjust({}, 'strategy'), deal]]), deal);
    expectStanding(warnings, 'shortCommodities');
    expect(warnings.find(w => w.code === 'shortCommodities')?.params).toMatchObject({ needed: 3, have: 2 });
  });

  test('ability:council_patronage is a passive effect that waives nothing', () => {
    const { pack } = table('keleresm', [[]]);
    expect(effect(pack, id).tier).toBe('passive');
    expect(effect(pack, id).waive).toBeUndefined();
  });
});
