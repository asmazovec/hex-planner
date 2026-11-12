import { describe, expect, test } from 'vitest';
import { adjust, bench, effect, endOf, quote } from '../kit';
import { id } from './artifact';

describe('agenda:artifact Ixthian Artifact', () => {
  // "The speaker rolls 1 die."
  // Checks: the agenda is a hint, shown with no step: the agenda phase has none.
  // Why nothing is validated: the outcome is a die roll, which the plan does not make; the technologies researched
  // or the units destroyed are entered by the player as research and as changes of units.
  test('agenda:artifact is a hint: nothing is counted or validated', () => {
    const { pack } = bench({ faction: 'sol' });
    quote(pack, id, "The speaker rolls 1 die.");
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toBeUndefined();
    expect(effect(pack, id).waive).toBeUndefined();
  });

  // LRR 7.8: "When resolving a directive, players resolve the outcome that received the most votes and discard the agenda card."
  // Checks: the directive gained leaves nothing in play.
  test('agenda:artifact gained is a directive: nothing stays in play', () => {
    const table = bench({ faction: 'sol', entries: [{ ...adjust({}, 'agenda'), gains: [id] }] });
    expect(endOf(table).laws ?? []).not.toContain(id);
  });
});
