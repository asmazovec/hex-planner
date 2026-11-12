import { describe, expect, test } from 'vitest';
import type { Entry, EntryBody, ExtensionCode } from '../../../types';
import { adjust, bench, effect, expectNone, expectStanding, HOME, NO_PAYMENT, planned, quote, tactical, warningsOf } from '../kit';
import { id } from './monument';

/** Scoring an objective whose requirement is not met: a new code made by the status step (pass 2). */
const CODE = 'objectiveUnmet' as ExtensionCode;
const score = (): Entry => planned({ type: 'statusTokens', tactic: 0, fleet: 0, strategy: 0, scored: [id] } as EntryBody, 'status');
/** The home planets give 3 + 1 resources; the rest must come from trade goods. */
const table = (before: Entry[]) => {
  const scoring = score();
  return { scoring, ...bench({ faction: 'sol', entries: [...before, scoring], game: { docks: ['h1'] } }) };
};

describe('publicObjective:monument Erect a Monument', () => {
  // "Spend 8 resources."
  // Checks: the ready home planets give 4 resources and there are no trade goods: scoring is warned of.
  // Why the check is NOT redundant here: LRR 61.10: "To score such an objective, a player must pay the specified cost".
  test.fails('publicObjective:monument scored with 4 resources at hand is warned of', () => {
    const t = table([]);
    quote(t.pack, id, 'Spend 8 resources.');
    expectStanding(warningsOf(t, t.scoring), CODE);
  });

  // Rulings: "Trade goods may be spent as resources when scoring Erect a Monument."
  // Checks: 4 resources of planets and 4 trade goods make 8: nothing is warned of.
  // Why the check is redundant here: the cost can be paid at the Score Objectives step.
  test('publicObjective:monument scored with 4 resources of planets and 4 trade goods is not warned of', () => {
    const t = table([adjust({ tradeGoods: 4 })]);
    expectNone(warningsOf(t, t.scoring), CODE);
  });

  // Rulings: "The resources must be spent during the status phase." LRR 81.1 comes before the planets are readied (81.6).
  // Checks: Home One was exhausted to pay for a production in the action phase; at scoring only Home Two and the
  // trade goods are at hand (5), so scoring is warned of.
  // Why the check is NOT redundant here: a planet exhausted in the action phase is still exhausted at Score Objectives.
  test.fails('publicObjective:monument a planet exhausted in the action phase cannot pay', () => {
    const build = tactical(HOME, { production: { infantry: 2 }, payment: { ...NO_PAYMENT, planets: ['h1'] } });
    const t = table([adjust({ tradeGoods: 4 }), build]);
    expectStanding(warningsOf(t, t.scoring), CODE);
  });

  test.todo('publicObjective:monument which planets and trade goods pay the 8 resources is the player\'s choice: the status entry has no payment yet, so trade goods spent are not taken');

  // Checks: the objective is played by the status entry that scores it, which checks its requirement.
  test.fails('publicObjective:monument is a play effect of the status entry', () => {
    expect(effect(table([]).pack, id).tier).toBe('play');
  });
});
