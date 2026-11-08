/** LRR 87 Sustain Damage. Source: tirules2 rules-reference/sustain-damage.md. */
import { describe, expect, test } from 'vitest';
import { unitStats } from '../../unitStats';
import { FACTION, rulesPack } from '../kit';

const pack = rulesPack();

describe('LRR 87 Sustain Damage', () => {
  test('87 (intro): dreadnoughts, war suns and flagships have Sustain Damage; carriers, cruisers, destroyers and fighters do not', () => {
    const sustains = (id: Parameters<typeof unitStats>[1]) => unitStats(FACTION, id, false, pack)?.sustain === true;
    expect(['dreadnought', 'warsun', 'flagship'].every(id => sustains(id as 'dreadnought'))).toBe(true);
    expect(['carrier', 'cruiser', 'destroyer', 'fighter'].some(id => sustains(id as 'carrier'))).toBe(false);
  });

  test.todo('87.1: each use cancels one hit and damages the unit — not modelled: hits and damage are not tracked, losses are entered by hand');
  test.todo('87.2: a damaged unit works as an undamaged one — not modelled: damage is not tracked');
  test.todo('87.3: a damaged unit cannot sustain until repaired in the status phase — not modelled: damage is not tracked');
  test.todo('87.4: sustain works against any hit, also Space Cannon — not modelled: hits are not tracked');
  test.todo('87.4.1: only a unit that may be hit can sustain — not modelled: hits are not tracked');
  test.todo('87.5: sustain cannot cancel a direct destruction — not modelled: hits are not tracked');
  test.todo('87.6: Non-Euclidean Shielding cancels two hits — not modelled: faction technologies are not tracked');
});
