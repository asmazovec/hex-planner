import { describe, expect, test } from 'vitest';
import { adjust, bench, effect, endOf, quote } from '../kit';
import { id } from './abolishment';

describe('agenda:abolishment Judicial Abolishment', () => {
  // "Discard the elected law from play."
  // Checks: the agenda is a hint, shown with no step: the agenda phase has none.
  // Why nothing is validated: the law elected is chosen by the vote; the player enters it as a spend of that law
  // (`spends`), which already takes it out of play (`lose` in src/domain/replay/holdings.ts).
  test('agenda:abolishment is a hint: nothing is counted or validated', () => {
    const { pack } = bench({ faction: 'sol' });
    quote(pack, id, "Discard the elected law from play.");
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toBeUndefined();
  });

  // LRR 7.8: "When resolving a directive, players resolve the outcome that received the most votes and discard the agenda card."
  // Checks: the directive gained leaves nothing in play.
  test('agenda:abolishment gained is a directive: nothing stays in play', () => {
    const table = bench({ faction: 'sol', entries: [{ ...adjust({}, 'agenda'), gains: [id] }] });
    expect(endOf(table).laws ?? []).not.toContain(id);
  });

  // "Discard the elected law from play."
  // Checks: the law discarded is entered as a spend of it, and it leaves play: nothing of this agenda is needed for that.
  // Why nothing is validated here: which law is elected is the vote's; the spend the player enters does the rest.
  test('agenda:abolishment the law elected leaves play when it is entered as spent', () => {
    const shared = 'agenda:shared_research';
    const table = bench({ faction: 'sol', entries: [{ ...adjust({}, 'strategy'), gains: [shared] }, { ...adjust({}, 'agenda'), gains: [id], spends: [shared] }] });
    expect(endOf(table).laws ?? []).not.toContain(shared);
  });
});
