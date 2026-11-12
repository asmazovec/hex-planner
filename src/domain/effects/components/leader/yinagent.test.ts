import { describe, expect, test } from 'vitest';
import { bench, effect, expectNone, expectStanding, NEAR, quote, tactical, using, warningsOf } from '../kit';
import { id } from './yinagent';

const table = (entries: ReturnType<typeof tactical>[]) =>
  bench({ faction: 'yin', expansions: ['pok'], units: { [NEAR]: { cruiser: 1 } }, start: { leaders: { [id]: 'unlocked' } }, entries });

describe('leader:yinagent Brother Milor', () => {
  // "After a player's unit is destroyed during combat: You may exhaust this card to allow that player to place 2
  //  fighters in the destroyed unit's system if it was a ship, or 2 infantry on its planet if it was a ground force."
  // Checks: the agent is a reminder of the combat step.
  // Why nothing is validated here: it answers a unit destroyed in combat, and the plan simulates no combat. Capacity
  // is not checked during combat (Yin notes, Brother Milor 2); after it the capacity checks of the action stand as
  // they are, so the agent lifts nothing.
  test('leader:yinagent is a hint of combat', () => {
    const { pack } = table([]);
    quote(pack, id, 'You may exhaust this card to allow that player to place 2 fighters');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['combat']);
    expect(effect(pack, id).waive).toBeUndefined();
  });

  // LRR 51.4 with the card's "You may exhaust this card": an agent is spent by its use.
  // Checks: named in the `uses` of an action it is exhausted; named again in the same round it is warned of.
  // Why the check is NOT redundant here: what the agent places is not counted, but its exhaustion is (34, 51.4).
  test('leader:yinagent used is exhausted, and a second use in the round is warned of', () => {
    const first = using(tactical(NEAR), id);
    const second = using(tactical(NEAR), id);
    const t = table([first, second]);
    expectNone(warningsOf(t, first), 'componentExhausted');
    expectStanding(warningsOf(t, second), 'componentExhausted');
  });
});
