import { describe, expect, test } from 'vitest';
import { CARD } from '../../../strategy';
import type { Entry, ExtensionCode, Opponent } from '../../../types';
import { bench, effect, endOf, expectStanding, NEAR, planned, quote, tactical, TARGET, using, warningsOf } from '../kit';
import { id } from './salvage';

/** The code pass 2 adds for a played card whose own condition is not met (see the report of batch 21). */
const PLAY_CONDITION = 'playCondition' as ExtensionCode;
const RIVAL: Opponent = { id: 'o1', faction: 'hacan', vp: 0, seat: 2, color: 2 };

/** The Hacan replenish their commodities to 6 by the secondary of Trade, then my two cruisers attack their cruiser in the target. */
const replenish = () => planned({ type: 'secondary', card: CARD.trade, effects: {} }, 'action', { owner: RIVAL.id });
const attack = () => tactical(TARGET, { moves: [{ from: NEAR, units: { cruiser: 2 } }], losses: {} });
const table = (entries: Entry[], enemy = true) => bench({
  faction: 'sol', units: { [NEAR]: { cruiser: 2 } }, start: { hand: [id] }, entries,
  game: { opponents: [RIVAL], enemyUnits: enemy ? { [TARGET]: { [RIVAL.id]: { cruiser: 1 } } } : {} },
});

describe('actionCard:salvage Salvage', () => {
  // "After you win a space combat: Your opponent gives you all of their commodities."
  // LRR 21.6: "Any game effect that instructs a player to give a commodity to another player causes that commodity to
  //  be converted into a trade good."
  // Checks: Salvage used with my tactical action against the Hacan takes their six commodities; they reach me as trade
  // goods, and the Hacan have none left.
  // Why the check is redundant here: no check is lifted; the card moves goods outside a transaction (94), which the
  // plan otherwise counts only in a transaction's act.
  test('actionCard:salvage used in a won battle turns all the opponent\'s commodities into my trade goods', () => {
    const move = using(attack(), id);
    const salvage = table([replenish(), move]);
    quote(salvage.pack, id, 'Your opponent gives you all of their commodities.');
    const end = endOf(salvage);
    expect(end.tradeGoods).toBe(6);
    expect(end.commodities).toBe(0);
    expect(end.rivals?.[RIVAL.id].commodities).toBe(0);
  });

  // Checks: without Salvage the same battle moves no goods: the Hacan keep their six commodities.
  // Why the check is NOT redundant here: the card was not played; commodities move only in transactions.
  test('actionCard:salvage not used, the opponent keeps their commodities', () => {
    const salvage = table([replenish(), attack()]);
    const end = endOf(salvage);
    expect(end.tradeGoods).toBe(0);
    expect(end.rivals?.[RIVAL.id].commodities).toBe(6);
  });

  // "After you win a space combat: ..."
  // Checks: used in an action with no other player's ships in the active system, there is no battle to win: the card's
  // own condition is warned of.
  // Why the check is NOT redundant here: the window of the card is a won space combat, and there was none.
  test('actionCard:salvage used without a battle in the active system is warned of', () => {
    const move = using(attack(), id);
    expectStanding(warningsOf(table([replenish(), move], false), move), PLAY_CONDITION);
  });

  // LRR 2.7 with 21.6: an action card played is discarded.
  // Checks: the card leaves my hand when it is used, as the replay already plays a used action card.
  test('actionCard:salvage used leaves my hand', () => {
    const move = using(attack(), id);
    expect(endOf(table([replenish(), move])).holdings.hand).not.toContain(id);
  });

  test.todo('actionCard:salvage played as the defender who wins: an entry of mine in another player\'s action is not modelled');

  test('actionCard:salvage is a play effect', () => {
    expect(effect(table([]).pack, id).tier).toBe('play');
  });
});
