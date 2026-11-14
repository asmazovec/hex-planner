import { describe, expect, test } from 'vitest';
import type { Entry } from '../../../../testing/old/domain/types';
import type { Player } from '../../../players';
import { adjust, before, bench, endOf, expectNone, expectStanding, HOME, NEAR, quote, statusTokens, tactical, warningsOf } from '../kit';
import { id } from './malevolency';

const OBSIDIAN: Player = { id: 'o1', faction: 'obsidian', vp: 0, seat: 2, color: 2 };
/** The Obsidian's note, given to me: its address is its owner. */
const THEIRS = `${id}@o1`;
/** The same note still with the Obsidian, when I am the Obsidian. */
const MINE = `${id}@me`;

const table = (notes: string[], rounds: Entry[][], faction = 'sol', units = {}) => bench({
  faction, expansions: ['pok', 'te'], units: { [HOME]: units }, start: { promissory: notes }, rounds,
  game: { opponents: faction === 'obsidian' ? [] : [OBSIDIAN] },
});

/** My fleet pool at the end of a round of one status entry, with or without the note. */
const fleetAfterStatus = (notes: string[], faction = 'sol') => endOf(table(notes, [[statusTokens(1, 1, 0)]], faction)).fleet;

describe('promissory:malevolency Malevolency', () => {
  // "At the end of the status phase, if you are not the Obsidian player, you must remove 1 command token from your
  //  fleet pool and return it to your reinforcements."
  // Checks: holding the Obsidian's note through a status phase, my fleet pool ends one token lower than without it,
  // and the other pools are as they were.
  // Why the check is redundant here: not a lifted check but a changed number: the fleet pool the count uses (37.1)
  // is one token smaller after the status phase.
  test('promissory:malevolency held through the status phase takes 1 token from the fleet pool', () => {
    const status = statusTokens(1, 1, 0);
    const held = table([THEIRS], [[status]]);
    quote(held.pack, id, 'you must remove 1 command token from your fleet pool and return it to your reinforcements');
    const without = endOf(table([], [[status]]));
    const withNote = endOf(held);
    expect(withNote.fleet).toBe(without.fleet - 1);
    expect([withNote.tactic, withNote.strategy]).toEqual([without.tactic, without.strategy]);
  });

  // LRR 37.1: "The number of command tokens in a player's fleet pool indicates the maximum number of non-fighter ships
  //  that a player can have in a system."
  // Checks: in the next round as many ships as the fleet pool would have held without the note go into one system:
  // with the note the fleet pool check warns of them, without it nothing is warned.
  // Why the check is NOT redundant here: the note shrinks the fleet pool, so the check runs against a smaller number.
  test('promissory:malevolency makes the next round\'s fleet pool one ship smaller', () => {
    const ships = fleetAfterStatus([]);
    const move = tactical(NEAR, { moves: [{ from: HOME, units: { cruiser: ships } }] });
    const rounds = (): Entry[][] => [[statusTokens(1, 1, 0)], [move]];
    expectNone(warningsOf(table([], rounds(), 'sol', { cruiser: ships }), move), 'fleetPool');
    expectStanding(warningsOf(table([THEIRS], rounds(), 'sol', { cruiser: ships }), move), 'fleetPool');
  });

  // "... if you are not the Obsidian player ..."
  // Checks: the Obsidian holding its own note loses nothing in the status phase.
  // Why the check is NOT redundant here: the card spares the Obsidian player.
  test('promissory:malevolency held by the Obsidian itself takes nothing', () => {
    expect(fleetAfterStatus([MINE], 'obsidian')).toBe(fleetAfterStatus([], 'obsidian'));
  });

  // "At the end of the status phase ..."
  // Checks: during the action phase, before the status phase, the note held takes nothing from the fleet pool.
  // Why the check is NOT redundant here: the token is removed at the end of the status phase only.
  test('promissory:malevolency takes nothing before the status phase', () => {
    const status = statusTokens(1, 1, 0);
    const fleetBefore = (notes: string[]) => { const made = table(notes, [[adjust({}), status]]); return before(made.game, made.pack, status).fleet; };
    expect(fleetBefore([THEIRS])).toBe(fleetBefore([]));
  });

  test.todo('promissory:malevolency given to a neighbour for 1 influence at the end of a tactical action: the note moves by a transaction and the influence is entered by hand');
});
