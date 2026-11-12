import { describe, expect, test } from 'vitest';
import type { Entry } from '../../../types';
import { adjust, bench, effect, endOf, expectStanding, NEAR, quote, TARGET, tactical, warningsOf, type Bench } from '../kit';
import { id } from './fb1';

const CARD_DRAWN = 'actionCard:sabo1';
/** A carrier from the next system lands one infantry on Target One and gains it; the card explored is in its gains. */
const landing = (gains: string[] = []) => tactical(TARGET, {
  moves: [{ from: NEAR, units: { carrier: 1, infantry: 1 } }], landings: [{ planetId: 't1', units: { infantry: 1 } }],
}, gains.length > 0 ? { gains } : {});
/** The wanted shape (pass 2): what the player chose for the card, in the entry's `choices` under the card's id. */
const choosing = (entry: Entry, choice: 'gain' | 'draw-tradeGood' | 'draw-commodity'): Entry => ({ ...entry, choices: { [id]: choice } } as Entry);
const table = (entries: Entry[]): Bench => bench({ faction: 'letnev', expansions: ['pok'], units: { [NEAR]: { carrier: 1, infantry: 1 } }, entries });

describe('exploration:fb1 Functioning Base', () => {
  // "You may gain 1 commodity"
  // Checks: the card explored with Target One gives one commodity.
  // Why the check is redundant here: nothing is lifted; the plan counts the commodities, so the one gained must be counted.
  test.fails('exploration:fb1 gains one commodity', () => {
    const base = table([choosing(landing([id]), 'gain')]);
    quote(base.pack, id, 'You may gain 1 commodity');
    expect(endOf(base).commodities).toBe(1);
  });

  // "... or you may spend 1 trade good or 1 commodity to draw 1 action card."
  // Checks: with one trade good the player spends it and the action card drawn is in hand.
  // Why the check is redundant here: nothing is lifted; the trade good spent must leave the count.
  test.fails('exploration:fb1 spends a trade good to draw an action card', () => {
    const base = table([adjust({ tradeGoods: 1 }), choosing(landing([id, CARD_DRAWN]), 'draw-tradeGood')]);
    expect(endOf(base).tradeGoods).toBe(0);
    expect(endOf(base).holdings.hand).toContain(CARD_DRAWN);
  });

  // LRR 26 / 93: a player spends only the trade goods they have.
  // Checks: with no trade good the draw is warned of; the card is drawn all the same, as the plan forbids nothing.
  // Why the check is NOT redundant here: the card asks for a trade good spent, and there is none.
  test.fails('exploration:fb1 drawing with no trade good is warned of', () => {
    const entry = choosing(landing([id, CARD_DRAWN]), 'draw-tradeGood');
    expectStanding(warningsOf(table([entry]), entry), 'shortTradeGoods');
  });

  // Checks: the action card drawn reaches the hand through the gains, as any card drawn does.
  // Why nothing is validated here: which card is drawn only the player knows.
  test('exploration:fb1 the action card drawn is entered in the gains and held', () => {
    expect(endOf(table([landing([id, CARD_DRAWN])])).holdings.hand).toContain(CARD_DRAWN);
  });

  test.fails('exploration:fb1 is a played effect', () => {
    expect(effect(table([]).pack, id).tier).toBe('play');
  });
});
