import { describe, expect, test } from 'vitest';
import { STEPS } from '../../../rules/registry';
import { hintsAt } from '../../../../testing/old/domain/effects/registry';
import { bench, effect, endOf, quote } from '../kit';
import { id } from './imp_rider';

describe('actionCard:imp_rider Imperial Rider', () => {
  // "If your prediction is correct, gain 1 victory point."
  // Checks: the card is played in the agenda phase, which has no step and no block: a hint with no steps, lifting no
  // check and changing no number.
  // Why nothing is validated: whether the prediction is correct depends on the votes, which the plan does not model; a point it brings is entered by hand.
  test('actionCard:imp_rider is a hint with no step that waives nothing', () => {
    const { pack } = bench({ faction: 'sol' });
    quote(pack, id, "If your prediction is correct, gain 1 victory point.");
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toBeUndefined();
    expect(effect(pack, id).modify).toBeUndefined();
  });

  // "If your prediction is correct, gain 1 victory point."
  // Checks: held in hand, the card is the reminder of no block of the action phase.
  // Why nothing is validated: whether the prediction is correct depends on the votes, which the plan does not model; a point it brings is entered by hand.
  test('actionCard:imp_rider in hand is shown in no block of a step', () => {
    const game = bench({ faction: 'sol', start: { hand: [id] } });
    const board = endOf(game);
    for (const step of STEPS) expect(hintsAt(game.pack, board, step, ['me']).map(component => component.id), step).not.toContain(id);
  });
});
