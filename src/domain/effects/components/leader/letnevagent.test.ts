import { describe, expect, test } from 'vitest';
import { bench, effect, expectNone, expectStanding, HOME, NEAR, quote, tactical, TARGET, using, warningsOf } from '../kit';
import { id } from './letnevagent';

const letnev = (entries: Parameters<typeof bench>[0]['entries']) =>
  bench({ faction: 'letnev', expansions: ['pok'], units: { [HOME]: { cruiser: 2 } }, start: { leaders: { [id]: 'unlocked' } }, entries });

describe('leader:letnevagent Viscount Unlenn', () => {
  // "At the start of a space combat round: You may exhaust this card to choose 1 ship in the active system: that ship
  //  rolls 1 additional die during this combat round."
  // Checks: the agent is a reminder of the combat step and changes nothing the plan counts.
  // Why nothing is validated here: one more die is a roll the plan does not make.
  test('leader:letnevagent is a hint of the combat', () => {
    const { pack } = letnev([]);
    quote(pack, id, 'that ship rolls 1 additional die during this combat round');
    expect(effect(pack, id)).toMatchObject({ tier: 'hint', hintAt: ['combat'] });
    expect(effect(pack, id).waive).toBeUndefined();
  });

  // "You may exhaust this card ..." with LRR 51.6 (an agent is exhausted when used and readied in the status phase).
  // Checks: named in «Used» of a tactical action the agent is exhausted; a second use in the same round is warned of.
  // Why the check is NOT redundant here: the card is used once until it is readied; nothing lifts that.
  test('leader:letnevagent used once is exhausted, so a second use in the round is warned of', () => {
    const first = using(tactical(NEAR, { moves: [{ from: HOME, units: { cruiser: 1 } }] }), id);
    const second = using(tactical(TARGET, { moves: [{ from: HOME, units: { cruiser: 1 } }], }), id);
    const table = letnev([first, second]);
    expectNone(warningsOf(table, first), 'componentExhausted');
    expectStanding(warningsOf(table, second), 'componentExhausted');
  });
});
