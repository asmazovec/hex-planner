import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './nomadagentartuno';

describe('leader:nomadagentartuno Artuno the Betrayer', () => {
  // "When you gain trade goods from the supply: You may exhaust this card to place an equal number of trade goods on
  //  this card. When this card readies, gain the trade goods on this card."
  // Checks: the agent is a reminder with no step and lifts nothing.
  // Why nothing is validated here: trade goods kept on a card are no place the plan counts; the goods set aside and
  // taken back are entered by hand.
  test('leader:nomadagentartuno is a hint with no step', () => {
    const { pack } = bench({ faction: 'nomad', expansions: ['pok'] });
    quote(pack, id, 'place an equal number of trade goods on this card');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toBeUndefined();
    expect(effect(pack, id).waive).toBeUndefined();
  });

  test.todo('leader:nomadagentartuno the trade goods put on the card and gained when it readies: the plan keeps no trade goods on a card');
});
