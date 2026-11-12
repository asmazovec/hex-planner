import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './unrelenting';

describe('ability:unrelenting Unrelenting', () => {
  // "Apply +1 to the result of each of your unit's combat rolls."
  // Checks: the ability is a reminder of the battle in space and of the ground combat of the invasion.
  // Why nothing is validated here: it changes combat rolls only (tirules2, Sardakk N'orr, Unrelenting note 1: not
  // anti-fighter barrage, bombardment or space cannon), and the plan simulates no combat; the losses of a battle are
  // entered by hand, whatever the dice.
  test('ability:unrelenting is a reminder of combat: the plan rolls no dice', () => {
    const { pack } = bench({ faction: 'sardakk' });
    quote(pack, id, 'Apply +1 to the result of each of your unit\'s combat rolls.');
    expect(effect(pack, id)).toMatchObject({ tier: 'hint', hintAt: ['combat', 'invasion'] });
    expect(effect(pack, id).waive).toBeUndefined();
  });
});
