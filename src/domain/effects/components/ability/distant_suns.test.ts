import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './distant_suns';

describe('ability:distant_suns Distant Suns', () => {
  // "When you explore a planet that contains 1 of your mechs: You may draw 1 additional card; choose 1 to resolve and
  //  discard the rest."
  // Checks: the ability is a reminder with no step and lifts nothing.
  // Why nothing is validated here: exploration is not planned; no entry explores, and the exploration decks are not
  // counted, so there is no draw to change.
  test('ability:distant_suns is a hint with no step: exploration is not planned', () => {
    const { pack } = bench({ faction: 'naaz', expansions: ['pok'] });
    quote(pack, id, 'You may draw 1 additional card');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toBeUndefined();
    expect(effect(pack, id).waive).toBeUndefined();
  });
});
