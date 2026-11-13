import { describe, expect, test } from 'vitest';
import { hintsAt } from '../../registry';
import { bench, effect, endOf, quote } from '../kit';
import { id } from './arboreccommander';

describe('leader:arboreccommander Dirzuga Rophal', () => {
  // "After another player activates a system that contains 1 or more of your units that have PRODUCTION: You may
  //  produce 1 unit in that system."
  // Checks: the commander is a reminder in the production block.
  // Why nothing is validated: the unit is produced in another player's turn. A waiver or a play is asked of the owner
  // of the entry, and the entry that activates the system is the other player's; the plan has no entry of mine there
  // to hold a production, so the unit is entered by hand.
  test('leader:arboreccommander is a hint in the production block', () => {
    const { pack } = bench({ faction: 'arborec', expansions: ['pok'] });
    quote(pack, id, 'You may produce 1 unit in that system');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['production']);
    expect(effect(pack, id).waive).toBeUndefined();
  });

  // Checks: the unlocked commander is shown in the production block of its player.
  test('leader:arboreccommander unlocked is shown at production', () => {
    const table = bench({ faction: 'arborec', expansions: ['pok'], start: { leaders: { [id]: 'unlocked' } } });
    expect(hintsAt(table.pack, endOf(table), 'production', ['rival']).map(c => c.id)).toContain(id);
  });

  test.todo('leader:arboreccommander produces 1 unit in another player\'s turn: the plan has no entry of mine inside another player\'s tactical action to hold it');
});
