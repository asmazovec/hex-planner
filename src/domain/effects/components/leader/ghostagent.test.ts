import { describe, expect, test } from 'vitest';
import { bench, effect, expectNone, FAR, FARTHER, HOME, NEAR, quote, tactical, TARGET, using, warningsOf } from '../kit';
import { id } from './ghostagent';

describe('leader:ghostagent Emissary Taivra', () => {
  // "After a player activates a system that contains a non-delta wormhole: You may exhaust this card: if you do, that
  //  system is adjacent to all other systems that contain a wormhole during this tactical action."
  // Checks: the agent is a reminder in the block of the activation.
  // Why nothing is validated: the agent changes adjacency, and the plan warns of no route for adjacency: a step between
  // systems that are not joined is a jump of one step, allowed as a portal or an ability the plan does not count.
  test('leader:ghostagent is a hint of the activation', () => {
    const { pack } = bench({ faction: 'ghost', expansions: ['pok'] });
    quote(pack, id, 'that system is adjacent to all other systems that contain a wormhole during this tactical action');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['activation']);
  });

  // Checks: a carrier (move 1) flies from a beta system into the activated alpha system two systems away in one step, the agent
  // named in the entry; nothing is warned of, and the agent named is exhausted like any agent used.
  // Why no check is lifted: the jump is one step without the agent too; the agent only explains it.
  test('leader:ghostagent a step from a wormhole system into the activated one is not warned of', () => {
    const move = using(tactical(NEAR, { moves: [{ from: FAR, units: { carrier: 1 } }] }), id);
    const table = bench({
      faction: 'ghost', expansions: ['pok'], units: { [FAR]: { carrier: 1 } }, start: { leaders: { [id]: 'unlocked' } }, entries: [move],
      game: { map: { [HOME]: 'r-home', [NEAR]: 'r-alpha', [TARGET]: 'r-target', [FAR]: 'r-beta', [FARTHER]: 'r-empty' } },
    });
    const warnings = warningsOf(table, move);
    expectNone(warnings, 'speedShort');
    expectNone(warnings, 'componentExhausted');
  });
});
