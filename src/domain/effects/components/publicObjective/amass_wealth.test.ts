import { describe, expect, test } from 'vitest';
import type { Entry, Payment } from '../../../types';
import { adjust, bench, effect, endOf, expectNone, expectStanding, quote, statusTokens, warningsOf } from '../kit';
import { id } from './amass_wealth';

/**
 * The status entry that scores the objective and pays for it. `spend` is the field pass 2 adds to the status entry:
 * what the public objective scored this status phase costs, each part paid as a payment is.
 */
const scoring = (resources: Payment, influence: Payment, tradeGoods: number): Entry =>
  ({ ...statusTokens(0, 0, 0), scored: [id], spend: { resources, influence, tradeGoods } } as unknown as Entry);
/** I control h1 (3/1), h2 (1/2), t1 (2/1) and t2 (1/3), and gain twelve trade goods in the action phase. */
const table = (status: Entry) =>
  ({ status, ...bench({ faction: 'sol', expansions: ['pok'], entries: [adjust({ tradeGoods: 12 }), status], game: { planetControl: { h1: 'me', h2: 'me', t1: 'me', t2: 'me' } } }) });

describe('publicObjective:amass_wealth Amass Wealth', () => {
  // "Spend 3 influence, 3 resources, and 3 trade goods."
  // LRR 61.10: "To score such an objective, a player must pay the specified cost at the time indicated on the card."
  // Checks: h1 pays 3 resources, t2 pays 3 influence, and three trade goods are spent: nothing is warned of, nine
  // trade goods are left.
  // Why the count changes here: the objective is the cost, in three parts.
  test.fails('publicObjective:amass_wealth each of the three parts is paid', () => {
    const t = table(scoring({ planets: ['h1'], tradeGoods: 0 }, { planets: ['t2'], tradeGoods: 0 }, 3));
    quote(t.pack, id, 'Spend 3 influence, 3 resources, and 3 trade goods.');
    for (const code of ['shortResources', 'shortInfluence', 'shortTradeGoods', 'planetExhausted'] as const) expectNone(warningsOf(t, t.status), code);
    expect(endOf(t).tradeGoods).toBe(9);
    expect(endOf(t).holdings.scored).toContain(id);
  });

  // The objective's ruling 2: "A planet may be exhausted to spend either its resource or influence value, but not both."
  // Checks: h1 named for the resources and again for the influence is warned of as exhausted, and pays only once.
  // Why the check is NOT redundant here: one planet gives one of its values.
  test.fails('publicObjective:amass_wealth a planet pays its resources or its influence, not both', () => {
    const t = table(scoring({ planets: ['h1'], tradeGoods: 0 }, { planets: ['h1', 'h2'], tradeGoods: 0 }, 3));
    expectStanding(warningsOf(t, t.status), 'planetExhausted');
    expect(warningsOf(t, t.status).find(w => w.code === 'shortInfluence')?.params).toMatchObject({ needed: 3, paid: 2 });
  });

  // LRR 61.10, as above.
  // Checks: h2 alone (1 resource) for the resources part is short, and the shortage is warned of on the status entry.
  // Why the check is NOT redundant here: each part is a cost of its own; the influence paid beyond 3 does not make up
  // for missing resources.
  test.fails('publicObjective:amass_wealth one part short is warned of', () => {
    const t = table(scoring({ planets: ['h2'], tradeGoods: 0 }, { planets: ['t2', 'h1'], tradeGoods: 0 }, 3));
    expectStanding(warningsOf(t, t.status), 'shortResources');
    expect(warningsOf(t, t.status).find(w => w.code === 'shortResources')).toMatchObject({ params: { needed: 3, paid: 1 }, step: 'status' });
  });

  // Checks: the objective is played by the status entry that scores it.
  test.fails('publicObjective:amass_wealth is a play effect', () => {
    expect(effect(table(scoring({ planets: [], tradeGoods: 0 }, { planets: [], tradeGoods: 0 }, 0)).pack, id).tier).toBe('play');
  });
});
