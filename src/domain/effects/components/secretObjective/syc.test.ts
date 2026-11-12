import { describe, test } from 'vitest';
import type { AnyWarningCode, Entry, Game } from '../../../types';
import { bench, expectNone, expectStanding, quote, statusTokens, warningsOf } from '../kit';
import { id } from './syc';

/** The check pass 2 adds for every objective (LRR 61.5): an objective scored whose requirement the board does not meet. */
const UNMET = 'objectiveUnmet' as AnyWarningCode;

const score = (): Entry => ({ ...statusTokens(0, 0, 0), scored: [id] } as Entry);

const RIVAL = { id: 'o1', faction: 'rules-rival', vp: 0, seat: 2, color: 2 };

/** A rival with no home on the row; who controls Target One and Target Two (one system) is set by the test. */
const table = (control: Game['planetControl']) => {
  const entry = score();
  const owner = Object.fromEntries(Object.entries(control).filter(([, who]) => who === 'enemy').map(([planet]) => [planet, 'o1']));
  return {
    entry,
    ...bench({
      faction: 'sol', expansions: ['pok'], start: { secrets: [id] }, entries: [entry],
      game: { opponents: [RIVAL], planetControl: control, planetOwner: owner },
      edit: pack => {
        pack.factions['rules-rival'] = { id: 'rules-rival', name: 'Rules Rival', homeTile: 'r-empty', startUnits: {}, startingTech: [], commodities: 3, abilities: [] };
      },
    }),
  };
};

describe('secretObjective:syc Stake Your Claim', () => {
  // "Control a planet in a system that contains a planet controlled by another player."
  // Checks: I control Target One and the rival Target Two, in the same system; scoring is not warned of.
  // Why the check is redundant here: the requirement is met.
  test('secretObjective:syc my planet beside a rival planet in one system scores it without a warning', () => {
    const met = table({ t1: 'me', t2: 'enemy' });
    quote(met.pack, id, 'Control a planet in a system that contains a planet controlled by another player.');
    expectNone(warningsOf(met, met.entry), UNMET);
  });

  // LRR 61.5: "If a player fulfills the requirement described on an objective card, they can score that objective".
  // Checks: I control Target One, nobody controls Target Two; scoring is warned of.
  // Why the check is NOT redundant here: no other player controls a planet in that system.
  test.fails('secretObjective:syc a system shared with nobody: scoring it is warned of', () => {
    const alone = table({ t1: 'me' });
    expectStanding(warningsOf(alone, alone.entry), UNMET);
  });

  // "... controlled by another player."
  // Checks: both planets of the target system are mine; scoring is warned of.
  // Why the check is NOT redundant here: my own second planet is not another player's.
  test.fails('secretObjective:syc both planets of the system mine do not count', () => {
    const mine = table({ t1: 'me', t2: 'me' });
    expectStanding(warningsOf(mine, mine.entry), UNMET);
  });

  // Checks: the rival controls Target Two, but my planets are only in my home system; scoring is warned of.
  // Why the check is NOT redundant here: the two planets must be in one system.
  test.fails('secretObjective:syc a rival planet in a system where I control none does not count', () => {
    const apart = table({ t2: 'enemy' });
    expectStanding(warningsOf(apart, apart.entry), UNMET);
  });
});
