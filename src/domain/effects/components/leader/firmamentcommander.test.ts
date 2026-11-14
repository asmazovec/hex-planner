import { describe, expect, test } from 'vitest';
import { bench, effect, HOME, NEAR, quote, tactical, TARGET, warningsOf } from '../kit';
import { id } from './firmamentcommander';

describe('leader:firmamentcommander Captain Aroz', () => {
  // "You can treat planets in systems that contain your ships as if they were controlled by you for the purpose of
  //  scoring secret objectives."
  // Checks: the commander is a reminder of the status phase and lifts no check.
  // Why nothing is validated: the plan does not check what an objective requires; the points are entered by hand.
  test('leader:firmamentcommander is a reminder of the status phase and waives nothing', () => {
    const { pack } = bench({ faction: 'firmament', expansions: ['pok', 'te'] });
    quote(pack, id, 'as if they were controlled by you for the purpose of scoring secret objectives');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['status']);
  });

  // "... for the purpose of scoring secret objectives."
  // Checks: a planet of a system with my ships, unlocked commander or not, still cannot pay: the payment warns that I
  // do not control it.
  // Why the check is NOT redundant here: the card treats the planet as mine for scoring only, not for spending it.
  test('leader:firmamentcommander does not let a planet I do not control pay', () => {
    const pay = tactical(TARGET, { moves: [{ from: HOME, units: { cruiser: 1 }, via: [NEAR] }], payment: { planets: ['t1'], tradeGoods: 0 } });
    const table = bench({ faction: 'firmament', expansions: ['pok', 'te'], units: { [HOME]: { cruiser: 1 } }, start: { leaders: { [id]: 'unlocked' } }, entries: [pay] });
    expect(warningsOf(table, pay).map(w => w.code)).toContain('planetNotControlled');
  });
});
