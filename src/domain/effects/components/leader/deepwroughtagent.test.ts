import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './deepwroughtagent';

describe('leader:deepwroughtagent Doctor Carrina', () => {
  // "When another player researches a technology: You may exhaust this card to allow that player to ignore 1
  //  prerequisite"
  // Checks: the agent is a reminder of the strategy card's block, where research is entered.
  // Why the check is NOT redundant here: there is no check to lift: the plan does not check prerequisites (the
  // Technology card warns only of a technology already owned and of too many researched), and the infantry it places
  // into coexistence has no place in the count. A rival's research is their own entry, in which my agent is not asked.
  test('leader:deepwroughtagent is a hint at the card: prerequisites are not checked', () => {
    const { pack } = bench({ faction: 'deepwrought', expansions: ['pok', 'te'] });
    quote(pack, id, 'allow that player to ignore 1 prerequisite');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['card']);
  });
});
