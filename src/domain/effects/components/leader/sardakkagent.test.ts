import { describe, expect, test } from 'vitest';
import type { Entry } from '../../../types';
import { bench, effect, endOf, expectStanding, HOME, NEAR, quote, tactical, TARGET, using, warningsOf } from '../kit';
import { id } from './sardakkagent';

/** A cruiser carries one infantry to the target and lands it on t1; the agent is used with the planet chosen. */
const invade = (planet: string, use = true): Entry => {
  const move = tactical(TARGET, {
    moves: [{ from: HOME, units: { cruiser: 1, infantry: 1 }, via: [NEAR] }], landings: [{ planetId: 't1', units: { infantry: 1 } }],
  }, { choices: { planet } });
  return use ? using(move, id) : move;
};
const sardakk = (entries: Entry[]) =>
  bench({ faction: 'sardakk', expansions: ['pok'], units: { [HOME]: { cruiser: 2, infantry: 2 } }, start: { leaders: { [id]: 'unlocked' } }, entries });

describe('leader:sardakkagent T\'ro', () => {
  // "At the end of a player's tactical action: You may exhaust this card: if you do, that player may place 2 infantry
  //  from their reinforcements on a planet they control in the active system."
  // Checks: my action takes t1 with one infantry and uses the agent on t1: at the end of the plan t1 holds three.
  // Why nothing is waived here: the card breaks no rule, it adds units to the board; the planner counts the units on
  // each planet, so the two infantry must appear there (a `play` effect).
  test('leader:sardakkagent used at the end of my tactical action places 2 infantry on the planet I took', () => {
    const move = invade('t1');
    expect(endOf(sardakk([move])).ground.t1).toEqual({ infantry: 3 });
  });

  // "... on a planet they control in the active system."
  // Checks: the chosen planet is the home planet h1, outside the active system: nothing is placed on it.
  // Why the play does NOT apply here: the card places only in the active system.
  test('leader:sardakkagent places nothing on a planet outside the active system', () => {
    const move = invade('h1');
    const end = endOf(sardakk([move]));
    expect(end.ground.h1 ?? {}).toEqual({});
    expect(end.holdings.leaders[id]).toBe('exhausted');
  });

  // Checks: the same action without the agent leaves t1 with the one infantry that landed.
  // Why the play does NOT apply here: the agent is used only when named in the entry.
  test('leader:sardakkagent not used: the planet holds only what landed', () => {
    const table = sardakk([invade('t1', false)]);
    quote(table.pack, id, 'that player may place 2 infantry from their reinforcements on a planet they control in the active system');
    expect(endOf(table).ground.t1).toEqual({ infantry: 1 });
  });

  // "You may exhaust this card ..."
  // Checks: the agent used twice in a round is warned of the second time.
  // Why the check is NOT redundant here: an exhausted agent cannot be used until it is readied (34, 51.4).
  test('leader:sardakkagent is exhausted by its use: a second use in the round is warned of', () => {
    const second = using(tactical(HOME, { moves: [{ from: TARGET, units: { cruiser: 1 } }] }), id);
    expectStanding(warningsOf(sardakk([invade('t1'), second]), second), 'componentExhausted');
  });

  test('leader:sardakkagent is a play effect', () => {
    const { pack } = sardakk([]);
    expect(effect(pack, id).tier).toBe('play');
    expect(effect(pack, id).play).toBeTypeOf('function');
  });
});
