import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './sh1';

describe('actionCard:sh1 Shields Holding', () => {
  // "Before you assign hits to your ships during a space combat: Cancel up to 2 hits."
  // Checks: the card is a reminder shown in the block of the battle, the step its window names.
  // Why nothing is validated: hits are dice of the space combat, which the plan does not roll; the losses of the
  // battle are entered by hand (`entry.losses`), so a cancelled hit is simply a ship the player does not mark as lost.
  test('actionCard:sh1 is a hint of the combat step', () => {
    const { pack } = bench({ faction: 'sol' });
    quote(pack, id, 'Cancel up to 2 hits.');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['combat']);
    expect(effect(pack, id).waive).toBeUndefined();
  });
});
