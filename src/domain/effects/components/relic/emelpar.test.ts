import { describe, expect, test } from 'vitest';
import { isWaived } from '../../../rules/registry';
import type { Entry, Warning } from '../../../types';
import { adjust, bench, effect, endOf, expectStanding, quote, secondary, using, warningsOf } from '../kit';
import { id } from './emelpar';

/** Technology (7) is another player's card: its secondary costs a token from my strategy pool. */
const TECHNOLOGY = 7;
const table = (entries: Entry[], relics = [id]) => bench({ faction: 'sol', expansions: ['pok'], start: { relics }, entries });
const standing = (warnings: Warning[], code: string) => warnings.filter(w => w.code === code && !isWaived(w));
/** The two starting strategy tokens are spent elsewhere first. */
const emptyPool = () => adjust({ strategy: -2 });

describe('relic:emelpar Scepter of Emelpar', () => {
  // "When you would spend a token from your strategy pool, you may exhaust this card to spend a token from your
  //  reinforcements instead."
  // Checks: with an empty strategy pool, a secondary that names the Scepter in `uses` does not run short and the pool
  // stays at 0: the token came from the reinforcements.
  // Why the check is redundant here: LRR 20.5 has the secondary paid from the strategy pool; the Scepter pays it from
  // the reinforcements instead, so the pool is never asked.
  test.fails('relic:emelpar pays the token of a secondary from the reinforcements', () => {
    const play = using(secondary(TECHNOLOGY), id);
    const scepter = table([emptyPool(), play]);
    quote(scepter.pack, id, 'you may exhaust this card to spend a token from your reinforcements instead');
    expect(standing(warningsOf(scepter, play), 'shortStrategy')).toEqual([]);
    expect(endOf(scepter).strategy).toBe(0);
  });

  // Checks: with tokens in the pool, the secondary with the Scepter leaves both of them there.
  // Why the check is redundant here: the token spent is one of the reinforcements, not of the pool.
  test.fails('relic:emelpar keeps the strategy pool whole', () => {
    expect(endOf(table([using(secondary(TECHNOLOGY), id)])).strategy).toBe(2);
  });

  // LRR 20.5: a secondary is resolved "by spending a command token from their strategy pool".
  // Checks: held but not named, the Scepter changes nothing: the empty pool runs short.
  // Why the check is NOT redundant here: the relic is exhausted to be used; one not used pays nothing.
  test('relic:emelpar held but not used, the empty strategy pool runs short', () => {
    const play = secondary(TECHNOLOGY);
    expectStanding(warningsOf(table([emptyPool(), play]), play), 'shortStrategy');
  });

  // Checks: the Scepter is exhausted by its use, so a second use in the same round is warned of.
  // Why the check is NOT redundant here: "exhaust this card": once until the status phase readies it (34.2).
  test('relic:emelpar is exhausted by its use: a second use in the round is warned of', () => {
    const again = using(secondary(2), id);
    const scepter = table([using(secondary(TECHNOLOGY), id), again]);
    expect(endOf(scepter).holdings.exhausted).toContain(id);
    expectStanding(warningsOf(scepter, again), 'componentExhausted');
  });

  test.fails('relic:emelpar is a play effect', () => {
    expect(effect(table([]).pack, id).tier).toBe('play');
  });
});
