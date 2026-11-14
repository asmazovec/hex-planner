import { describe, expect, test } from 'vitest';
import type { Entry } from '../../../types';
import type { GameState } from '../../../../testing/old/domain/types';
import { adjust, bench, endOf, expectStanding, HOME, NEAR, quote, tactical, using, warningsOf } from '../kit';
import { id } from './kel1';

/** A carrier flies into the empty system next door, whose frontier token it explores. */
const explore = () => tactical(NEAR, { moves: [{ from: HOME, units: { carrier: 1 } }] });
const table = (entries: Entry[]) => bench({ faction: 'sol', expansions: ['pok'], units: { [HOME]: { carrier: 1 } }, entries });
const tokens = (state: GameState) => state.tactic + state.fleet + state.strategy;

describe('exploration:kel1 Keleres Ship', () => {
  // "Gain 2 command tokens."
  // Checks: the tactical action names the card it explored; after it the pools hold two tokens more than the eight of
  // the start less the one spent (20.2: into pools of the player's choice).
  // Why nothing is waived here: the card gives; the tokens go through the usual counts.
  test('exploration:kel1 the explore gives two command tokens', () => {
    const move = using(explore(), id);
    const bench = table([move]);
    quote(bench.pack, id, 'Gain 2 command tokens.');
    expect(tokens(endOf(bench))).toBe(9);
  });

  // Checks: the same action without the card gives nothing.
  // Why the count is NOT changed here: nothing was explored, or something else was.
  test('exploration:kel1 the same action without the card gives nothing', () => {
    expect(tokens(endOf(table([explore()])))).toBe(7);
  });

  // LRR 20.3: "A player is limited by the amount of command tokens in their reinforcements."
  // Checks: with fifteen tokens in the pools and on the board, the second token gained is warned of.
  // Why the check is NOT redundant here: the card gives tokens, not more than the faction has.
  test('exploration:kel1 tokens beyond the sixteen of the faction are warned of', () => {
    const move = using(explore(), id);
    const bench = table([adjust({ tactic: 7 }), move]);
    expectStanding(warningsOf(bench, move), 'noReinforcements');
  });
});
