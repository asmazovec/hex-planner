import { describe, test } from 'vitest';
import type { AnyWarningCode } from '../../../types';
import type { Entry } from '../../../../testing/old/domain/types';
import { bench, expectNone, expectStanding, quote, statusTokens, warningsOf } from '../kit';
import { id } from './pem';

/** The check pass 2 adds for every objective (LRR 61.5): an objective scored whose requirement the board does not meet. */
const UNMET = 'objectiveUnmet' as AnyWarningCode;

const score = (): Entry => ({ ...statusTokens(0, 0, 0), scored: [id] } as Entry);

/**
 * My space docks stand where `docks` says. A dock's Production is its planet's resources plus 2 (79.1): Home One 3 + 2,
 * Home Two 1 + 2, Target One 2 + 2. I control Target One as well as my home.
 */
const table = (docks: string[]) => {
  const entry = score();
  return {
    entry,
    ...bench({ faction: 'sol', expansions: ['pok'], start: { secrets: [id] }, entries: [entry], game: { planetControl: { t1: 'me' }, docks } }),
  };
};

describe('secretObjective:pem Produce en Masse', () => {
  // "Have units with a combined PRODUCTION value of at least 8 in a single system."
  // Checks: docks on Home One (5) and Home Two (3), both in the home system, make 8; scoring is not warned of.
  // Why the check is redundant here: the requirement is met in one system.
  test('secretObjective:pem two docks of 5 and 3 in one system score it without a warning', () => {
    const met = table(['h1', 'h2']);
    quote(met.pack, id, 'Have units with a combined PRODUCTION value of at least 8 in a single system.');
    expectNone(warningsOf(met, met.entry), UNMET);
  });

  // LRR 61.5: "If a player fulfills the requirement described on an objective card, they can score that objective".
  // Checks: one dock of 5; scoring is warned of.
  // Why the check is NOT redundant here: the Production in the system is short of 8.
  test('secretObjective:pem one dock of 5: scoring it is warned of', () => {
    const short = table(['h1']);
    expectStanding(warningsOf(short, short.entry), UNMET);
  });

  // "... in a single system."
  // Checks: docks of 5 (home) and 4 (target) make 9 in all but not in one system; scoring is warned of.
  // Why the check is NOT redundant here: the card counts one system, not the whole board.
  test('secretObjective:pem Production spread over two systems does not count', () => {
    const spread = table(['h1', 't1']);
    expectStanding(warningsOf(spread, spread.entry), UNMET);
  });
});
