import { describe, expect, test } from 'vitest';
import { adjust, bench, effect, endOf, quote } from '../kit';
import { id } from './constitution';

describe('agenda:constitution New Constitution', () => {
  // "Discard all laws from play."
  // Checks: the agenda is a hint, shown with no step: the agenda phase has none.
  // Why nothing is validated: the outcome depends on the vote; the laws discarded are entered as spends of each law,
  // and the planets of the home system exhausted at the next strategy phase are not tracked before the action phase.
  test('agenda:constitution is a hint: nothing is counted or validated', () => {
    const { pack } = bench({ faction: 'sol' });
    quote(pack, id, "Discard all laws from play.");
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toBeUndefined();
    expect(effect(pack, id).waive).toBeUndefined();
  });

  // LRR 7.8: "When resolving a directive, players resolve the outcome that received the most votes and discard the agenda card."
  // Checks: the directive gained leaves nothing in play.
  test('agenda:constitution gained is a directive: nothing stays in play', () => {
    const table = bench({ faction: 'sol', entries: [{ ...adjust({}, 'agenda'), gains: [id] }] });
    expect(endOf(table).laws ?? []).not.toContain(id);
  });

  test.todo('agenda:constitution each player exhausts each planet in their home system at the start of the next strategy phase: the plan readies planets with the round and has no strategy phase step to exhaust them in');
});
