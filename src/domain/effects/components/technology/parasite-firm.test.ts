import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './parasite-firm';

describe('technology:parasite-firm Neural Parasite (Firmament)', () => {
  // "At the start of the status phase, you may place 1 infantry from your reinforcements on a planet you control in
  //  your home system."
  // Checks: the technology is a reminder of the status phase and lifts no check.
  // Why nothing is validated: the infantry is optional and placed where the player chooses; the plan has no place
  // for it in the status entry, so it is entered by hand and nothing is breached.
  test('technology:parasite-firm is a reminder of the status phase and waives nothing', () => {
    const { pack } = bench({ faction: 'firmament', expansions: ['pok', 'te'] });
    quote(pack, id, 'you may place 1 infantry from your reinforcements on a planet you control in your home system');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['status']);
    expect(effect(pack, id).waive).toBeUndefined();
  });

  test.todo('technology:parasite-firm the infantry placed at the start of the status phase: the status entry has no choice of a unit to place');
});
