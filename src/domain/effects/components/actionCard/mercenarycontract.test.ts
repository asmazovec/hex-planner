import { describe, expect, test } from 'vitest';
import type { AnyWarningCode, Entry } from '../../../types';
import { adjust, bench, componentAction, effect, endOf, expectStanding, quote, warningsOf } from '../kit';
import { id } from './mercenarycontract';

const table = (entries: Entry[], tradeGoods = 3) => bench({
  faction: 'sol', expansions: ['te'], start: { hand: [id] }, entries: [adjust({ tradeGoods }), ...entries],
});
const contract = (planet: string) => componentAction(id, { choices: { planet } });

describe('actionCard:mercenarycontract Mercenary Contract', () => {
  // "Spend 2 trade goods to place 2 neutral infantry on any non-home planet that contains no units"
  // Checks: the component action on the empty Target One spends 2 of my 3 trade goods.
  // Why the check is redundant here: nothing is lifted; the card's cost is a payment the replay must take itself.
  test.fails('actionCard:mercenarycontract spends 2 trade goods', () => {
    const paid = table([contract('t1')]);
    quote(paid.pack, id, 'Spend 2 trade goods to place 2 neutral infantry on any non-home planet that contains no units');
    expect(endOf(paid).tradeGoods).toBe(1);
  });

  // "Spend 2 trade goods ..."
  // Checks: with 1 trade good the cost is short and warned of.
  // Why the check is NOT redundant here: the card is paid for; it lifts no cost.
  test.fails('actionCard:mercenarycontract with fewer than 2 trade goods the cost is short', () => {
    const entry = contract('t1');
    expectStanding(warningsOf(table([entry], 1), entry), 'shortTradeGoods');
  });

  // "... on any non-home planet ..."
  // Checks: a home planet is warned of (a new code).
  // Why the check is NOT redundant here: the card excludes home planets.
  test.fails('actionCard:mercenarycontract a home planet is warned of', () => {
    const entry = contract('h1');
    expectStanding(warningsOf(table([entry]), entry), 'playTargetInvalid' as AnyWarningCode);
  });

  // "... that contains no units ..."
  // Checks: a planet with my infantry on it is warned of (a new code).
  // Why the check is NOT redundant here: the card needs an empty planet.
  test.fails('actionCard:mercenarycontract a planet with units on it is warned of', () => {
    const entry = contract('t2');
    const busy = bench({ faction: 'sol', expansions: ['te'], start: { hand: [id] }, entries: [adjust({ tradeGoods: 3 }), adjust({ ground: { t2: { infantry: 1 } } }), entry] });
    expectStanding(warningsOf(busy, entry), 'playTargetInvalid' as AnyWarningCode);
  });

  // Checks: the card only held spends nothing.
  // Why the check is NOT redundant here: the card is an ACTION; until it is played nothing is paid.
  test('actionCard:mercenarycontract held but not played spends nothing', () => {
    expect(endOf(table([])).tradeGoods).toBe(3);
  });

  test.todo('actionCard:mercenarycontract the 2 neutral infantry on the planet: there is no neutral player on the board yet');

  test.fails('actionCard:mercenarycontract is a play effect', () => {
    const { pack } = table([]);
    expect(effect(pack, id).tier).toBe('play');
  });
});
