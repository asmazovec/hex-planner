import { describe, test } from 'vitest';
import type { AnyWarningCode, Entry } from '../../../types';
import { bench, expectNone, expectStanding, FARTHER, HOME, NEAR, quote, statusTokens, warningsOf } from '../kit';
import { id } from './fc';

/** The check pass 2 adds for every objective (LRR 61.5): an objective scored whose requirement the board does not meet. */
const UNMET = 'objectiveUnmet' as AnyWarningCode;

const score = (): Entry => ({ ...statusTokens(0, 0, 0), scored: [id] } as Entry);

const rival = (n: number) => ({ id: `o${n}`, faction: 'rules-rival', vp: 0, seat: n + 1, color: n + 1 });

/** I am present in my home system; each rival is only where its carrier stands. */
const table = (at: string[]) => {
  const entry = score();
  return {
    entry,
    ...bench({
      faction: 'sol', expansions: ['pok'], start: { secrets: [id] }, entries: [entry],
      game: {
        opponents: at.map((_, i) => rival(i + 1)),
        enemyUnits: Object.fromEntries(at.map((slot, i) => [slot, { [`o${i + 1}`]: { carrier: 1 } }])),
      },
      edit: pack => {
        pack.factions['rules-rival'] = { id: 'rules-rival', name: 'Rules Rival', homeTile: 'r-empty', startUnits: {}, startingTech: [], commodities: 3, abilities: [] };
      },
    }),
  };
};

describe('secretObjective:fc Foster Cohesion', () => {
  // "Be neighbors with all other players."
  // Checks: one rival in my home system, one next to it: both are neighbours (60); scoring is not warned of.
  // Why the check is redundant here: the requirement is met.
  test('secretObjective:fc neighbours with both rivals score it without a warning', () => {
    const met = table([HOME, NEAR]);
    quote(met.pack, id, 'Be neighbors with all other players.');
    expectNone(warningsOf(met, met.entry), UNMET);
  });

  // LRR 61.5: "If a player fulfills the requirement described on an objective card, they can score that objective".
  // Checks: the second rival is four systems away; scoring is warned of.
  // Why the check is NOT redundant here: "all other players" — one of them is not a neighbour.
  test.fails('secretObjective:fc one rival far away: scoring it is warned of', () => {
    const apart = table([NEAR, FARTHER]);
    expectStanding(warningsOf(apart, apart.entry), UNMET);
  });
});
