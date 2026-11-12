import { describe, expect, test } from 'vitest';
import { STEPS } from '../../../rules/registry';
import { hintsAt } from '../../registry';
import { bench, effect, endOf, quote } from '../kit';
import { id } from './const_rider';

describe('actionCard:const_rider Construction Rider', () => {
  // "place 1 space dock from your reinforcements on a planet you control"
  // Checks: the card is played in the agenda phase, which has no step and no block: a hint with no steps, lifting no
  // check and changing no number.
  // Why nothing is validated: whether the prediction is correct depends on every player's votes, which the plan does not model; a dock it brings is entered by hand.
  test('actionCard:const_rider is a hint with no step that waives nothing', () => {
    const { pack } = bench({ faction: 'sol' });
    quote(pack, id, "place 1 space dock from your reinforcements on a planet you control");
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toBeUndefined();
    expect(effect(pack, id).waive).toBeUndefined();
    expect(effect(pack, id).modify).toBeUndefined();
  });

  // "place 1 space dock from your reinforcements on a planet you control"
  // Checks: held in hand, the card is the reminder of no block of the action phase.
  // Why nothing is validated: whether the prediction is correct depends on every player's votes, which the plan does not model; a dock it brings is entered by hand.
  test('actionCard:const_rider in hand is shown in no block of a step', () => {
    const game = bench({ faction: 'sol', start: { hand: [id] } });
    const board = endOf(game);
    for (const step of STEPS) expect(hintsAt(game.pack, board, step, ['me']).map(component => component.id), step).not.toContain(id);
  });
});
