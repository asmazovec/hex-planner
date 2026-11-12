import { describe, expect, test } from 'vitest';
import type { Entry, GameState } from '../../../types';
import { adjust, bench, endOf, expectStanding, HOME, NEAR, quote, tactical, using, warningsOf } from '../kit';
import { id } from './minent';

/** A carrier flies into the empty system next door, whose frontier token it explores. */
const explore = () => tactical(NEAR, { moves: [{ from: HOME, units: { carrier: 1 } }] });
const table = (entries: Entry[]) => bench({ faction: 'sol', expansions: ['pok'], units: { [HOME]: { carrier: 1 } }, entries });
const tokens = (state: GameState) => state.tactic + state.fleet + state.strategy;

describe('exploration:minent Minor Entropic Field', () => {
  // "Gain 1 command token and 1 trade good."
  // Checks: the tactical action names the card it explored; after it the pools hold one token more than the eight of
  // the start less the one spent (20.2: into a pool of the player's choice), and one trade good.
  // Why nothing is waived here: the card gives; the token and the good go through the usual counts.
  test('exploration:minent the explore gives one command token and one trade good', () => {
    const move = using(explore(), id);
    const bench = table([move]);
    quote(bench.pack, id, 'Gain 1 command token and 1 trade good.');
    const end = endOf(bench);
    expect(tokens(end)).toBe(8);
    expect(end.tradeGoods).toBe(1);
  });

  // Checks: the same action without the card gives nothing.
  // Why the count is NOT changed here: nothing was explored, or something else was.
  test('exploration:minent the same action without the card gives nothing', () => {
    const end = endOf(table([explore()]));
    expect(tokens(end)).toBe(7);
    expect(end.tradeGoods).toBe(0);
  });

  // LRR 20.3: "A player is limited by the amount of command tokens in their reinforcements."
  // Checks: with all sixteen tokens in the pools and on the board, the token gained is warned of.
  // Why the check is NOT redundant here: the card gives a token, not one more than the faction has.
  test('exploration:minent a token beyond the sixteen of the faction is warned of', () => {
    const move = using(explore(), id);
    const bench = table([adjust({ tactic: 8 }), move]);
    expectStanding(warningsOf(bench, move), 'noReinforcements');
  });
});
