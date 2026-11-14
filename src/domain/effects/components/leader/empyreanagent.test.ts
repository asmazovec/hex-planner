import { describe, expect, test } from 'vitest';
import type { Entry } from '../../../../testing/old/domain/types';
import type { GameState } from '../../../../testing/old/domain/types';
import { bench, endOf, expectStanding, HOME, NEAR, quote, TARGET, tactical, using, warningsOf } from '../kit';
import { id } from './empyreanagent';

const tokens = (state: GameState): number => state.tactic + state.fleet + state.strategy;
const flight = (to: string) => tactical(to, { moves: [{ from: HOME, units: { cruiser: 1 }, via: to === TARGET ? [NEAR] : [] }] });
const table = (entries: Entry[]) =>
  bench({ faction: 'empyrean', expansions: ['pok'], units: { [HOME]: { cruiser: 1 } }, start: { leaders: { [id]: 'unlocked' } }, entries });

describe('leader:empyreanagent Acamar', () => {
  // "After a player moves ships into a system that does not contain any planets: You may exhaust this card: that
  //  player gains 1 command token."
  // Checks: my cruiser moves into the empty system next to home and the action names Acamar: I end with one command
  // token more than the same action without it.
  // Why the default count is not enough here: a tactical action only spends a token (89.1); the agent gives one back.
  test('leader:empyreanagent used after moving into a system without planets gains a command token', () => {
    const plain = flight(NEAR);
    const used = using(flight(NEAR), id);
    const with_ = table([used]);
    quote(with_.pack, id, 'that player gains 1 command token');
    expect(tokens(endOf(with_))).toBe(tokens(endOf(table([plain]))) + 1);
  });

  // "... into a system that does not contain any planets ..."
  // Checks: the target holds two planets: naming Acamar gains nothing.
  // Why the default count stands here: the agent's condition is not met.
  test('leader:empyreanagent gains nothing for a move into a system with planets', () => {
    expect(tokens(endOf(table([using(flight(TARGET), id)])))).toBe(tokens(endOf(table([flight(TARGET)]))));
  });

  // "You may exhaust this card" (LRR 51.4, 34): an exhausted agent cannot be used until it is readied.
  // Checks: the agent is exhausted by its use, and a second use the same round is warned of.
  test('leader:empyreanagent is exhausted by its use; a second use is warned of', () => {
    const second = using(tactical(NEAR), id);
    const twice = table([using(flight(NEAR), id), second]);
    expect(endOf(twice).holdings.leaders[id]).toBe('exhausted');
    expectStanding(warningsOf(twice, second), 'componentExhausted');
  });

  test.todo('leader:empyreanagent used for another player\'s move: a component of another player is named in the mover\'s uses, where the agent is not held');
});
