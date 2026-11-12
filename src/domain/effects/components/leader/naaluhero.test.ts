import { describe, expect, test } from 'vitest';
import { bench, componentAction, effect, expectStanding, quote, statusTokens, using, warningsOf } from '../kit';
import { id } from './naaluhero';

describe('leader:naaluhero The Oracle', () => {
  // "At the end of the status phase: You may force each other player to give you 1 promissory note from their hand."
  // Checks: the hero is a reminder of the status phase.
  // Why nothing is validated: each other player chooses which note they give, so the plan cannot pick the notes; the
  // player enters what they received.
  test('leader:naaluhero is a hint of the status phase: the notes given are the other players\' choice', () => {
    const { pack } = bench({ faction: 'naalu', expansions: ['pok'] });
    quote(pack, id, 'force each other player to give you 1 promissory note from their hand');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['status']);
  });

  // "If you do, purge this card." LRR 51.12: a hero is purged once its ability is resolved.
  // Checks: named in the `uses` of the status entry, the hero is purged; a later play is warned of as not held.
  // Why the check is NOT redundant here: the hero is spent by its one use.
  test('leader:naaluhero used at the status phase is purged: a later play is not held', () => {
    const status = using(statusTokens(1, 1, 0), id);
    const again = componentAction(id);
    const table = bench({ faction: 'naalu', expansions: ['pok'], start: { leaders: { [id]: 'unlocked' } }, rounds: [[status], [again]] });
    expectStanding(warningsOf(table, again), 'componentNotHeld');
  });
});
