import { describe, expect, test } from 'vitest';
import { bench, componentAction, effect, expectNone, quote, warningsOf } from '../kit';
import { id } from './kelerescommander';

describe('leader:kelerescommander Suffi An', () => {
  // "After you perform a component action: You may perform an additional action."
  // Checks: the commander is a reminder of the component action's block.
  // Why the check is NOT redundant here: there is nothing to waive. The plan lists a player's actions in order and
  // does not split them into turns, so no check says one action per turn (LRR 3); an additional action is entered as
  // the next entry like any other.
  test('leader:kelerescommander is a hint at the component action', () => {
    const { pack } = bench({ faction: 'keleresm', expansions: ['pok'] });
    quote(pack, id, 'After you perform a component action: You may perform an additional action.');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['component']);
  });

  // Checks: two actions entered one after the other, the second right after a component action, make no warning of
  // the round's flow, with or without the commander.
  // Why the check is NOT redundant here: it is not made at all, so the commander has nothing to lift.
  test('leader:kelerescommander an additional action after a component action makes no warning of the flow', () => {
    const first = componentAction('technology:executiveorder');
    const second = componentAction('leader:keleresheroharka');
    const table = bench({ faction: 'letnev', expansions: ['pok', 'te'], entries: [first, second] });
    const warnings = warningsOf(table, second);
    expectNone(warnings, 'actionAfterPass');
    expectNone(warnings, 'actionOutsidePhase');
  });
});
