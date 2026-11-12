import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './crimsonhero';

describe('leader:crimsonhero Homesick Phantom — Fragment Reality', () => {
  // "When you produce ships: You may place any of those ships onto this card. At the start of a space combat, you may
  //  purge this card to place all ships from this card into the active system."
  // Checks: the hero is a reminder in the blocks of production and combat.
  // Why nothing is validated: the plan has no place off the board for the ships kept on the card, and the start of a
  // space combat is not simulated.
  test('leader:crimsonhero is a reminder of production and combat', () => {
    const { pack } = bench({ faction: 'crimson', expansions: ['pok', 'te'] });
    quote(pack, id, 'When you produce ships: You may place any of those ships onto this card.');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['production', 'combat']);
  });

  test.todo('leader:crimsonhero ships produced onto the card leave the board until the card is purged: the plan has no place off the board for units');
});
