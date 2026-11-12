import { describe, expect, test } from 'vitest';
import { hintsAt } from '../../registry';
import { bench, effect, endOf, quote } from '../kit';
import { id } from './argentcommander';

describe('leader:argentcommander Trrakan Aun Zulok', () => {
  // "When 1 or more of your units make a roll for a unit ability: You may choose 1 of those units to roll 1 additional die."
  // Checks: the commander is a reminder at the battle in space and at the invasion.
  // Why nothing is validated: one more die changes a roll, and the plan rolls no dice.
  test('leader:argentcommander is a hint at combat and invasion', () => {
    const { pack } = bench({ faction: 'argent', expansions: ['pok'] });
    quote(pack, id, 'You may choose 1 of those units to roll 1 additional die');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['combat', 'invasion']);
  });

  // LRR 51.6: "A commander must be unlocked to use its abilities."
  // Checks: unlocked, the commander is shown in the battle block; locked, it is not.
  // Why the check is NOT redundant here: a locked commander has no ability (51.6), so it is no reminder either.
  test('leader:argentcommander is shown at combat only once unlocked', () => {
    const open = bench({ faction: 'argent', expansions: ['pok'], start: { leaders: { [id]: 'unlocked' } } });
    expect(hintsAt(open.pack, endOf(open), 'combat', ['me']).map(c => c.id)).toContain(id);
    const shut = bench({ faction: 'argent', expansions: ['pok'] });
    expect(hintsAt(shut.pack, endOf(shut), 'combat', ['me']).map(c => c.id)).not.toContain(id);
  });
});
