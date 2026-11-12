import { describe, expect, test } from 'vitest';
import type { Entry } from '../../../types';
import { adjust, bench, effect, endOf, quote } from '../kit';
import { id } from './unconventional';

const resolved = (extra: Partial<Entry> = {}): Entry => ({ ...adjust({}, 'agenda'), gains: [id], ...extra } as Entry);

describe('agenda:unconventional Unconventional Measures', () => {
  // "For: Each player that voted "For" draws 2 action cards. Against: Each player that voted "For" discards all of
  //  their action cards."
  // Checks: the effect is a hint with no step: the agenda phase has none in a tactical action.
  // Why nothing is validated: both outcomes depend on who voted "For", and the plan counts no votes.
  test('agenda:unconventional is a hint: its outcomes depend on votes', () => {
    const { pack } = bench({ faction: 'sol' });
    quote(pack, id, 'Each player that voted "For" draws 2 action cards.');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt ?? []).toEqual([]);
  });

  // Checks: the cards drawn are entered by hand in the agenda entry's gains, as any card drawn; the directive leaves no law.
  // Why nothing is validated: which action cards are drawn is not known to the plan.
  test('agenda:unconventional the cards drawn are entered as gains, and the directive leaves nothing in play', () => {
    const t = bench({ faction: 'sol', rounds: [[resolved({ gains: [id, 'actionCard:bribery', 'actionCard:bribery'] })]] });
    const end = endOf(t);
    expect(end.holdings.hand.filter(card => card === 'actionCard:bribery')).toHaveLength(2);
    expect(end.laws ?? []).not.toContain(id);
  });
});
