import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './hack';

describe('actionCard:hack Hack Election', () => {
  // "During this agenda, you vote last."
  // Checks: the card is a hint with no step and lifts nothing.
  // Why nothing is validated here: the order of voting is not part of the plan; it counts no votes and the agenda
  // phase has no step of the replay where a reminder could stand.
  test('actionCard:hack is a hint with no step: votes are not counted', () => {
    const { pack } = bench({ faction: 'sol', expansions: ['pok'] });
    quote(pack, id, 'During this agenda, you vote last.');
    expect(effect(pack, id)).toMatchObject({ tier: 'hint', rule: id });
    expect(effect(pack, id).hintAt).toBeUndefined();
    expect(effect(pack, id).waive).toBeUndefined();
  });
});
