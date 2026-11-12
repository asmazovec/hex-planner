import { describe, expect, test } from 'vitest';
import type { ExtensionCode, Opponent } from '../../../types';
import { bench, componentAction, effect, endOf, expectNone, expectStanding, quote, warningsOf } from '../kit';
import { id } from './unstable';

/** The code pass 2 adds for a played card whose own condition is not met (see the report of batch 21). */
const PLAY_CONDITION = 'playCondition' as ExtensionCode;
const RIVAL: Opponent = { id: 'o1', faction: 'hacan', vp: 0, seat: 2, color: 2 };

/** Target One is made hazardous; the Hacan hold it with `infantry` infantry. Unstable Planet names a planet. */
const unstable = (planetId: string) => componentAction(id, { choices: { planetId } });
const table = (play: ReturnType<typeof unstable>, infantry = 5) => bench({
  faction: 'sol', start: { hand: [id] }, entries: [play],
  edit: pack => { pack.planets.t1 = { ...pack.planets.t1, traits: ['hazardous'] }; },
  game: { opponents: [RIVAL], planetControl: { t1: 'enemy', t2: 'enemy' }, planetOwner: { t1: RIVAL.id, t2: RIVAL.id }, enemyGround: { t1: { [RIVAL.id]: { infantry } } } },
});

describe('actionCard:unstable Unstable Planet', () => {
  // "ACTION: Choose 1 hazardous planet. Exhaust that planet and destroy up to 3 infantry on it."
  // Checks: the Hacan planet is exhausted and three of their five infantry there are destroyed.
  // Why the check is redundant here: nothing is lifted; the card exhausts and destroys outside combat, which the count
  // must know for the Hacan's spending and for a later invasion.
  test('actionCard:unstable exhausts the hazardous planet and destroys three infantry on it', () => {
    const play = unstable('t1');
    const card = table(play);
    quote(card.pack, id, 'Exhaust that planet and destroy up to 3 infantry on it.');
    const rival = endOf(card).rivals?.[RIVAL.id];
    expect(rival?.exhausted).toContain('t1');
    expect(rival?.ground.t1).toEqual({ infantry: 2 });
    expectNone(warningsOf(card, play), PLAY_CONDITION);
  });

  // "... destroy up to 3 infantry on it." Note 2 of the card: with three or fewer, all are destroyed.
  // Checks: two infantry are both destroyed, and nothing is reported missing.
  test('actionCard:unstable with fewer than three infantry destroys them all', () => {
    const play = unstable('t1');
    const card = table(play, 2);
    expect(endOf(card).rivals?.[RIVAL.id].ground.t1?.infantry ?? 0).toBe(0);
    expectNone(warningsOf(card, play), 'unitsMissing');
  });

  // "Choose 1 hazardous planet."
  // Checks: Target Two, which is not hazardous, is warned of.
  // Why the check is NOT redundant here: the card names hazardous planets only.
  test('actionCard:unstable on a planet that is not hazardous is warned of', () => {
    const play = unstable('t2');
    expectStanding(warningsOf(table(play), play), PLAY_CONDITION);
  });

  test('actionCard:unstable is a play effect', () => {
    expect(effect(table(unstable('t1')).pack, id).tier).toBe('play');
  });
});
