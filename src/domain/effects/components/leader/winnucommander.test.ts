import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './winnucommander';

describe('leader:winnucommander Rickar Rickani', () => {
  // "During combat: Apply +2 to the result of each of your unit's combat rolls in the Mecatol Rex system, your home
  //  system, and each system that contains a legendary planet."
  // Checks: the commander is a reminder in the block of the combat step.
  // Why nothing is validated: the plan rolls no dice and fights no combat (the battle is the losses the player enters),
  // so a bonus to the rolls has nothing to change in the count.
  test('leader:winnucommander is a hint of the combat step', () => {
    const { pack } = bench({ faction: 'winnu', expansions: ['pok'] });
    quote(pack, id, 'Apply +2 to the result of each of your unit\'s combat rolls');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['combat']);
    expect(effect(pack, id).waive).toBeUndefined();
  });
});
