import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './raid_formation';

describe('ability:raid_formation Raid Formation', () => {
  // "When 1 or more of your units uses ANTI-FIGHTER BARRAGE: for each hit produced in excess of your opponent's fighters,
  //  choose 1 of your opponent's ships that has SUSTAIN DAMAGE to become damaged."
  // Checks: the ability is a reminder in the block of the battle.
  // Why nothing is validated: hits come from barrage dice and damage is a state of another player's ships during a
  // combat; the plan rolls no dice and keeps no damaged ships, so there is nothing to count.
  test('ability:raid_formation is a hint at combat', () => {
    const { pack } = bench({ faction: 'argent', expansions: ['pok'] });
    quote(pack, id, 'for each hit produced in excess of your opponent');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['combat']);
    expect(effect(pack, id).waive).toBeUndefined();
  });
});
