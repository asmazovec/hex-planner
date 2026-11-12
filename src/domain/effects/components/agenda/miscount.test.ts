import { describe, expect, test } from 'vitest';
import { adjust, bench, effect, endOf, quote } from '../kit';
import { id } from './miscount';

describe('agenda:miscount Miscount Disclosed', () => {
  // "Vote on the elected law as if it were just revealed from the top of the deck."
  // Checks: the agenda is a hint, shown with no step: the agenda phase has none.
  // Why nothing is validated: it is a second vote on a law; votes are not counted by the plan, and the outcome is
  // entered as the law gained or spent.
  test('agenda:miscount is a hint: nothing is counted or validated', () => {
    const { pack } = bench({ faction: 'sol' });
    quote(pack, id, "Vote on the elected law as if it were just revealed from the top of the deck.");
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toBeUndefined();
    expect(effect(pack, id).waive).toBeUndefined();
  });

  // LRR 7.8: "When resolving a directive, players resolve the outcome that received the most votes and discard the agenda card."
  // Checks: the directive gained leaves nothing in play.
  test('agenda:miscount gained is a directive: nothing stays in play', () => {
    const table = bench({ faction: 'sol', entries: [{ ...adjust({}, 'agenda'), gains: [id] }] });
    expect(endOf(table).laws ?? []).not.toContain(id);
  });
});
