import { describe, expect, test } from 'vitest';
import { hintsAt } from '../../../../testing/old/domain/effects/registry';
import { bench, effect, endOf, quote } from '../kit';
import { id } from './decoy';

const holding = (hand: string[]) => bench({ faction: 'sol', expansions: ['pok'], start: { hand } });

describe('actionCard:decoy Decoy Operation', () => {
  // "Remove up to 2 of your ground forces from the game board and place them on a planet you control in the active
  //  system."
  // Checks: the card is a hint of the activation step and lifts nothing.
  // Why nothing is validated here: it is played in another player's tactical action, where the plan has no entry of
  // mine to carry the move; the move itself breaks no rule the replay checks.
  test('actionCard:decoy is a hint of the activation step', () => {
    const { pack } = holding([]);
    quote(pack, id, 'Remove up to 2 of your ground forces from the game board');
    expect(effect(pack, id)).toMatchObject({ tier: 'hint', rule: id, hintAt: ['activation'] });
  });

  // Checks: held in hand, the card is reminded at the activation; not held, it is not.
  // Why nothing is validated here: a reminder is all the plan gives for a reaction in another player's turn.
  test('actionCard:decoy held in hand is reminded at the activation, not held it is not', () => {
    const held = holding([id]);
    expect(hintsAt(held.pack, endOf(held), 'activation', ['rival']).map(c => c.id)).toContain(id);
    const none = holding([]);
    expect(hintsAt(none.pack, endOf(none), 'activation', ['rival']).map(c => c.id)).not.toContain(id);
  });
});
