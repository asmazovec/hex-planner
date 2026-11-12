import { describe, test } from 'vitest';
import type { AnyWarningCode, Entry, UnitCounts } from '../../../types';
import { adjust, bench, expectNone, expectStanding, quote, statusTokens, warningsOf } from '../kit';
import { id } from './otf';

/** The check pass 2 adds for every objective (LRR 61.5): an objective scored whose requirement the board does not meet. */
const UNMET = 'objectiveUnmet' as AnyWarningCode;

const score = (): Entry => ({ ...statusTokens(0, 0, 0), scored: [id] } as Entry);

/** I control Target One and my home planets, with a space dock on Home One; my ground forces stand as `ground` says. */
const table = (ground: Record<string, UnitCounts>) => {
  const entry = score();
  return {
    entry,
    ...bench({
      faction: 'sol', expansions: ['pok'], start: { secrets: [id] }, entries: [adjust({ ground }), entry],
      game: { planetControl: { t1: 'me' }, docks: ['h1'] },
    }),
  };
};

describe('secretObjective:otf Occupy the Fringe', () => {
  // "Have 9 or more ground forces on a planet that does not contain 1 of your space docks."
  // Checks: eight infantry and a mech on Target One, which has no dock; scoring is not warned of.
  // Why the check is redundant here: nine ground forces of both kinds stand on a planet without a dock of mine.
  test('secretObjective:otf nine ground forces on a planet without a dock score it without a warning', () => {
    const met = table({ t1: { infantry: 8, mech: 1 } });
    quote(met.pack, id, 'Have 9 or more ground forces on a planet that does not contain 1 of your space docks.');
    expectNone(warningsOf(met, met.entry), UNMET);
  });

  // LRR 61.5: "If a player fulfills the requirement described on an objective card, they can score that objective".
  // Checks: eight ground forces on Target One; scoring is warned of.
  // Why the check is NOT redundant here: one ground force short of nine.
  test('secretObjective:otf eight ground forces: scoring it is warned of', () => {
    const short = table({ t1: { infantry: 8 } });
    expectStanding(warningsOf(short, short.entry), UNMET);
  });

  // "... on a planet that does not contain 1 of your space docks."
  // Checks: nine infantry on Home One, where my space dock stands; scoring is warned of.
  // Why the check is NOT redundant here: the planet holds a dock of the player, which the card excludes.
  test('secretObjective:otf nine ground forces on a planet with my space dock do not count', () => {
    const docked = table({ h1: { infantry: 9 } });
    expectStanding(warningsOf(docked, docked.entry), UNMET);
  });

  // Checks: nine ground forces split over two planets do not meet it.
  // Why the check is NOT redundant here: the card asks for nine on one planet.
  test('secretObjective:otf nine ground forces over two planets do not count', () => {
    const split = table({ t1: { infantry: 5 }, h2: { infantry: 4 } });
    expectStanding(warningsOf(split, split.entry), UNMET);
  });
});
