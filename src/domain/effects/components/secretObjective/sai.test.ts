import { describe, test } from 'vitest';
import type { AnyWarningCode, Entry, Game } from '../../../types';
import { bench, expectNone, expectStanding, quote, statusTokens, warningsOf } from '../kit';
import { id } from './sai';

/** The check pass 2 adds for every objective (LRR 61.5): an objective scored whose requirement the board does not meet. */
const UNMET = 'objectiveUnmet' as AnyWarningCode;

const score = (): Entry => ({ ...statusTokens(0, 0, 0), scored: [id] } as Entry);

const RIVAL = { id: 'o1', faction: 'rules-rival', vp: 0, seat: 2, color: 2 };

/** Target One is a legendary planet on this board; who controls it is set by the test. */
const table = (game: Partial<Game>) => {
  const entry = score();
  return {
    entry,
    ...bench({
      faction: 'sol', expansions: ['pok'], start: { secrets: [id] }, entries: [entry], game,
      edit: pack => {
        pack.planets.t1 = { ...pack.planets.t1, legendary: 'Test Icon' };
        pack.factions['rules-rival'] = { id: 'rules-rival', name: 'Rules Rival', homeTile: 'r-empty', startUnits: {}, startingTech: [], commodities: 3, abilities: [] };
      },
    }),
  };
};

describe('secretObjective:sai Seize an Icon', () => {
  // "Control a legendary planet."
  // Checks: I control the legendary Target One; scoring is not warned of.
  // Why the check is redundant here: the requirement is met.
  test('secretObjective:sai a legendary planet controlled scores it without a warning', () => {
    const met = table({ planetControl: { t1: 'me' } });
    quote(met.pack, id, 'Control a legendary planet.');
    expectNone(warningsOf(met, met.entry), UNMET);
  });

  // LRR 61.5: "If a player fulfills the requirement described on an objective card, they can score that objective".
  // Checks: I control only my home planets, none legendary; scoring is warned of.
  // Why the check is NOT redundant here: no legendary planet of mine.
  test('secretObjective:sai no legendary planet: scoring it is warned of', () => {
    const none = table({});
    expectStanding(warningsOf(none, none.entry), UNMET);
  });

  // Checks: the legendary planet is the rival's; scoring is warned of.
  // Why the check is NOT redundant here: the card asks the scorer to control it, not to have it on the board.
  test('secretObjective:sai a legendary planet another player controls does not count', () => {
    const theirs = table({ opponents: [RIVAL], planetControl: { t1: 'enemy' }, planetOwner: { t1: 'o1' } });
    expectStanding(warningsOf(theirs, theirs.entry), UNMET);
  });
});
