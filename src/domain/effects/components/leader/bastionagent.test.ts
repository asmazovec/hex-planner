import { describe, expect, test } from 'vitest';
import { bench, effect, expectNone, expectStanding, NEAR, quote, tactical, using, warningsOf } from '../kit';
import { id } from './bastionagent';

const table = (entries: ReturnType<typeof tactical>[]) =>
  bench({ faction: 'bastion', expansions: ['pok', 'te'], start: { leaders: { [id]: 'unlocked' } }, entries });

describe('leader:bastionagent Dame Briar', () => {
  // "When a player's unit is destroyed: You may exhaust this card to galvanize another of that player's units in the
  //  destroyed unit's system."
  // Checks: the agent is a reminder of the battle in space and of the invasion.
  // Why nothing is validated here: the plan rolls no dice and keeps no galvanize tokens; the units lost are entered
  // by hand as losses, and the agent changes none of the checks made on them.
  test('leader:bastionagent is a hint of the combat and the invasion steps, with no waiver', () => {
    const { pack } = table([]);
    quote(pack, id, 'You may exhaust this card to galvanize another of that player\'s units');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['combat', 'invasion']);
    expect(effect(pack, id).waive).toBeUndefined();
  });

  // LRR 51.6 with the card's "exhaust this card": an agent is spent by its ability.
  // Checks: named in «Used» of a tactical action the agent is exhausted, so naming it again the same round is warned of.
  // Why the check is NOT redundant here: the agent readies only in the status phase (51.7); a second use the same
  // round is a breach whatever was destroyed.
  test('leader:bastionagent used once is exhausted: a second use the same round is warned of', () => {
    const first = using(tactical(NEAR), id);
    const second = using(tactical(NEAR), id);
    const bastion = table([first, second]);
    expectNone(warningsOf(bastion, first), 'componentExhausted');
    expectStanding(warningsOf(bastion, second), 'componentExhausted');
  });
});
