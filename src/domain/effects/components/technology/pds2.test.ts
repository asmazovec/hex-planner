import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './pds2';

describe('technology:pds2 PDS II', () => {
  // "You may use this unit's SPACE CANNON against ships that are adjacent to this unit's system."
  // Checks: the upgrade is passive and changes no point of the count.
  // Why nothing is validated here: SPACE CANNON is a roll, at either range; a PDS has no cost, move or Production the
  // plan counts.
  test('technology:pds2 changes no number of the count', () => {
    const { pack } = bench({ faction: 'hacan', start: { technologies: [id] } });
    quote(pack, id, 'SPACE CANNON against ships that are adjacent to this unit\'s system');
    const found = effect(pack, id);
    expect(found.tier).toBe('passive');
    expect(found.waive).toBeUndefined();
    expect(Object.keys(found.modify ?? {})).toEqual([]);
  });
});
