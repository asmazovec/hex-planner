import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './yssarilcommander';

describe('leader:yssarilcommander So Ata', () => {
  // "After another player activates a system that contains your units: You may look at that player's action cards,
  //  promissory notes, or secret objectives."
  // Checks: the commander is a reminder with no waiver and no change of a number.
  // Why nothing is validated here: looking at another player's cards changes nothing the plan counts.
  test('leader:yssarilcommander is a hint with no waiver', () => {
    const { pack } = bench({ faction: 'yssaril', expansions: ['pok'] });
    quote(pack, id, 'You may look at that player\'s action cards, promissory notes, or secret objectives.');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).waive).toBeUndefined();
    expect(effect(pack, id).modify).toBeUndefined();
  });
});
