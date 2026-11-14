import { describe, expect, test } from 'vitest';
import { STEPS } from '../../../rules/registry';
import { hintsAt } from '../../registry';
import { bench, effect, endOf, quote } from '../kit';
import { id } from './confusing';

describe('actionCard:confusing Confusing Legal Text', () => {
  // "That player is the elected player instead."
  // Checks: the card is played in the agenda phase, which has no step and no block: a hint with no steps, lifting no
  // check and changing no number.
  // Why nothing is validated: the card changes who is elected; the plan counts no votes and no outcome of an agenda.
  test('actionCard:confusing is a hint with no step that waives nothing', () => {
    const { pack } = bench({ faction: 'sol' });
    quote(pack, id, "That player is the elected player instead.");
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toBeUndefined();
    expect(effect(pack, id).modify).toBeUndefined();
  });

  // "That player is the elected player instead."
  // Checks: held in hand, the card is the reminder of no block of the action phase.
  // Why nothing is validated: the card changes who is elected; the plan counts no votes and no outcome of an agenda.
  test('actionCard:confusing in hand is shown in no block of a step', () => {
    const game = bench({ faction: 'sol', start: { hand: [id] } });
    const board = endOf(game);
    for (const step of STEPS) expect(hintsAt(game.pack, board, step, ['me']).map(component => component.id), step).not.toContain(id);
  });
});
