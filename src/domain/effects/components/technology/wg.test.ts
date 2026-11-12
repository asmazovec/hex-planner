import { describe, expect, test } from 'vitest';
import type { Entry, ExtensionCode, GameState, Opponent } from '../../../types';
import { bench, componentAction, effect, endOf, expectNone, expectStanding, FAR, FARTHER, HOME, NEAR, quote, tactical, TARGET, warningsOf } from '../kit';
import { id } from './wg';

/**
 * Pass 2 declares this code in `src/domain/rules/codes/wormholeTokenPlace.ts` (the condition printed on Creuss IFF and
 * Wormhole Generator, step `component`).
 */
const PLACE = 'wormholeTokenPlace' as ExtensionCode;
/** Where the Creuss wormhole tokens stand, a new part of the shared state in pass 2: token to slot. */
const tokens = (state: GameState): Record<string, string> | undefined => (state as GameState & { wormholeTokens?: Record<string, string> }).wormholeTokens;

const RIVAL: Opponent = { id: 'o1', faction: 'letnev', vp: 0, seat: 2, color: 2 };
const generate = (systemId: string, token = 'alpha') => componentAction(id, { choices: { token, systemId } } as Partial<Entry>);
const table = (entries: Entry[], units = {}) => bench({
  faction: 'ghost', units, start: { technologies: [id] }, entries, game: { opponents: [RIVAL], enemyUnits: { [FAR]: { o1: { cruiser: 1 } } } },
});

describe('technology:wg Wormhole Generator', () => {
  // "ACTION: Exhaust this card to place or move a Creuss wormhole token into either a system that contains a planet you
  //  control or a non-home system that does not contain another player's ships."
  // Checks: the component action puts the alpha token into the empty system NEAR; it stands there at the end.
  // Why the check is redundant here: the board's wormholes are printed on the tiles (6.1); the technology puts one
  // where none is printed, and NEAR meets its condition.
  test.fails('technology:wg places a Creuss wormhole token into an empty non-home system', () => {
    const entry = generate(NEAR);
    const ghost = table([entry]);
    quote(ghost.pack, id, 'place or move a Creuss wormhole token into either a system that contains a planet you control');
    expect(tokens(endOf(ghost))?.alpha).toBe(NEAR);
    expectNone(warningsOf(ghost, entry), PLACE);
  });

  // Slipstream with the token: "... a system that contains either an alpha or beta wormhole."
  // Checks: the token placed in TARGET makes it an alpha system: a carrier (move 1) starting there flies two systems.
  // Why the check is redundant here: the move value is raised by Slipstream for a ship starting in a wormhole system,
  // and the token is such a wormhole.
  test.fails('technology:wg a token placed makes a wormhole system for Slipstream', () => {
    const move = tactical(FARTHER, { moves: [{ from: TARGET, units: { carrier: 1 }, via: [FAR] }] });
    const ghost = table([generate(TARGET), move], { [TARGET]: { carrier: 1 } });
    expectNone(warningsOf(ghost, move), 'speedShort');
  });

  // "... or a non-home system that does not contain another player's ships."
  // Checks: FAR holds a Letnev cruiser and no planet of mine: the token put there is warned of.
  // Why the check is NOT redundant here: the system meets neither of the card's two conditions.
  test.fails('technology:wg into a system with another player\'s ships and no planet of mine is warned of', () => {
    const entry = generate(FAR);
    expectStanding(warningsOf(table([entry]), entry), PLACE);
  });

  // "a system that contains a planet you control"
  // Checks: my home system has planets I control: the token may go there although it is a home system.
  test.fails('technology:wg into my home system with planets I control is not warned of', () => {
    const entry = generate(HOME);
    const ghost = table([entry]);
    expect(tokens(endOf(ghost))?.alpha).toBe(HOME);
    expectNone(warningsOf(ghost, entry), PLACE);
  });

  // LRR 34.4 with "Exhaust this card".
  // Checks: a second use in the same round is warned of: the card is exhausted.
  // Why the check is NOT redundant here: the generic rule of exhausted cards holds.
  test('technology:wg is exhausted by its use', () => {
    const again = generate(NEAR, 'beta');
    expectStanding(warningsOf(table([generate(NEAR), again]), again), 'componentExhausted');
  });

  // Checks: the technology changes the board when played: a `play`.
  test.fails('technology:wg is a play effect', () => {
    expect(effect(table([]).pack, id).tier).toBe('play');
  });
});
