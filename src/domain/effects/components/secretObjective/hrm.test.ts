import { describe, test } from 'vitest';
import type { AnyWarningCode } from '../../../types';
import type { Entry } from '../../../../testing/old/domain/types';
import { adjust, bench, expectNone, expectStanding, quote, statusTokens, warningsOf } from '../kit';
import { id } from './hrm';

/** The check pass 2 adds for every objective (LRR 61.5): an objective scored whose requirement the board does not meet. */
const UNMET = 'objectiveUnmet' as AnyWarningCode;

/** The status entry that scores the objective. */
const score = (): Entry => ({ ...statusTokens(0, 0, 0), scored: [id] } as Entry);

/**
 * I control my home planets (h1 3, h2 1) and Target One, whose resources the test sets: 4 + `t1` in all. The secret is
 * in my hand.
 */
const table = (t1: number, before: Entry[] = []) => {
  const entry = score();
  return {
    entry,
    ...bench({
      faction: 'sol', expansions: ['pok'], start: { secrets: [id] }, entries: [...before, entry], game: { planetControl: { t1: 'me' } },
      edit: pack => { pack.planets.t1 = { ...pack.planets.t1, resources: t1 }; },
    }),
  };
};

describe('secretObjective:hrm Hoard Raw Materials', () => {
  // "Control planets that have a combined resource value of at least 12."
  // Checks: three planets of 3 + 1 + 8 resources make twelve; scoring is not warned of.
  // Why the check is redundant here: the requirement is met, so LRR 61.5 lets the player score it.
  test('secretObjective:hrm planets of twelve resources score it without a warning', () => {
    const met = table(8);
    quote(met.pack, id, 'Control planets that have a combined resource value of at least 12.');
    expectNone(warningsOf(met, met.entry), UNMET);
  });

  // LRR 61.5: "If a player fulfills the requirement described on an objective card, they can score that objective".
  // Checks: eleven resources controlled; scoring it is warned of, and the plan still scores it.
  // Why the check is NOT redundant here: the requirement is short by one resource.
  test('secretObjective:hrm eleven resources: scoring it is warned of', () => {
    const short = table(7);
    expectStanding(warningsOf(short, short.entry), UNMET);
  });

  // "... a combined resource value ..." — the value of the planets, not what the player could spend.
  // Checks: ten trade goods beside eleven resources do not meet it.
  // Why the check is NOT redundant here: trade goods are spent as resources but are not the resource value of a planet.
  test('secretObjective:hrm trade goods do not count toward the resource value', () => {
    const rich = table(7, [adjust({ tradeGoods: 10 })]);
    expectStanding(warningsOf(rich, rich.entry), UNMET);
  });
});
