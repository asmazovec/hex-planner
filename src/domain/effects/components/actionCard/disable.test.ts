import { describe, expect, test } from 'vitest';
import { hintsAt } from '../../registry';
import { bench, effect, endOf, quote } from '../kit';
import { id } from './disable';

/** A game where I hold the card in hand, or not. */
const table = (hand: string[] = [id]) => bench({ faction: 'sol', start: { hand } });
const reminders = (hand: string[], step: Parameters<typeof hintsAt>[2]) => {
  const game = table(hand);
  return hintsAt(game.pack, endOf(game), step, ['me']).map(component => component.id);
};

describe('actionCard:disable Disable', () => {
  // "lose PLANETARY SHIELD and SPACE CANNON during this invasion"
  // Checks: the card is a reminder of the invasion step (the step of its window) and lifts no check.
  // Why nothing is validated: Planetary Shield only stops Bombardment and Space Cannon only rolls dice; no landing is ever forbidden by a PDS in the plan, so there is no check for the card to lift.
  test('actionCard:disable is a hint of the invasion step that waives nothing', () => {
    const { pack } = table();
    quote(pack, id, "lose PLANETARY SHIELD and SPACE CANNON during this invasion");
    expect(effect(pack, id)).toMatchObject({ tier: 'hint', hintAt: ['invasion'] });
    expect(effect(pack, id).waive).toBeUndefined();
    expect(effect(pack, id).modify).toBeUndefined();
  });

  // "lose PLANETARY SHIELD and SPACE CANNON during this invasion"
  // Checks: held in hand, the card stands among the reminders of the invasion block and of no other block; not
  // held, it is not shown.
  // Why nothing is validated: Planetary Shield only stops Bombardment and Space Cannon only rolls dice; no landing is ever forbidden by a PDS in the plan, so there is no check for the card to lift.
  test('actionCard:disable in hand is a reminder of the invasion block only', () => {
    expect(reminders([id], 'invasion')).toContain(id);
    expect(reminders([id], 'production')).not.toContain(id);
    expect(reminders([], 'invasion')).not.toContain(id);
  });
});
