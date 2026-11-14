import { describe, expect, test } from 'vitest';
import { hintsAt } from '../../../../testing/old/domain/effects/registry';
import { bench, effect, endOf, quote } from '../kit';
import { id } from './color_ta';

const RIVAL = { id: 'a', faction: 'letnev', vp: 0, seat: 2, color: 2 };

describe('promissory:<color>_ta Trade Agreement', () => {
  // "When the <color> player replenishes commodities: The <color> player gives you all of their commodities."
  // Checks: the note is a reminder at the card step, where the Trade strategy card replenishes commodities.
  // Why nothing is validated: the holder decides to play it in the owner's turn, and the opponents' strategy cards
  // are not planned; the commodities it moves are entered as a transaction where the player expects them.
  test('promissory:<color>_ta is a hint at the card step', () => {
    const { pack } = bench({ faction: 'sol' });
    quote(pack, id, 'gives you all of their commodities');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['card']);
  });

  // Checks: another player's Trade Agreement that I hold stands among the reminders of the card step.
  test('promissory:<color>_ta another player\'s Trade Agreement I hold is a reminder of the card step', () => {
    const table = bench({ faction: 'sol', game: { opponents: [RIVAL], start: { me: { promissory: [`${id}@a`] }, opponents: { a: {} } } } });
    expect(hintsAt(table.pack, endOf(table), 'card', ['me']).map(c => c.id)).toContain(`${id}@a`);
  });

  test.todo('promissory:<color>_ta the owner\'s commodities go to the holder when the owner replenishes: played by another player in the owner\'s turn, which the plan does not foresee');
});
