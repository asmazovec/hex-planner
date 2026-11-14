import { describe, expect, test } from 'vitest';
import { bench, effect, endOf, planned, quote, warningsOf } from '../kit';
import { id } from './dp1';

describe('actionCard:dp1 Diplomatic Pressure', () => {
  // "Choose another player. That player must give you 1 promissory note from their hand."
  // Checks: the card is a hint with no step and lifts nothing.
  // Why nothing is validated here: the other player picks the note (ruling 1), and the votes it is played for are not
  // counted; the note received is entered by hand.
  test('actionCard:dp1 is a hint with no step', () => {
    const { pack } = bench({ faction: 'sol', expansions: ['pok'] });
    quote(pack, id, 'That player must give you 1 promissory note from their hand.');
    expect(effect(pack, id)).toMatchObject({ tier: 'hint', rule: id });
    expect(effect(pack, id).hintAt).toBeUndefined();
  });

  // Ruling 2: "Giving a promissory note because of Diplomatic Pressure is not resolving a transaction."
  // Checks: an agenda-phase entry that discards the card and gains the note received leaves the note in hand with no
  // warning: what already holds for any gain.
  // Why nothing is validated here: the note does not pass through a transaction, so no transaction check (94) is made
  // that the card would have to lift.
  test('actionCard:dp1 the note received is entered as a gain of an agenda entry, with no transaction warning', () => {
    const note = 'promissory:ambuscade';
    const entry = planned({ type: 'adjustment', label: 'Diplomatic Pressure', delta: {} }, 'agenda', { spends: [id], gains: [note] });
    const table = bench({ faction: 'sol', expansions: ['pok'], start: { hand: [id] }, entries: [entry] });
    expect(warningsOf(table, entry)).toEqual([]);
    expect(endOf(table).holdings.hand).not.toContain(id);
    expect(endOf(table).holdings.promissory).toContain(note);
  });
});
