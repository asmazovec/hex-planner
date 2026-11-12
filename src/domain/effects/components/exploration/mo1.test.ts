import { describe, expect, test } from 'vitest';
import type { Entry, Game } from '../../../types';
import { bench, endOf, quote, TARGET, tactical, using } from '../kit';
import { id } from './mo1';

/** My carrier in the target system lands one infantry on Target One. */
const land = () => tactical(TARGET, { landings: [{ planetId: 't1', units: { infantry: 1 } }] });
const table = (move: Entry, game: Partial<Game> = {}) =>
  bench({ faction: 'sol', expansions: ['pok'], units: { [TARGET]: { carrier: 1, infantry: 1 } }, entries: [move], game });

describe('exploration:mo1 Mercenary Outfit', () => {
  // "You may place 1 infantry from your reinforcements on this planet."
  // Checks: the landing takes Target One, which is explored (35.1) with this card: one more infantry stands there.
  // Why nothing is waived here: the card places a unit, which the plan counts as placed.
  test('exploration:mo1 the planet taken gets one more infantry', () => {
    const move = using(land(), id);
    const outfit = table(move);
    quote(outfit.pack, id, 'You may place 1 infantry from your reinforcements on this planet.');
    expect(endOf(outfit).ground.t1).toEqual({ infantry: 2 });
  });

  // Checks: the same landing without the card leaves the one infantry landed.
  // Why the count is NOT changed here: nothing placed it.
  test('exploration:mo1 without the card only the landed infantry stands', () => {
    expect(endOf(table(land())).ground.t1).toEqual({ infantry: 1 });
  });

  // LRR 35.1: "When a player takes control of a planet that is not already controlled by another player, they explore
  // that planet."
  // Checks: Target One was mine already; the landing explores nothing, so the card places nothing.
  // Why the count is NOT changed here: without a planet newly controlled there is no "this planet".
  test('exploration:mo1 a planet already mine is not explored: nothing is placed', () => {
    const move = using(land(), id);
    expect(endOf(table(move, { planetControl: { t1: 'me' } })).ground.t1).toEqual({ infantry: 1 });
  });
});
