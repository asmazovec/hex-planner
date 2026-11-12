import { describe, expect, test } from 'vitest';
import { bench, effect, endOf, HOME, NEAR, quote, tactical } from '../kit';
import { id } from './urf1';

describe('exploration:urf1 Unknown Relic Fragment', () => {
  // "The card counts as a relic fragment of any type."
  // Checks: the card is a reminder with no step of its own.
  // Why nothing is validated: the plan keeps no relic fragments (35.9 puts them in the play area, the holdings keep no
  // exploration card), so there is no count of fragments the card could stand in.
  test('exploration:urf1 is a hint with no step', () => {
    const { pack } = bench({ faction: 'sol', expansions: ['pok'] });
    quote(pack, id, 'counts as a relic fragment of any type');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toBeUndefined();
  });

  // LRR 35.9: "If a player resolves an exploration card that has "relic fragment" in the title, they place that card
  //  faceup in their play area."
  // Checks: gaining the fragment leaves the holdings as they were.
  // Why nothing is automated: an exploration card is not held by the plan, so there is nothing to count it against.
  test('exploration:urf1 gained, it is not among the holdings', () => {
    const move = { ...tactical(NEAR, { moves: [{ from: HOME, units: { carrier: 1 } }] }), gains: [id] };
    const table = bench({ faction: 'sol', expansions: ['pok'], units: { [HOME]: { carrier: 1 } }, entries: [move] });
    const { holdings } = endOf(table);
    expect([...holdings.relics, ...holdings.hand, ...holdings.promissory]).not.toContain(id);
  });
});
