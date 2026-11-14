import { describe, expect, test } from 'vitest';
import { STEPS } from '../../../rules/registry';
import { hintsAt } from '../../registry';
import { bench, effect, endOf, quote } from '../kit';
import { id } from './diplo_rider';

describe('actionCard:diplo_rider Diplomacy Rider', () => {
  // "Each other player places a command token from their reinforcements in that system."
  // Checks: the card is played in the agenda phase, which has no step and no block: a hint with no steps, lifting no
  // check and changing no number.
  // Why nothing is validated: whether the prediction is correct depends on the votes, which the plan does not model; the tokens are the other players'.
  test('actionCard:diplo_rider is a hint with no step that waives nothing', () => {
    const { pack } = bench({ faction: 'sol' });
    quote(pack, id, "Each other player places a command token from their reinforcements in that system.");
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toBeUndefined();
    expect(effect(pack, id).modify).toBeUndefined();
  });

  // "Each other player places a command token from their reinforcements in that system."
  // Checks: held in hand, the card is the reminder of no block of the action phase.
  // Why nothing is validated: whether the prediction is correct depends on the votes, which the plan does not model; the tokens are the other players'.
  test('actionCard:diplo_rider in hand is shown in no block of a step', () => {
    const game = bench({ faction: 'sol', start: { hand: [id] } });
    const board = endOf(game);
    for (const step of STEPS) expect(hintsAt(game.pack, board, step, ['me']).map(component => component.id), step).not.toContain(id);
  });
});
