import { describe, expect, test } from 'vitest';
import type { Entry, ExtensionCode } from '../../../types';
import type { Player } from '../../../players';
import { bench, componentAction, effect, endOf, expectNone, expectStanding, quote, warningsOf } from '../kit';
import { id } from './ms';

/**
 * Pass 2 declares this code in `src/domain/rules/codes/placeNotControlled.ts`: units an ability places "on a planet you
 * control" go on one the player does not control.
 */
const PLACE = 'placeNotControlled' as ExtensionCode;

const SOL: Player = { id: 'o1', faction: 'sol', vp: 0, seat: 2, color: 2 };
/** The note of the Sol opponent, as I hold it. */
const NOTE = `${id}@o1`;

/** I (Letnev) hold the Sol player's Military Support and play it with the chosen planet. */
const play = (planet: string) => componentAction(NOTE, { choices: { planet } } as Partial<Entry>);
const table = (entry: Entry) =>
  ({ entry, ...bench({ faction: 'letnev', start: { promissory: [NOTE] }, entries: [entry], game: { opponents: [SOL] } }) });

describe('promissory:ms Military Support', () => {
  // "Then, you may place 2 infantry from your reinforcements on any planet you control."
  // Checks: the holder plays the note naming its home planet h1; two infantry stand there at the end of the plan.
  // Why the check is redundant here: units come onto the board by production (67) or by an ability that says where
  // (67.4); the note is such an ability, so nothing is produced or paid and no production check applies.
  test('promissory:ms places two infantry on the planet the holder chose', () => {
    const ms = table(play('h1'));
    quote(ms.pack, id, 'you may place 2 infantry from your reinforcements on any planet you control');
    expect(endOf(ms).ground.h1?.infantry).toBe(2);
    expectNone(warningsOf(ms, ms.entry), PLACE);
  });

  // "Remove 1 token from the Sol player's strategy pool, if able, and return it to their reinforcements."
  // Checks: the Sol opponent's strategy pool loses one of its two tokens.
  // Why the check is redundant here: the token leaves the pool of another player by the card's own words; it is no
  // token the holder spends, so no pool of the holder is checked.
  test('promissory:ms takes a token from the Sol player\'s strategy pool', () => {
    const ms = table(play('h1'));
    quote(ms.pack, id, 'Remove 1 token from the Sol player\'s strategy pool, if able');
    expect(endOf(ms).rivals?.o1.strategy).toBe(1);
  });

  // "... on any planet you control."
  // Checks: the infantry placed on t1, a planet nobody of mine holds, is warned of.
  // Why the check is NOT redundant here: the card places on a planet the holder controls only.
  test('promissory:ms on a planet the holder does not control is warned of', () => {
    const ms = table(play('t1'));
    expectStanding(warningsOf(ms, ms.entry), PLACE);
  });

  // "Then, return this card to the Sol player." LRR 69.3.
  // Checks: once played the note leaves my hand and goes back to the Sol opponent.
  // Why the check is NOT redundant here: a note that returns is held by its owner again; the generic rule of notes does it.
  test('promissory:ms goes back to the Sol player once played', () => {
    const ms = table(play('h1'));
    quote(ms.pack, id, 'Then, return this card to the Sol player.');
    const end = endOf(ms);
    expect(end.holdings.promissory).not.toContain(NOTE);
    expect(end.rivals?.o1.holdings.promissory).toContain(NOTE);
  });

  // LRR 69.2: "A player cannot play their own promissory note."
  // Checks: the Sol player playing their own Military Support is warned of.
  // Why the check is NOT redundant here: the note is written for the other players; the Sol player has Orbital Drop.
  test('promissory:ms the Sol player cannot play their own', () => {
    const own = componentAction(`${id}@me`, { choices: { planet: 'h1' } } as Partial<Entry>);
    const sol = bench({ faction: 'sol', start: { promissory: [`${id}@me`] }, entries: [own] });
    expectStanding(warningsOf(sol, own), 'ownPromissory');
  });

  // Checks: the note is played by its entry, so its effect is a `play`.
  test('promissory:ms is a play effect', () => {
    const { pack } = table(play('h1'));
    expect(effect(pack, id).tier).toBe('play');
  });
});
