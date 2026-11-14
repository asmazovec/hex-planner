import { describe, expect, test } from 'vitest';
import { hintsAt } from '../../../../testing/old/domain/effects/registry';
import { bench, effect, endOf, quote } from '../kit';
import { id } from './solar_flare';

const holding = (hand: string[]) => bench({ faction: 'sol', expansions: ['pok'], start: { hand } });

describe('actionCard:solar_flare Solar Flare', () => {
  // "During the "Movement" step of this tactical action, other players cannot use SPACE CANNON against your ships."
  // Checks: the card is a hint of the activation step and lifts nothing.
  // Why nothing is validated here: Space Cannon is a roll of dice; the replay checks no Space Cannon in movement, so
  // there is no check for the card to lift.
  test('actionCard:solar_flare is a hint of the activation step', () => {
    const { pack } = holding([]);
    quote(pack, id, 'other players cannot use SPACE CANNON against your ships');
    expect(effect(pack, id)).toMatchObject({ tier: 'hint', rule: id, hintAt: ['activation'] });
  });

  // Checks: held in hand, the card is reminded at the activation; not held, it is not.
  // Why nothing is validated here: a reminder is all the plan gives for a card about dice.
  test('actionCard:solar_flare held in hand is reminded at the activation, not held it is not', () => {
    const held = holding([id]);
    expect(hintsAt(held.pack, endOf(held), 'activation', ['me']).map(c => c.id)).toContain(id);
    const none = holding([]);
    expect(hintsAt(none.pack, endOf(none), 'activation', ['me']).map(c => c.id)).not.toContain(id);
  });
});
