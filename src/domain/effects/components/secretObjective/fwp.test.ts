import { describe, expect, test } from 'vitest';
import type { AnyWarningCode, Entry } from '../../../types';
import { bench, effect, expectNone, quote, statusTokens, warningsOf } from '../kit';
import { id } from './fwp';

describe('secretObjective:fwp Fight with Precision', () => {
  // "Destroy the last of a player's fighters in the active system during the anti-fighter barrage step."
  // Checks: the card is a hint in the combat block.
  // Why nothing is validated: the requirement is met by anti-fighter barrage dice, and the plan simulates no combat; it
  // is scored in the Anti-Fighter Barrage step (objectives notes, Fight with Precision 2), so it is shown there.
  test('secretObjective:fwp is a hint of the combat step', () => {
    const { pack } = bench({ faction: 'sol', expansions: ['pok'] });
    quote(pack, id, 'during the anti-fighter barrage step');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['combat']);
  });

  // LRR 61.5: "If a player fulfills the requirement described on an objective card, they can score that objective".
  // Checks: scoring it is never warned of as unmet, whatever the board.
  // Why the check is NOT made here: whether a fighter fell to a barrage is a die roll the plan does not know.
  test('secretObjective:fwp scoring it makes no warning of an unmet requirement', () => {
    const entry = { ...statusTokens(0, 0, 0), scored: [id] } as Entry;
    const table = bench({ faction: 'sol', expansions: ['pok'], start: { secrets: [id] }, entries: [entry] });
    expectNone(warningsOf(table, entry), 'objectiveUnmet' as AnyWarningCode);
  });
});
