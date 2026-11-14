import { describe, expect, test } from 'vitest';
import { hintsAt } from '../../../../testing/old/domain/effects/registry';
import { bench, effect, endOf, quote } from '../kit';
import { id } from './reflective';

const holding = (hand: string[]) => bench({ faction: 'sol', expansions: ['pok'], start: { hand } });

describe('actionCard:reflective Reflective Shielding', () => {
  // "Produce 2 hits against your opponent's ships in the active system."
  // Checks: the card is a hint of the combat step and lifts nothing.
  // Why nothing is validated here: hits belong to combat, which the plan does not simulate; the losses they cause are
  // entered by the player.
  test('actionCard:reflective is a hint of the combat step', () => {
    const { pack } = holding([]);
    quote(pack, id, "Produce 2 hits against your opponent's ships in the active system.");
    expect(effect(pack, id)).toMatchObject({ tier: 'hint', rule: id, hintAt: ['combat'] });
  });

  // Checks: held in hand, the card is reminded in the combat block; not held, it is not.
  // Why nothing is validated here: a reminder is all the plan gives for a combat card.
  test('actionCard:reflective held in hand is reminded at combat, not held it is not', () => {
    const held = holding([id]);
    expect(hintsAt(held.pack, endOf(held), 'combat', ['me']).map(c => c.id)).toContain(id);
    const none = holding([]);
    expect(hintsAt(none.pack, endOf(none), 'combat', ['me']).map(c => c.id)).not.toContain(id);
  });
});
