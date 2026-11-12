import { describe, test } from 'vitest';
import type { AnyWarningCode, Entry, UnitCounts } from '../../../types';
import { adjust, bench, expectNone, expectStanding, quote, statusTokens, warningsOf } from '../kit';
import { id } from './mtm';

/** The check pass 2 adds for every objective (LRR 61.5): an objective scored whose requirement the board does not meet. */
const UNMET = 'objectiveUnmet' as AnyWarningCode;

const score = (): Entry => ({ ...statusTokens(0, 0, 0), scored: [id] } as Entry);

/** I control the four planets of the board; my ground forces stand on them as `ground` says, and the secret is in my hand. */
const table = (ground: Record<string, UnitCounts>) => {
  const entry = score();
  return {
    entry,
    ...bench({ faction: 'sol', expansions: ['pok'], start: { secrets: [id] }, entries: [adjust({ ground }), entry], game: { planetControl: { t1: 'me', t2: 'me' } } }),
  };
};

describe('secretObjective:mtm Mechanize the Military', () => {
  // "Have 1 mech on each of 4 planets."
  // Checks: a mech on each of h1, h2, t1 and t2; scoring is not warned of.
  // Why the check is redundant here: the requirement is met, so LRR 61.5 lets the player score it.
  test('secretObjective:mtm a mech on each of four planets scores it without a warning', () => {
    const met = table({ h1: { mech: 1 }, h2: { mech: 1 }, t1: { mech: 1 }, t2: { mech: 1 } });
    quote(met.pack, id, 'Have 1 mech on each of 4 planets.');
    expectNone(warningsOf(met, met.entry), UNMET);
  });

  // LRR 61.5: "If a player fulfills the requirement described on an objective card, they can score that objective".
  // Checks: four mechs, two of them on one planet, stand on three planets only; scoring is warned of.
  // Why the check is NOT redundant here: the card counts planets, not mechs (objectives notes, Mechanize the Military 1:
  // all four mechs "on separate planets").
  test.fails('secretObjective:mtm four mechs on three planets: scoring it is warned of', () => {
    const short = table({ h1: { mech: 2 }, t1: { mech: 1 }, t2: { mech: 1 } });
    expectStanding(warningsOf(short, short.entry), UNMET);
  });

  // "Have 1 mech ..." — only this unit type.
  // Checks: infantry on the fourth planet does not stand in for a mech.
  // Why the check is NOT redundant here: the card names mechs; other ground forces do not count.
  test.fails('secretObjective:mtm infantry does not count as a mech', () => {
    const short = table({ h1: { mech: 1 }, h2: { mech: 1 }, t1: { mech: 1 }, t2: { infantry: 3 } });
    expectStanding(warningsOf(short, short.entry), UNMET);
  });
});
