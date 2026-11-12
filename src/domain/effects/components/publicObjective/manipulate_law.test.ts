import { describe, expect, test } from 'vitest';
import type { Entry, Payment } from '../../../types';
import { adjust, bench, effect, endOf, expectNone, expectStanding, quote, statusTokens, warningsOf } from '../kit';
import { id } from './manipulate_law';

/**
 * The status entry that scores the objective and pays for it. `spend` is the field pass 2 adds to the status entry:
 * what the public objective scored this status phase costs, paid as a payment is (planets exhausted, trade goods).
 */
const scoring = (influence: Payment): Entry => ({ ...statusTokens(0, 0, 0), scored: [id], spend: { influence: { planets: influence.planets, tradeGoods: 0 }, tradeGoods: influence.tradeGoods } } as unknown as Entry);
/** I control h1 (1 influence), h2 (2), t1 (1) and t2 (3), and gain twelve trade goods in the action phase. */
const table = (status: Entry) =>
  ({ status, ...bench({ faction: 'sol', entries: [adjust({ tradeGoods: 12 }), status], game: { planetControl: { h1: 'me', h2: 'me', t1: 'me', t2: 'me' } } }) });

describe('publicObjective:manipulate_law Manipulate Galactic Law', () => {
  // "Spend 16 influence."
  // LRR 61.10: "To score such an objective, a player must pay the specified cost at the time indicated on the card."
  // Checks: h2 and t2 (5 influence) and eleven trade goods pay the 16: nothing is warned of, one trade good is left.
  // Why the count changes here: the objective is the cost; trade goods may be spent as influence (ruling 2).
  test('publicObjective:manipulate_law planets and trade goods pay the sixteen influence', () => {
    const t = table(scoring({ planets: ['h2', 't2'], tradeGoods: 11 }));
    quote(t.pack, id, 'Spend 16 influence.');
    expectNone(warningsOf(t, t.status), 'shortInfluence');
    expect(endOf(t).tradeGoods).toBe(1);
    expect(endOf(t).holdings.scored).toContain(id);
  });

  // LRR 61.10, as above.
  // Checks: h1 and t1 (2 influence) and twelve trade goods are 14: the shortage is warned of on the status entry.
  // Why the check is NOT redundant here: 14 is less than the 16 the card asks; the planets' resources do not count.
  test('publicObjective:manipulate_law fourteen influence are short of sixteen', () => {
    const t = table(scoring({ planets: ['h1', 't1'], tradeGoods: 12 }));
    expectStanding(warningsOf(t, t.status), 'shortInfluence');
    expect(warningsOf(t, t.status).find(w => w.code === 'shortInfluence')).toMatchObject({ params: { needed: 16, paid: 14 }, step: 'status' });
  });

  // Checks: a status entry that scores nothing takes no trade goods even with a payment written.
  // Why the count does NOT change here: no objective is scored, so no cost is paid.
  test('publicObjective:manipulate_law not scored, nothing is paid', () => {
    const t = table({ ...statusTokens(0, 0, 0), scored: [] } as Entry);
    expect(endOf(t).tradeGoods).toBe(12);
  });

  // Checks: the objective is played by the status entry that scores it.
  test('publicObjective:manipulate_law is a play effect', () => {
    expect(effect(table(scoring({ planets: [], tradeGoods: 0 })).pack, id).tier).toBe('play');
  });
});
