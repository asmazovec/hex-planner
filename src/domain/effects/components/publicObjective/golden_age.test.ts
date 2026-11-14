import { describe, expect, test } from 'vitest';
import type { Payment } from '../../../types';
import type { Entry } from '../../../../testing/old/domain/types';
import { adjust, bench, effect, endOf, expectNone, expectStanding, HOME, quote, statusTokens, tactical, warningsOf } from '../kit';
import { id } from './golden_age';

/**
 * The status entry that scores the objective and pays for it. `spend` is the field pass 2 adds to the status entry:
 * what the public objective scored this status phase costs, paid as a payment is (planets exhausted, trade goods).
 */
const scoring = (resources: Payment): Entry => ({ ...statusTokens(0, 0, 0), scored: [id], spend: { resources: { planets: resources.planets, tradeGoods: 0 }, tradeGoods: resources.tradeGoods } } as unknown as Entry);
/** I control h1 (3 resources), h2 (1), t1 (2) and t2 (1), and gain twelve trade goods in the action phase. */
const table = (status: Entry, before: Entry[] = []) =>
  ({ status, ...bench({ faction: 'sol', entries: [adjust({ tradeGoods: 12 }), ...before, status], game: { planetControl: { h1: 'me', h2: 'me', t1: 'me', t2: 'me' }, docks: ['h1'] } }) });

describe('publicObjective:golden_age Found a Golden Age', () => {
  // "Spend 16 resources."
  // LRR 61.10: "To score such an objective, a player must pay the specified cost at the time indicated on the card."
  // Checks: h1 and t1 (5 resources) and eleven trade goods pay the 16: nothing is warned of, one trade good is left.
  // Why the count changes here: the objective is the cost; trade goods may be spent as resources (ruling 2).
  test('publicObjective:golden_age planets and trade goods pay the sixteen resources', () => {
    const t = table(scoring({ planets: ['h1', 't1'], tradeGoods: 11 }));
    quote(t.pack, id, 'Spend 16 resources.');
    expectNone(warningsOf(t, t.status), 'shortResources');
    expect(endOf(t).tradeGoods).toBe(1);
    expect(endOf(t).holdings.scored).toContain(id);
  });

  // LRR 61.10, as above.
  // Checks: h1 and ten trade goods are 13 resources: the shortage is warned of on the status entry; the objective is
  // scored all the same.
  // Why the check is NOT redundant here: 13 is less than the 16 the card asks.
  test('publicObjective:golden_age thirteen resources are short of sixteen', () => {
    const t = table(scoring({ planets: ['h1'], tradeGoods: 10 }));
    expectStanding(warningsOf(t, t.status), 'shortResources');
    expect(warningsOf(t, t.status).find(w => w.code === 'shortResources')).toMatchObject({ params: { needed: 16, paid: 13 }, step: 'status' });
  });

  // The objective's ruling 1: "Any resources that were spent during the action phase will have no effect."
  // Checks: h1 exhausted by a production in the action phase cannot pay again in the status phase: the planet is warned
  // of as exhausted, and its resources do not count toward the 16.
  // Why the check is NOT redundant here: planets are readied only after the objectives are scored (81.6 comes after 81.1).
  test('publicObjective:golden_age a planet exhausted in the action phase does not pay', () => {
    const build = tactical(HOME, { production: { infantry: 2 }, payment: { planets: ['h1'], tradeGoods: 0 } });
    const t = table(scoring({ planets: ['h1', 't1'], tradeGoods: 11 }), [build]);
    expectStanding(warningsOf(t, t.status), 'planetExhausted');
    expect(warningsOf(t, t.status).find(w => w.code === 'shortResources')?.params).toMatchObject({ needed: 16, paid: 13 });
  });

  // Checks: the objective is played by the status entry that scores it.
  test('publicObjective:golden_age is a play effect', () => {
    expect(effect(table(scoring({ planets: [], tradeGoods: 0 })).pack, id).tier).toBe('play');
  });
});
