import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './blitz';

describe('actionCard:blitz Blitz', () => {
  // "At the start of an invasion: Each of your non-fighter ships in the active system that do not have BOMBARDMENT gain
  //  BOMBARDMENT 6 until the end of the invasion."
  // Checks: the card is a reminder shown in the block of the invasion, the step its window names.
  // Why nothing is validated: BOMBARDMENT is a roll against ground forces, and the plan rolls no dice; what it destroys
  // is entered as the losses of the invasion. No count of the plan asks who has BOMBARDMENT during an invasion.
  test('actionCard:blitz is a hint of the invasion step', () => {
    const { pack } = bench({ faction: 'sol', expansions: ['pok'] });
    quote(pack, id, 'gain BOMBARDMENT 6 until the end of the invasion.');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['invasion']);
    expect(effect(pack, id).waive).toBeUndefined();
  });
});
