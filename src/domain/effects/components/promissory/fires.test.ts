import { describe, expect, test } from 'vitest';
import { upgradeTech } from '../../../holdings';
import type { Entry, Opponent, StartHoldings } from '../../../types';
import { bench, componentAction, effect, endOf, expectStanding, FAR, quote, warningsOf } from '../kit';
import { id } from './fires';

const MUAAT: Opponent = { id: 'o1', faction: 'muaat', vp: 0, seat: 2, color: 2 };
const NOTE = `${id}@o1`;

/** I play Sol, the Muaat sits at seat 2 with a carrier far away; `entries` is round 1. */
const sol = (entries: Entry[], me: StartHoldings = { promissory: [NOTE] }) =>
  bench({ faction: 'sol', start: me, entries, game: { opponents: [MUAAT], enemyUnits: { [FAR]: { o1: { carrier: 1 } } } } });

describe('promissory:fires Fires of the Gashlai', () => {
  // "ACTION: Remove 1 token from the Muaat player's fleet pool and return it to their reinforcements. Then, gain your
  //  war sun unit upgrade technology card."
  // Checks: Sol plays the Muaat's note by a component action and ends holding War Sun (Sol's own war sun upgrade).
  // Why the check is redundant here: a technology is otherwise gained by research with its prerequisites (90.7); the
  // card gives it outright, so nothing about prerequisites or research is asked.
  test('promissory:fires played gains the war sun upgrade of the player who plays it', () => {
    const play = componentAction(NOTE);
    const table = sol([play]);
    quote(table.pack, id, 'gain your war sun unit upgrade technology card');
    expect(endOf(table).holdings.technologies).toContain(upgradeTech(table.pack, 'sol', 'warsun'));
  });

  // "Remove 1 token from the Muaat player's fleet pool and return it to their reinforcements."
  // Checks: the Muaat's fleet pool goes from 3 to 2.
  // Why the check is redundant here: nothing but the Muaat's own redistribution changes their pools; the card does.
  test('promissory:fires played removes one token from the Muaat\'s fleet pool', () => {
    const table = sol([componentAction(NOTE)]);
    quote(table.pack, id, "Remove 1 token from the Muaat player's fleet pool");
    expect(endOf(table).rivals?.o1.fleet).toBe(2);
  });

  // "Then, return this card to the Muaat Player." (69.3)
  // Checks: after the play the note is the Muaat's again and no longer mine.
  // Why the check is NOT redundant here: the return is the rule for every note that says so; nothing is lifted.
  test('promissory:fires goes back to the Muaat once played', () => {
    const table = sol([componentAction(NOTE)]);
    quote(table.pack, id, 'Then, return this card to the Muaat Player.');
    const end = endOf(table);
    expect(end.holdings.promissory).toEqual([]);
    expect(end.rivals?.o1.holdings.promissory).toContain(NOTE);
  });

  // Ruling (Embers of Muaat, Fires of the Gashlai 1): "If a player already owns their war sun unit upgrade technology,
  //  they cannot play Fires of the Gashlai."
  // Checks: Sol already holding War Sun plays the note: a technology gained twice is warned of.
  // Why the check is NOT redundant here: the card cannot give what is already owned; the rule stands.
  test('promissory:fires played while the war sun upgrade is owned is warned of', () => {
    const play = componentAction(NOTE);
    const table = sol([play], { promissory: [NOTE], technologies: ['technology:ws'] });
    expectStanding(warningsOf(table, play), 'researchOwned');
  });

  // LRR 69.2: a player cannot play their own promissory note.
  // Checks: the Muaat playing their own Fires of the Gashlai is warned of.
  // Why the check is NOT redundant here: the card is written for the other players.
  test('promissory:fires the Muaat cannot play their own note', () => {
    const play = componentAction(`${id}@me`);
    const table = bench({ faction: 'muaat', start: { promissory: [`${id}@me`] }, entries: [play] });
    expectStanding(warningsOf(table, play), 'ownPromissory');
  });

  test('promissory:fires is a play effect', () => {
    expect(effect(sol([]).pack, id).tier).toBe('play');
  });
});
