import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './coup';

describe("actionCard:coup Coup d'Etat", () => {
  // "End that player's turn, the strategic action is not resolved and the strategy card is not exhausted."
  // Checks: the card is a hint with no step and lifts nothing.
  // Why nothing is validated here: opponents' strategy cards are not planned, so the strategic action it cancels is
  // not an entry of the plan.
  test('actionCard:coup is a hint with no step: opponents\' strategic actions are not planned', () => {
    const { pack } = bench({ faction: 'sol', expansions: ['pok'] });
    quote(pack, id, "End that player's turn, the strategic action is not resolved");
    expect(effect(pack, id)).toMatchObject({ tier: 'hint', rule: id });
    expect(effect(pack, id).hintAt).toBeUndefined();
    expect(effect(pack, id).waive).toBeUndefined();
  });
});
