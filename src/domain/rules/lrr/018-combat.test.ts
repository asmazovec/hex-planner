/** LRR 18 Combat. Source: tirules2 rules-reference/combat.md. Dice are not rolled; the stats are shown. */
import { describe, expect, test } from 'vitest';
import { unitStats } from '../../unitStats';
import { FACTION, rulesPack } from '../kit';

const pack = rulesPack();

describe('LRR 18 Combat', () => {
  test('18.1: a unit hits on its combat value or more: the stats carry it at each level (cruiser 7, then 6)', () => {
    expect(unitStats(FACTION, 'cruiser', false, pack)?.combat).toBe(7);
    expect(unitStats(FACTION, 'cruiser', true, pack)?.combat).toBe(6);
  });

  test('18.2: a combat value with several burst icons rolls a die for each: a war sun rolls 3, a cruiser 1', () => {
    expect(unitStats(FACTION, 'warsun', false, pack)?.dice).toBe(3);
    expect(unitStats(FACTION, 'cruiser', false, pack)?.dice).toBe(1);
  });

  test.todo('18 note 1: the 0 of a d10 is a 10 — not modelled: dice are not rolled');
});
