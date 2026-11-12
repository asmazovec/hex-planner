import { describe, expect, test } from 'vitest';
import type { Entry, ExtensionCode, Game, Opponent } from '../../../types';
import { bench, componentAction, effect, endOf, expectNone, expectStanding, HOME, quote, tactical, warningsOf } from '../kit';
import { id } from './uprising';

/** The code pass 2 adds for a played card whose own condition is not met (see the report of batch 21). */
const PLAY_CONDITION = 'playCondition' as ExtensionCode;
const RIVAL: Opponent = { id: 'o1', faction: 'hacan', vp: 0, seat: 2, color: 2 };

/** The Hacan hold Target One (2 resources) unless `game` says otherwise; Uprising names a planet. */
const uprising = (planetId: string) => componentAction(id, { choices: { planetId } });
const table = (entries: Entry[], game: Partial<Game> = { planetControl: { t1: 'enemy' }, planetOwner: { t1: RIVAL.id } }) =>
  bench({ faction: 'sol', start: { hand: [id] }, entries, game: { opponents: [RIVAL], ...game } });

describe('actionCard:uprising Uprising', () => {
  // "ACTION: Exhaust 1 non-home planet controlled by another player. Then gain trade goods equal to its resource value."
  // Checks: Target One of the Hacan is exhausted and I gain two trade goods.
  // Why the check is redundant here: nothing is lifted; the card exhausts another player's planet and gives me trade
  // goods outside a transaction, both of which the count must know.
  test('actionCard:uprising exhausts another player\'s planet and gains its resources as trade goods', () => {
    const play = uprising('t1');
    const card = table([play]);
    quote(card.pack, id, 'Exhaust 1 non-home planet controlled by another player. Then gain trade goods equal to its resource value.');
    const end = endOf(card);
    expect(end.rivals?.[RIVAL.id].exhausted).toContain('t1');
    expect(end.tradeGoods).toBe(2);
    expectNone(warningsOf(card, play), PLAY_CONDITION);
  });

  // "Exhaust 1 non-home planet ..."
  // Checks: a planet of a home system, though held by the Hacan, is warned of.
  // Why the check is NOT redundant here: the card names non-home planets only.
  test('actionCard:uprising on a planet of a home system is warned of', () => {
    const play = uprising('h1');
    expectStanding(warningsOf(table([play], { planetControl: { h1: 'enemy' }, planetOwner: { h1: RIVAL.id } }), play), PLAY_CONDITION);
  });

  // "... controlled by another player."
  // Checks: my own planet named is warned of.
  // Why the check is NOT redundant here: the card names other players' planets only.
  test('actionCard:uprising on my own planet is warned of', () => {
    const play = uprising('t1');
    expectStanding(warningsOf(table([play], { planetControl: { t1: 'me' } }), play), PLAY_CONDITION);
  });

  // Note 2 of the card: "Uprising cannot target an exhausted planet."
  // Checks: the Hacan spent Target One earlier; naming it is warned of.
  // Why the check is NOT redundant here: an exhausted planet cannot be exhausted again for its trade goods.
  test('actionCard:uprising on an exhausted planet is warned of', () => {
    const spend = tactical(HOME, { payment: { planets: ['t1'], tradeGoods: 0 } }, { owner: RIVAL.id });
    const play = uprising('t1');
    expectStanding(warningsOf(table([spend, play]), play), PLAY_CONDITION);
  });

  test('actionCard:uprising is a play effect', () => {
    expect(effect(table([]).pack, id).tier).toBe('play');
  });
});
