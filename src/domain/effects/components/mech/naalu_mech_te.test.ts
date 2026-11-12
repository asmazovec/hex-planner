import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './naalu_mech_te';

describe('mech:naalu_mech_te Iconoclast TE', () => {
  // "DEPLOY: When another player gains a relic, place 1 mech on any planet you control."
  // Checks: the mech is a hint with no step.
  // Why nothing is validated: it answers another player's relic, which the plan does not follow; the mech placed is
  // entered by hand (any planet I control, so no check of placement applies beyond control).
  test('mech:naalu_mech_te is a hint with no step: it answers another player\'s relic', () => {
    const { pack } = bench({ faction: 'naalu', expansions: ['pok', 'te'] });
    quote(pack, id, 'When another player gains a relic, place 1 mech on any planet you control');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toBeUndefined();
  });

  test.todo('mech:naalu_mech_te places a mech when a rival\'s entry gains a relic: the plan has no reaction of mine to another player\'s gains');
});
