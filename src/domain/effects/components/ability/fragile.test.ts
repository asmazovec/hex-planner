import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './fragile';

describe('ability:fragile Fragile', () => {
  // "Apply -1 to the result of each of your unit's combat rolls."
  // Checks: the ability is a reminder of the battle in space and of the ground combat of the invasion.
  // Why nothing is validated here: it changes combat rolls only (tirules2, Jol-Nar, Fragile note 1: not anti-fighter
  // barrage, bombardment or space cannon), and the plan simulates no combat.
  test('ability:fragile is a reminder of combat: the plan rolls no dice', () => {
    const { pack } = bench({ faction: 'jolnar' });
    quote(pack, id, 'Apply -1 to the result of each of your unit\'s combat rolls.');
    expect(effect(pack, id)).toMatchObject({ tier: 'hint', hintAt: ['combat', 'invasion'] });
  });
});
