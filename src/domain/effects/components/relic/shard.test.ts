import { describe, expect, test } from 'vitest';
import type { Entry } from '../../../../testing/old/domain/types';
import { adjust, bench, effect, endOf, quote } from '../kit';
import { id } from './shard';

const gains = (): Entry => ({ ...adjust({}), gains: [id] });
const loses = (): Entry => ({ ...adjust({}), spends: [id] });
const table = (entries: Entry[], relics: string[] = []) => bench({ faction: 'sol', expansions: ['pok'], start: { relics }, entries });

describe('relic:shard Shard of the Throne', () => {
  // "When you gain this card, gain 1 victory point"
  // Checks: the entry that gains the relic adds 1 victory point.
  // Why it is counted here: the points are the board's; the relic gives one by being gained.
  test('relic:shard gained gives 1 victory point', () => {
    const shard = table([gains()]);
    quote(shard.pack, id, 'When you gain this card, gain 1 victory point, when you lose this card, lose 1 victory point.');
    expect(endOf(shard).vp).toBe(1);
  });

  // "when you lose this card, lose 1 victory point."
  // Checks: gained and then lost, the relic leaves the points where they were.
  test('relic:shard lost takes the victory point away', () => {
    const shard = table([gains(), loses()]);
    expect(endOf(shard).vp).toBe(0);
    expect(endOf(table([gains()])).vp).toBe(1);
  });

  // Checks: held when the plan begins, the relic adds nothing: its point is in the starting points set by hand.
  // Why nothing is counted here: the card gives its point when gained, which happened before the plan.
  test('relic:shard held from the start adds no point', () => {
    expect(endOf(table([], [id])).vp).toBe(0);
  });

  test.todo('relic:shard "that player gains this card": the transfer to a player who takes such a planet is not replayed');

  test('relic:shard is counted, not only shown', () => {
    expect(effect(table([]).pack, id).tier).not.toBe('hint');
  });
});
