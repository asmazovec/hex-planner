import { describe, expect, test } from 'vitest';
import type { Entry, ExtensionCode, GameState, Opponent } from '../../../types';
import { bench, componentAction, effect, endOf, expectNone, expectStanding, FAR, NEAR, quote, warningsOf } from '../kit';
import { id } from './iff';

/**
 * Pass 2 declares this code in `src/domain/rules/codes/wormholeTokenPlace.ts` (the condition printed on Creuss IFF and
 * Wormhole Generator, step `component`): a Creuss wormhole token put into a system with no planet the player controls
 * that is a home system or holds another player's ships.
 */
const PLACE = 'wormholeTokenPlace' as ExtensionCode;
/** Where the Creuss wormhole tokens stand, a new part of the shared state in pass 2: token to slot. */
const tokens = (state: GameState): Record<string, string> | undefined => (state as GameState & { wormholeTokens?: Record<string, string> }).wormholeTokens;

const CREUSS: Opponent = { id: 'o1', faction: 'ghost', vp: 0, seat: 2, color: 2 };
const NOTE = `${id}@o1`;
const play = (systemId: string, token = 'alpha') => componentAction(NOTE, { choices: { token, systemId } } as Partial<Entry>);
/** I (Letnev) hold the Creuss IFF; the Creuss opponent has a cruiser in FAR. */
const table = (entry: Entry) => ({
  entry,
  ...bench({ faction: 'letnev', start: { promissory: [NOTE] }, entries: [entry], game: { opponents: [CREUSS], enemyUnits: { [FAR]: { o1: { cruiser: 1 } } } } }),
});

describe('promissory:iff Creuss Iff', () => {
  // "Place or move a Creuss wormhole token into either a system that contains a planet you control or a non-home system
  //  that does not contain another player's ships."
  // Checks: the holder places the alpha token into the empty system NEAR; it stands there at the end of the plan.
  // Why the check is redundant here: the board's wormholes are printed on the tiles (6.1); the note puts a wormhole
  // where none is printed, and NEAR meets the card's condition.
  test.fails('promissory:iff places a Creuss wormhole token into an empty non-home system', () => {
    const iff = table(play(NEAR));
    quote(iff.pack, id, 'Place or move a Creuss wormhole token into either a system that contains a planet you control');
    expect(tokens(endOf(iff))?.alpha).toBe(NEAR);
    expectNone(warningsOf(iff, iff.entry), PLACE);
  });

  // "... or a non-home system that does not contain another player's ships."
  // Checks: FAR holds a Creuss cruiser and no planet of mine: the token put there is warned of.
  // Why the check is NOT redundant here: the system meets neither of the card's two conditions.
  test.fails('promissory:iff into a system with another player\'s ships and no planet of mine is warned of', () => {
    const iff = table(play(FAR));
    expectStanding(warningsOf(iff, iff.entry), PLACE);
  });

  // "Then, return this card to the Creuss player." LRR 69.3.
  // Checks: the note leaves my hand and goes back to the Creuss opponent.
  test('promissory:iff goes back to the Creuss player once played', () => {
    const iff = table(play(NEAR));
    quote(iff.pack, id, 'Then, return this card to the Creuss player.');
    expect(endOf(iff).rivals?.o1.holdings.promissory).toContain(NOTE);
  });

  // LRR 69.2.
  // Checks: the Creuss player playing their own IFF is warned of.
  // Why the check is NOT redundant here: a player cannot play their own note; they have Wormhole Generator.
  test('promissory:iff the Creuss player cannot play their own', () => {
    const own = componentAction(`${id}@me`, { choices: { token: 'alpha', systemId: NEAR } } as Partial<Entry>);
    const ghost = bench({ faction: 'ghost', start: { promissory: [`${id}@me`] }, entries: [own] });
    expectStanding(warningsOf(ghost, own), 'ownPromissory');
  });

  // Checks: the note changes the board when it is played: a `play`.
  test.fails('promissory:iff is a play effect', () => {
    expect(effect(table(play(NEAR)).pack, id).tier).toBe('play');
  });
});
