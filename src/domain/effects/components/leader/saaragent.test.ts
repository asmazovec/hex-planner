import { describe, expect, test } from 'vitest';
import type { Entry, UnitCounts } from '../../../types';
import { bench, effect, expectNone, expectStanding, expectWaived, FAR, HOME, NEAR, quote, tactical, TARGET, using, warningsOf } from '../kit';
import { id } from './saaragent';

/** Dreadnoughts (move 1) leave home for the target, two systems away; `elsewhere` stands at FAR and does not move. */
const flight = (dreadnoughts: number, elsewhere: UnitCounts, uses: boolean, extra: Entry[] = []) => {
  const plain = tactical(TARGET, { moves: [{ from: HOME, units: { dreadnought: dreadnoughts }, via: [NEAR] }] });
  const move = uses ? using(plain, id) : plain;
  return { move, ...bench({
    faction: 'saar', expansions: ['pok'], units: { [HOME]: { dreadnought: dreadnoughts }, [FAR]: elsewhere },
    start: { leaders: { [id]: 'unlocked' } }, entries: [...extra, move],
  }) };
};

describe('leader:saaragent Captain Mendosa', () => {
  // "When a player activates a system: You may exhaust this card to increase the move value of 1 of that player's
  //  ships to match the move value of the ship on the game board that has the highest move value."
  // Checks: the Saar activate the target and name the agent in «Used»; the dreadnought, one short, is raised to the
  // cruiser's move 2 (a cruiser stands elsewhere on the board), and its route warning is listed and lifted by the agent.
  // Why the check is redundant here: the route check (58.2) compares the route with the dreadnought's move 1, and the
  // agent raises that ship's move to the highest on the board, which reaches the target.
  test.fails('leader:saaragent used on activation lets one slow ship reach the target: the warning is waived', () => {
    const saar = flight(1, { cruiser: 1 }, true);
    quote(saar.pack, id, 'increase the move value of 1 of that player\'s ships to match the move value of the ship on the game board that has the highest move value');
    expectWaived(warningsOf(saar, saar.move), 'speedShort', id);
  });

  // LRR 58.2: a ship moves no farther than its move value.
  // Checks: the same flight without the agent in «Used» is warned of.
  // Why the check is NOT redundant here: the agent is exhausted to be used; not named, it was not used.
  test('leader:saaragent not used, the slow ship is warned of', () => {
    const saar = flight(1, { cruiser: 1 }, false);
    expectStanding(warningsOf(saar, saar.move), 'speedShort');
  });

  // "... the move value of 1 of that player's ships ..."
  // Checks: two dreadnoughts short of the target; the agent raises one, the other is still short.
  // Why the check is NOT redundant here: the text names one ship; the second keeps its move 1.
  test('leader:saaragent raises one ship only: two slow ships stay warned of', () => {
    const saar = flight(2, { cruiser: 1 }, true);
    expectStanding(warningsOf(saar, saar.move), 'speedShort');
  });

  // "... to match the move value of the ship on the game board that has the highest move value."
  // Checks: with no faster ship on the board the dreadnought is matched to move 1 and stays short.
  // Why the check is NOT redundant here: the agent copies a move value that exists; it adds nothing of its own.
  test('leader:saaragent with no faster ship on the board the slow ship stays warned of', () => {
    const saar = flight(1, { dreadnought: 1 }, true);
    expectStanding(warningsOf(saar, saar.move), 'speedShort');
  });

  // "You may exhaust this card ..." with LRR 51.6.
  // Checks: a second use in the same round finds the agent exhausted and is warned of.
  // Why the check is NOT redundant here: the agent is readied only in the status phase.
  test('leader:saaragent used twice in a round is warned of as exhausted', () => {
    const first = using(tactical(NEAR, { moves: [{ from: FAR, units: { cruiser: 1 } }] }), id);
    const saar = flight(1, { cruiser: 1 }, true, [first]);
    expectNone(warningsOf(saar, first), 'componentExhausted');
    expectStanding(warningsOf(saar, saar.move), 'componentExhausted');
  });

  test.fails('leader:saaragent is a play effect that waives the route check of its entry', () => {
    const { pack } = flight(1, {}, false);
    expect(effect(pack, id).tier).toBe('play');
    expect(effect(pack, id).waive?.map(w => [w.code, w.lasts])).toEqual([['speedShort', undefined]]);
  });
});
