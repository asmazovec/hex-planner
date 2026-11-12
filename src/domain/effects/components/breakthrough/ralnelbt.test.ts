import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './ralnelbt';

describe('breakthrough:ralnelbt Data Skimmer', () => {
  // "When you pass, take 1 action card from this card and discard the rest."
  // Checks: the breakthrough is a reminder of the round's flow, where the pass stands.
  // Why nothing is validated: which action cards other players discard is not known to the plan; the card taken when
  // passing is entered by the player in «Taken and discarded», like any card drawn.
  test('breakthrough:ralnelbt is a reminder at the pass', () => {
    const { pack } = bench({ faction: 'ralnel', expansions: ['te'] });
    quote(pack, id, 'When you pass, take 1 action card from this card and discard the rest.');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['round']);
  });
});
