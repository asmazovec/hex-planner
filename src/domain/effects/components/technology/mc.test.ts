import { describe, expect, test } from 'vitest';
import { CARD } from '../../../strategy';
import { adjust, bench, effect, expectNone, expectStanding, primary, quote, secondary, warningsOf } from '../kit';
import { id } from './mc';

/** The Technology secondary (four resources) paid with `spent` trade goods alone, `held` of them in hand. */
const research = (faction: string, spent: number, held = spent, technologies: string[] = [id]) => {
  const card = secondary(CARD.technology, { researched: ['technology:st'], payment: { planets: [], tradeGoods: spent } });
  return { card, ...bench({ faction, start: { technologies }, entries: [adjust({ tradeGoods: held }), card] }) };
};

describe('technology:mc Mirror Computing', () => {
  // "When you spend trade goods, each trade good is worth 2 resources or influence instead of 1."
  // Checks: two trade goods pay the four resources of the Technology secondary: no shortage is warned of.
  // Why the check is redundant here: the payment check (LRR 19.3, 91.3) counts one resource per trade good and
  // would find two of four; the card makes each worth 2, so the payment is whole. It changes the number, so nothing
  // is listed as waived (a `modify`).
  test('technology:mc two trade goods pay four resources', () => {
    const table = research('mentak', 2);
    quote(table.pack, id, 'each trade good is worth 2 resources or influence instead of 1');
    expectNone(warningsOf(table, table.card), 'shortResources');
  });

  // "... worth 2 resources or influence ..."
  // Checks: Leadership's token bought for three influence is paid with two trade goods.
  // Why the check is redundant here: two trade goods are worth four influence with the card, more than the three due.
  test('technology:mc two trade goods pay three influence for a token of Leadership', () => {
    const card = primary(CARD.leadership, { tokens: { tactic: 4 }, boughtTokens: 1, payment: { planets: [], tradeGoods: 2 } });
    const table = bench({ faction: 'mentak', start: { technologies: [id] }, entries: [adjust({ tradeGoods: 2 }), card] });
    expectNone(warningsOf(table, card), 'shortInfluence');
  });

  // Checks: one trade good is worth 2, still short of four, and the warning names the doubled value paid.
  // Why the check is NOT redundant here: the card doubles the value, it does not remove the cost.
  test('technology:mc one trade good is still short of four resources, counted as two', () => {
    const table = research('mentak', 1);
    const warnings = warningsOf(table, table.card);
    expectStanding(warnings, 'shortResources');
    expect(warnings.find(w => w.code === 'shortResources')?.params).toMatchObject({ needed: 4, paid: 2 });
  });

  // LRR 19.3 (Commodities and trade goods): a trade good spent is worth one resource or one influence.
  // Checks: the same payment without the card, and for the Mentak who did not research it, is short.
  // Why the check is NOT redundant here: the value of 2 is the technology's; without it a trade good is worth 1.
  test('technology:mc without the card two trade goods are short of four resources', () => {
    const table = research('mentak', 2, 2, []);
    expectStanding(warningsOf(table, table.card), 'shortResources');
  });

  // Checks: spending three trade goods while holding two is still warned of.
  // Why the check is NOT redundant here: the card makes a trade good worth more, it gives none (shortTradeGoods).
  test('technology:mc does not spend trade goods that are not held', () => {
    const table = research('mentak', 3, 2);
    expectStanding(warningsOf(table, table.card), 'shortTradeGoods');
  });

  test('technology:mc is a passive effect that changes the value of a trade good and waives nothing', () => {
    const { pack } = research('mentak', 2);
    expect(effect(pack, id).tier).toBe('passive');
    expect(effect(pack, id).modify).toBeDefined();
    expect(effect(pack, id).waive).toBeUndefined();
  });
});
