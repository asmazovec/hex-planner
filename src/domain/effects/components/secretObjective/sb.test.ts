import { describe, test } from 'vitest';
import type { AnyWarningCode } from '../../../types';
import type { Entry } from '../../../../testing/old/domain/types';
import { bench, expectNone, expectStanding, quote, statusTokens, warningsOf } from '../kit';
import { id } from './sb';

/** The check pass 2 adds for every objective (LRR 61.5): an objective scored whose requirement the board does not meet. */
const UNMET = 'objectiveUnmet' as AnyWarningCode;

const score = (): Entry => ({ ...statusTokens(0, 0, 0), scored: [id] } as Entry);

const RIVAL = { id: 'o1', faction: 'rules-rival', vp: 0, seat: 2, color: 2 };

/** Support for the Throne and Ceasefire, as notes of one player. */
const SFTT = (owner: string) => `promissory:<color>_sftt@${owner}`;
const CEASEFIRE = (owner: string) => `promissory:<color>_cf@${owner}`;

/** I hold the notes given, beside one rival; the secret is in my hand. */
const table = (promissory: string[]) => {
  const entry = score();
  return {
    entry,
    ...bench({
      faction: 'sol', expansions: ['pok'], start: { secrets: [id], promissory }, entries: [entry], game: { opponents: [RIVAL] },
      edit: pack => {
        pack.factions['rules-rival'] = { id: 'rules-rival', name: 'Rules Rival', homeTile: 'r-empty', startUnits: {}, startingTech: [], commodities: 3, abilities: [] };
      },
    }),
  };
};

describe('secretObjective:sb Strengthen Bonds', () => {
  // "Have another player's promissory note in your play area."
  // Checks: the rival's Support for the Throne lies in my play area ("you must place it faceup in your play area");
  // scoring is not warned of.
  // Why the check is redundant here: the requirement is met (objectives notes, Strengthen Bonds 1.2).
  test('secretObjective:sb another player\'s Support for the Throne scores it without a warning', () => {
    const met = table([SFTT('o1')]);
    quote(met.pack, id, "Have another player's promissory note in your play area.");
    expectNone(warningsOf(met, met.entry), UNMET);
  });

  // LRR 61.5: "If a player fulfills the requirement described on an objective card, they can score that objective".
  // Checks: no note of another player held; scoring is warned of.
  // Why the check is NOT redundant here: nothing of another player is in my play area.
  test('secretObjective:sb no note of another player: scoring it is warned of', () => {
    const none = table([]);
    expectStanding(warningsOf(none, none.entry), UNMET);
  });

  // "Have another player's promissory note ..."
  // Checks: my own Support for the Throne, held back, does not count.
  // Why the check is NOT redundant here: the note must be another player's.
  test('secretObjective:sb my own note does not count', () => {
    const own = table([SFTT('me')]);
    expectStanding(warningsOf(own, own.entry), UNMET);
  });

  // "... in your play area."
  // Checks: the rival's Ceasefire is kept in hand until played, then returned; it is not in the play area.
  // Why the check is NOT redundant here: only notes whose text puts them in the play area qualify (objectives notes,
  // Strengthen Bonds 1 lists them).
  test('secretObjective:sb a note of another player kept in hand does not count', () => {
    const hand = table([CEASEFIRE('o1')]);
    expectStanding(warningsOf(hand, hand.entry), UNMET);
  });
});
