import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './confounding';

describe('actionCard:confounding Confounding Legal Text', () => {
  // "You are the elected player instead."
  // Checks: the card is a hint with no step and lifts nothing.
  // Why nothing is validated here: the plan does not resolve agendas or elections; there is no rule of the replay the
  // card could change.
  test('actionCard:confounding is a hint with no step: elections are not counted', () => {
    const { pack } = bench({ faction: 'sol', expansions: ['pok'] });
    quote(pack, id, 'You are the elected player instead.');
    expect(effect(pack, id)).toMatchObject({ tier: 'hint', rule: id });
    expect(effect(pack, id).hintAt).toBeUndefined();
  });
});
