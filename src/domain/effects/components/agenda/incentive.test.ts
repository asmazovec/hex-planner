import { describe, expect, test } from 'vitest';
import { adjust, bench, effect, endOf, quote } from '../kit';
import { id } from './incentive';

describe('agenda:incentive Incentive Program', () => {
  // "Draw and reveal 1 stage I public objective from the deck"
  // Checks: the agenda is a hint, shown with no step: the agenda phase has none.
  // Why nothing is validated: which objective the deck gives is unknown to the plan, and a revealed objective enters
  // the plan when it is scored (81.1). The agenda phase has no step of its own.
  test('agenda:incentive is a hint: nothing is counted or validated', () => {
    const { pack } = bench({ faction: 'sol' });
    quote(pack, id, "Draw and reveal 1 stage I public objective from the deck");
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toBeUndefined();
    expect(effect(pack, id).waive).toBeUndefined();
  });

  // LRR 7.8: "When resolving a directive, players resolve the outcome that received the most votes and discard the agenda card."
  // Checks: the directive gained leaves nothing in play.
  test('agenda:incentive gained is a directive: nothing stays in play', () => {
    const table = bench({ faction: 'sol', entries: [{ ...adjust({}, 'agenda'), gains: [id] }] });
    expect(endOf(table).laws ?? []).not.toContain(id);
  });
});
