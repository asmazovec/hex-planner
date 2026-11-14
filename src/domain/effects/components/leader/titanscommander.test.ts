import { describe, expect, test } from 'vitest';
import type { Entry, LeaderState } from '../../../types';
import { bench, effect, endOf, expectStanding, HOME, NEAR, quote, tactical, using, warningsOf } from '../kit';
import { id } from './titanscommander';

/** The Titans produce an infantry at home (the dock on h1), paid with h2, naming the commander or not. */
const build = (named = true): Entry => {
  const entry = tactical(HOME, { production: { infantry: 1 }, payment: { planets: ['h2'], tradeGoods: 0 } });
  return named ? using(entry, id) : entry;
};
const titans = (entry: Entry, leaders: Record<string, LeaderState> = { [id]: 'unlocked' }) =>
  ({ entry, ...bench({ faction: 'titans', expansions: ['pok'], start: { leaders }, entries: [entry], game: { docks: ['h1'] } }) });

describe('leader:titanscommander Tungstantus', () => {
  // "When 1 or more of your units use PRODUCTION: You may gain 1 trade good."
  // Checks: a production that names the commander gains 1 trade good.
  // Why nothing is waived here: the commander adds to the trade goods (a `play` named in `uses`); no rule forbids it.
  test('leader:titanscommander a production gains 1 trade good', () => {
    const table = titans(build());
    quote(table.pack, id, 'You may gain 1 trade good');
    expect(endOf(table).tradeGoods).toBe(1);
  });

  // Titans of Ul, Tungstantus note 1.2: "A trade good will not be gained unless at least one unit is produced."
  // Checks: named in an action that produces nothing, it gains nothing.
  // Why it is NOT given here: the window is a unit using Production.
  test('leader:titanscommander without a production gains nothing', () => {
    const table = titans(using(tactical(NEAR), id));
    expect(endOf(table).tradeGoods).toBe(0);
  });

  // Checks: not named, the production gains nothing.
  // Why it is NOT given here: "may": the player names it to use it.
  test('leader:titanscommander not named gains nothing', () => {
    expect(endOf(titans(build(false))).tradeGoods).toBe(0);
  });

  // LRR 51.6: a commander is used only once unlocked.
  // Checks: named while locked, it is warned of as not held.
  // Why the check is NOT redundant here: a locked commander has no ability yet.
  test('leader:titanscommander locked is warned of', () => {
    const table = titans(build(), {});
    expectStanding(warningsOf(table, table.entry), 'componentNotHeld');
  });

  test('leader:titanscommander is played', () => {
    const { pack } = titans(build());
    expect(effect(pack, id).tier).toBe('play');
    expect(effect(pack, id).play).toBeDefined();
  });
});
