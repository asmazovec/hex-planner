import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './sardakkbt';

describe('breakthrough:sardakkbt N\'orr Supremacy', () => {
  // "After you win a combat, either gain 1 command token or research a unit upgrade technology."
  // Checks: the breakthrough is a reminder of both combats, in space and on the ground.
  // Why nothing is validated here: its trigger is winning a combat, and the plan does not decide combat; the player
  // enters what they took (a token by an adjustment, the upgrade in `gains`). It lifts no rule either: the upgrade must
  // still meet its prerequisites (tirules2, Sardakk N'orr, N'orr Supremacy 1).
  test('breakthrough:sardakkbt is a reminder of combat: the plan does not know who wins one', () => {
    const { pack } = bench({ faction: 'sardakk', expansions: ['te'] });
    quote(pack, id, 'After you win a combat, either gain 1 command token or research a unit upgrade technology.');
    expect(effect(pack, id)).toMatchObject({ tier: 'hint', hintAt: ['combat', 'invasion'] });
    expect(effect(pack, id).waive).toBeUndefined();
  });

  test.todo('breakthrough:sardakkbt the unit upgrade researched after a won combat must meet its prerequisites: the plan checks no prerequisites yet, and does not know who wins a combat');
});
