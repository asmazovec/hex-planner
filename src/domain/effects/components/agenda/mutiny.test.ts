import { describe, expect, test } from 'vitest';
import { adjust, bench, effect, endOf, quote } from '../kit';
import { id } from './mutiny';

describe('agenda:mutiny Mutiny', () => {
  // "Each player that voted "For" gains 1 victory point."
  // Checks: the agenda is a hint, shown with no step: the agenda phase has none.
  // Why nothing is validated: the victory points depend on the votes cast, which the plan does not count; the player
  // enters the point by hand.
  test('agenda:mutiny is a hint: nothing is counted or validated', () => {
    const { pack } = bench({ faction: 'sol' });
    quote(pack, id, "Each player that voted \"For\" gains 1 victory point.");
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toBeUndefined();
    expect(effect(pack, id).waive).toBeUndefined();
  });

  // LRR 7.8: "When resolving a directive, players resolve the outcome that received the most votes and discard the agenda card."
  // Checks: the directive gained leaves nothing in play.
  test('agenda:mutiny gained is a directive: nothing stays in play', () => {
    const table = bench({ faction: 'sol', entries: [{ ...adjust({}, 'agenda'), gains: [id] }] });
    expect(endOf(table).laws ?? []).not.toContain(id);
  });
});
