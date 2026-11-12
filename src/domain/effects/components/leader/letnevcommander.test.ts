import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './letnevcommander';

describe('leader:letnevcommander Rear Admiral Farran', () => {
  // "After 1 of your units uses SUSTAIN DAMAGE: You may gain 1 trade good."
  // Checks: the commander is a reminder of the combat step and changes nothing the plan counts.
  // Why nothing is validated here: the plan does not replay hits or SUSTAIN DAMAGE, so it cannot know when the trade
  // good comes; the player enters it as any trade good gained.
  test('leader:letnevcommander is a hint of the combat', () => {
    const { pack } = bench({ faction: 'letnev', expansions: ['pok'] });
    quote(pack, id, 'After 1 of your units uses SUSTAIN DAMAGE: You may gain 1 trade good.');
    expect(effect(pack, id)).toMatchObject({ tier: 'hint', hintAt: ['combat'] });
    expect(effect(pack, id).waive).toBeUndefined();
  });
});
