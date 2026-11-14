import { describe, expect, test } from 'vitest';
import type { AnyWarningCode } from '../../../types';
import type { Entry } from '../../../../testing/old/domain/types';
import { bench, effect, expectNone, planned, quote, statusTokens, warningsOf } from '../kit';
import { id } from './pe';

describe('secretObjective:pe Prove Endurance', () => {
  // "Be the last player to pass during a game round."
  // Checks: the card is a hint of the round's flow.
  // Why nothing is validated: who passes last depends on the other players' turns, which the plan holds only where the
  // player guessed them; it is scored when its owner passes (objectives notes, Prove Endurance 1).
  test('secretObjective:pe is a hint of the round step', () => {
    const { pack } = bench({ faction: 'sol', expansions: ['pok'] });
    quote(pack, id, 'Be the last player to pass during a game round.');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['round']);
  });

  // LRR 61.5: "If a player fulfills the requirement described on an objective card, they can score that objective".
  // Checks: scoring it after my pass is never warned of as unmet.
  // Why the check is NOT made here: the plan cannot tell whether the others passed before me.
  test('secretObjective:pe scoring it makes no warning of an unmet requirement', () => {
    const scored = { ...statusTokens(0, 0, 0), scored: [id] } as Entry;
    const table = bench({ faction: 'sol', expansions: ['pok'], start: { secrets: [id] }, entries: [planned({ type: 'pass' }), scored] });
    expectNone(warningsOf(table, scored), 'objectiveUnmet' as AnyWarningCode);
  });
});
