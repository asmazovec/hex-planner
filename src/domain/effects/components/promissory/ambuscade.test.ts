import { describe, expect, test } from 'vitest';
import { hintsAt } from '../../registry';
import { bench, effect, endOf, quote } from '../kit';
import { id } from './ambuscade';

describe('promissory:ambuscade Strike Wing Ambuscade', () => {
  // "When 1 or more of your units make a roll for a unit ability: Choose 1 of those units to roll 1 additional die."
  // Checks: the note is a reminder in the blocks of the battle in space and of the invasion, where unit abilities roll
  // (Space Cannon, Anti-Fighter Barrage, Bombardment).
  // Why nothing is validated: one more die changes only a roll, and the plan rolls no dice (it simulates no combat).
  test('promissory:ambuscade is a hint at combat and invasion', () => {
    const { pack } = bench({ faction: 'sol', expansions: ['pok'] });
    quote(pack, id, 'Choose 1 of those units to roll 1 additional die');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['combat', 'invasion']);
  });

  // Checks: another player holding the Argent note sees it at the battle.
  // Why the check is NOT redundant here: there is no check; the reminder is all the note can be in the plan.
  test('promissory:ambuscade held by another player is shown in the battle block', () => {
    const table = bench({ faction: 'sol', expansions: ['pok'], start: { promissory: [`${id}@o1`] } });
    expect(hintsAt(table.pack, endOf(table), 'combat', ['me']).map(c => c.id)).toContain(`${id}@o1`);
  });
});
