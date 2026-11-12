import { describe, expect, test } from 'vitest';
import type { Entry } from '../../../types';
import { adjust, bench, effect, endOf, expectNone, expectStanding, quote, statusTokens, warningsOf } from '../kit';
import { id } from './vast_reserves';

/** The status entry of round 1, scoring the objective or not. */
const status = (scored: string[] = [id]): Entry => ({ ...statusTokens(0, 0, 0), scored } as Entry);
/** I hold `goods` trade goods when the status phase comes. */
const table = (goods: number, score: Entry) => bench({ faction: 'sol', expansions: ['pok'], entries: [adjust({ tradeGoods: goods }), score] });

describe('publicObjective:vast_reserves Hold Vast Reserves', () => {
  // "Spend 6 influence, 6 resources, and 6 trade goods."
  // Checks: scoring it with 8 trade goods leaves 2: the 6 trade goods the card asks for are spent by the scoring.
  // Why the check is redundant here: not a check but a cost; the plan counts trade goods, and without the spend the
  //  forecast would keep 6 trade goods the player no longer has.
  test('publicObjective:vast_reserves scored spends 6 trade goods', () => {
    const score = status();
    const plan = table(8, score);
    quote(plan.pack, id, 'Spend 6 influence, 6 resources, and 6 trade goods');
    expect(endOf(plan).tradeGoods).toBe(2);
    expectNone(warningsOf(plan, score), 'shortTradeGoods');
  });

  // LRR 93.4 and the card: "Spend ... 6 trade goods."
  // Checks: with 2 trade goods the scoring is warned of as short of trade goods; the plan scores it all the same.
  // Why the check is NOT redundant here: the card lifts no rule; it asks for a spend the player cannot make, the same
  //  check every payment of trade goods makes.
  test('publicObjective:vast_reserves scored with 2 trade goods is short of trade goods', () => {
    const score = status();
    const plan = table(2, score);
    expectStanding(warningsOf(plan, score), 'shortTradeGoods');
    expect(endOf(plan).holdings.scored).toContain(id);
  });

  // Ruling: "The influence, resources and trade goods must be spent during the status phase."
  // Checks: the same status entry without the objective spends nothing and warns of nothing.
  // Why the check is NOT redundant here: only the scoring spends; holding 8 trade goods is no cost by itself.
  test('publicObjective:vast_reserves not scored spends no trade goods', () => {
    const score = status([]);
    const plan = table(8, score);
    expect(endOf(plan).tradeGoods).toBe(8);
    expectNone(warningsOf(plan, score), 'shortTradeGoods');
  });

  // Checks: the effect is played by the scoring, not a reminder.
  test('publicObjective:vast_reserves is a play effect of its scoring', () => {
    const { pack } = table(0, status());
    expect(effect(pack, id).tier).toBe('play');
  });

  test.todo('publicObjective:vast_reserves the 6 influence and 6 resources: the status entry has no payment of planets, and trade goods may stand in for them (ruling), so only the 6 trade goods are counted');
});
