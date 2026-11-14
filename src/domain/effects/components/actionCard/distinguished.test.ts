import { describe, expect, test } from 'vitest';
import { STEPS } from '../../../rules/registry';
import { hintsAt } from '../../../../testing/old/domain/effects/registry';
import { bench, effect, endOf, quote } from '../kit';
import { id } from './distinguished';

describe('actionCard:distinguished Distinguished Councilor', () => {
  // "Cast 5 additional votes for that outcome."
  // Checks: the card is played in the agenda phase, which has no step and no block: a hint with no steps, lifting no
  // check and changing no number.
  // Why nothing is validated: the plan counts no votes.
  test('actionCard:distinguished is a hint with no step that waives nothing', () => {
    const { pack } = bench({ faction: 'sol' });
    quote(pack, id, "Cast 5 additional votes for that outcome.");
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toBeUndefined();
    expect(effect(pack, id).modify).toBeUndefined();
  });

  // "Cast 5 additional votes for that outcome."
  // Checks: held in hand, the card is the reminder of no block of the action phase.
  // Why nothing is validated: the plan counts no votes.
  test('actionCard:distinguished in hand is shown in no block of a step', () => {
    const game = bench({ faction: 'sol', start: { hand: [id] } });
    const board = endOf(game);
    for (const step of STEPS) expect(hintsAt(game.pack, board, step, ['me']).map(component => component.id), step).not.toContain(id);
  });
});
