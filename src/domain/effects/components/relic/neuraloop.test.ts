import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './neuraloop';

describe('relic:neuraloop Neuraloop', () => {
  // "When a public objective is revealed, you may purge one of your relics to discard that objective and replace it
  //  with a random objective from any objective deck"
  // Checks: the relic is a reminder at the status step, where public objectives are revealed (81.2).
  // Why the check is redundant here: nothing is validated: the objective that replaces the revealed one is random, so
  // the player enters it by hand, and the relic purged for it is entered as spent; no limit or cost of the plan moves.
  test('relic:neuraloop is a hint of the status step', () => {
    const { pack } = bench({ faction: 'sol', expansions: ['pok'] });
    quote(pack, id, 'you may purge one of your relics to discard that objective');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['status']);
  });
});
