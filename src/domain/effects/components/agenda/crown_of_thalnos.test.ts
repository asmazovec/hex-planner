import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './crown_of_thalnos';

describe('agenda:crown_of_thalnos The Crown of Thalnos', () => {
  // "During each combat round, the owner of this card may reroll any number of dice; they must destroy each of their
  //  units that did not produce a hit with its reroll."
  // Checks: the effect is a hint at the combat step.
  // Why nothing is validated: rerolls and the units destroyed by them belong to the dice, which the plan does not
  // roll; the losses of a battle are entered by hand (`losses`). A law is not held as a card, so the reminders of a
  // step (which ask the cards a player holds ready) do not show it yet: a known limit of the foundation.
  test('agenda:crown_of_thalnos is a hint at the combat', () => {
    const { pack } = bench({ faction: 'sol' });
    quote(pack, id, 'During each combat round, the owner of this card may reroll any number of dice');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['combat']);
  });
});
