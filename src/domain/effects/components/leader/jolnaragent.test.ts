import { describe, expect, test } from 'vitest';
import { CARD } from '../../../strategy';
import type { Entry } from '../../../types';
import { adjust, bench, effect, endOf, expectNone, expectStanding, quote, secondary, using, warningsOf } from '../kit';
import { id } from './jolnaragent';

/** The secondary of Technology: Gravity Drive for 4 resources, paid with Home Two (1); `remove` is the infantry removed by planet. */
const research = (remove?: Record<string, number>): Entry => {
  const entry = secondary(CARD.technology, { researched: ['technology:gd'], payment: { planets: ['h2'], tradeGoods: 0 } });
  return remove ? using({ ...entry, choices: remove } as Entry, id) : entry;
};
/** Three infantry stand on Home One. */
const jolnar = (entries: Entry[]) => bench({
  faction: 'jolnar', expansions: ['pok'], start: { leaders: { [id]: 'unlocked' } }, entries: [adjust({ ground: { h1: { infantry: 3 } } }), ...entries],
});

describe('leader:jolnaragent Doctor Sucaban', () => {
  // "You may exhaust this card to allow that player to remove any number of their infantry from the game board. For
  //  each unit removed, reduce the resources spent by 1."
  // Checks: the agent removes the three infantry of Home One, so the research costs 1, which Home Two pays: no
  // warning of resources, and the infantry are gone.
  // Why the default cost does not apply: the card lowers the resources spent by one per infantry removed; the payment
  // is checked against the lower cost (nothing is listed as waived).
  test.fails('leader:jolnaragent used in a research removes infantry and lowers the cost by one each', () => {
    const entry = research({ h1: 3 });
    const table = jolnar([entry]);
    expectNone(warningsOf(table, entry), 'shortResources');
    expect(endOf(table).ground.h1?.infantry ?? 0).toBe(0);
  });

  // Checks: two infantry removed lower the cost to 2, and Home Two pays 1: the warning names a cost of 2.
  // Why the check is NOT redundant here: the cost falls by the infantry removed, no more.
  test.fails('leader:jolnaragent lowers the cost only by the infantry removed', () => {
    const entry = research({ h1: 2 });
    const table = jolnar([entry]);
    expect(warningsOf(table, entry).find(w => w.code === 'shortResources')?.params).toMatchObject({ needed: 2, paid: 1 });
    expect(endOf(table).ground.h1?.infantry).toBe(1);
  });

  // LRR 91 (Technology, secondary): one technology for 4 resources.
  // Checks: without the agent the research costs 4 and Home Two is short of it; the infantry stay.
  // Why the check is NOT redundant here: the agent acts only when named in the entry.
  test('leader:jolnaragent not used: the research costs four and the infantry stay', () => {
    const entry = research();
    const table = jolnar([entry]);
    quote(table.pack, id, 'For each unit removed, reduce the resources spent by 1.');
    expect(warningsOf(table, entry).find(w => w.code === 'shortResources')?.params).toMatchObject({ needed: 4, paid: 1 });
    expect(endOf(table).ground.h1?.infantry).toBe(3);
  });

  // "You may exhaust this card ..."
  // Checks: used twice in a round, the agent is warned of the second time.
  // Why the check is NOT redundant here: an exhausted agent cannot be used until it is readied (34, 51.4).
  test('leader:jolnaragent is exhausted by its use: a second use in the round is warned of', () => {
    const second = research({ h1: 1 });
    expectStanding(warningsOf(jolnar([research({ h1: 1 }), second]), second), 'componentExhausted');
  });

  test.fails('leader:jolnaragent is a play effect', () => {
    const { pack } = jolnar([]);
    expect(effect(pack, id).tier).toBe('play');
    expect(effect(pack, id).play).toBeTypeOf('function');
  });
});
