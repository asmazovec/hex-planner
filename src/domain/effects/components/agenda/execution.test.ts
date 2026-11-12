import { describe, expect, test } from 'vitest';
import { adjust, bench, effect, endOf, quote } from '../kit';
import { id } from './execution';

describe('agenda:execution Public Execution', () => {
  // "The elected player discards all of their action cards."
  // Checks: the agenda is a hint, shown with no step: the agenda phase has none.
  // Why nothing is validated: the action cards discarded and the speaker token passed are entered by the player
  // (spends, the speaker of Politics); the vote it forbids is not counted.
  test('agenda:execution is a hint: nothing is counted or validated', () => {
    const { pack } = bench({ faction: 'sol' });
    quote(pack, id, "The elected player discards all of their action cards.");
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toBeUndefined();
    expect(effect(pack, id).waive).toBeUndefined();
  });

  // LRR 7.8: "When resolving a directive, players resolve the outcome that received the most votes and discard the agenda card."
  // Checks: the directive gained leaves nothing in play.
  test('agenda:execution gained is a directive: nothing stays in play', () => {
    const table = bench({ faction: 'sol', entries: [{ ...adjust({}, 'agenda'), gains: [id] }] });
    expect(endOf(table).laws ?? []).not.toContain(id);
  });
});
