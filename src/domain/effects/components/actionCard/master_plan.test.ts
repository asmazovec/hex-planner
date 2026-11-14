import { describe, expect, test } from 'vitest';
import type { EntryBody } from '../../../../testing/old/domain/types';
import { bench, effect, endOf, HOME, NEAR, planned, quote, tactical, warningsOf } from '../kit';
import { id } from './master_plan';

describe('actionCard:master_plan Master Plan', () => {
  // "Perform an additional action."
  // Checks: the card is a hint with no step and lifts nothing.
  // Why nothing is validated here: the plan has no turns; two actions in a row are never warned of, so the card has no
  // check to lift.
  test('actionCard:master_plan is a hint with no step', () => {
    const { pack } = bench({ faction: 'sol', expansions: ['pok'] });
    quote(pack, id, 'Perform an additional action.');
    expect(effect(pack, id)).toMatchObject({ tier: 'hint', rule: id });
    expect(effect(pack, id).hintAt).toBeUndefined();
  });

  // Action Phase: "During a player's turn, they perform a single action."
  // Checks: a tactical action that discards the card and a component action right after it make no warning; the card
  // leaves the hand.
  // Why nothing is validated here: the replay checks the order of the round (passed players, the phase), not the
  // number of actions in a turn, so the additional action is already allowed without the card.
  test('actionCard:master_plan the additional action is planned with no warning, as any action is', () => {
    const first = tactical(NEAR, { moves: [{ from: HOME, units: { cruiser: 1 } }] }, { spends: [id] });
    const second = planned({ type: 'component', note: 'the additional action' } as EntryBody, 'action');
    const table = bench({ faction: 'sol', expansions: ['pok'], units: { [HOME]: { cruiser: 1 } }, start: { hand: [id] }, entries: [first, second] });
    expect(warningsOf(table, first)).toEqual([]);
    expect(warningsOf(table, second)).toEqual([]);
    expect(endOf(table).holdings.hand).not.toContain(id);
  });
});
