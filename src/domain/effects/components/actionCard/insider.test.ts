import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './insider';

describe('actionCard:insider Insider Information', () => {
  // "Look at the top 3 cards of the agenda deck."
  // Checks: the card is a hint with no step and lifts nothing.
  // Why nothing is validated here: the agenda deck is not modelled, and looking at cards moves nothing the plan counts.
  test('actionCard:insider is a hint with no step: the agenda deck is not modelled', () => {
    const { pack } = bench({ faction: 'sol', expansions: ['pok'] });
    quote(pack, id, 'Look at the top 3 cards of the agenda deck.');
    expect(effect(pack, id)).toMatchObject({ tier: 'hint', rule: id });
    expect(effect(pack, id).hintAt).toBeUndefined();
    expect(effect(pack, id).waive).toBeUndefined();
  });
});
