import { describe, expect, test } from 'vitest';
import { CARD } from '../../../strategy';
import type { Entry } from '../../../types';
import { bench, effect, endOf, quote, secondary } from '../kit';
import { id } from './muaatcommander';

const table = (entries: Entry[], leaders: Record<string, 'unlocked'> = { [id]: 'unlocked' }) =>
  bench({ faction: 'muaat', expansions: ['pok'], start: { leaders }, entries });

describe('leader:muaatcommander Magmus', () => {
  // "After you spend a token from your strategy pool: You may gain 1 trade good."
  // Checks: the Muaat follows Warfare's secondary for a strategy token and gains one trade good after it.
  // Why the check is redundant here: trade goods otherwise come from Trade and from the cards that name them; the
  // commander adds one for each strategy token spent, which the count of the secondary does not know by itself.
  test.fails('leader:muaatcommander unlocked gives a trade good for a strategy token spent', () => {
    const muaat = table([secondary(CARD.warfare)]);
    quote(muaat.pack, id, 'After you spend a token from your strategy pool: You may gain 1 trade good.');
    const end = endOf(muaat);
    expect(end.strategy).toBe(1);
    expect(end.tradeGoods).toBe(1);
  });

  // Ruling (Embers of Muaat, Magmus 4): "The Muaat player must have Magmus unlocked before spending the strategy token."
  // Checks: the commander still locked gives nothing.
  // Why the check is NOT redundant here: a locked leader has no ability (51.1).
  test('leader:muaatcommander locked gives no trade good', () => {
    expect(endOf(table([secondary(CARD.warfare)], {})).tradeGoods).toBe(0);
  });

  // Checks: Leadership's secondary costs no strategy token, so it gives no trade good.
  // Why the check is NOT redundant here: the trigger is a token spent; none is.
  test('leader:muaatcommander gives nothing for a secondary that spends no token', () => {
    expect(endOf(table([secondary(CARD.leadership)])).tradeGoods).toBe(0);
  });

  test.fails('leader:muaatcommander is a passive effect', () => {
    expect(effect(table([]).pack, id).tier).toBe('passive');
  });
});
