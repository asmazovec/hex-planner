import { describe, expect, test } from 'vitest';
import type { Entry } from '../../../types';
import { bench, componentAction, effect, endOf, primary, quote } from '../kit';
import { id } from './dynamiscore';

/** Trade (5) replenishes my commodities up to my commodity value (92.3); Sol's printed value is 4. */
const TRADE = 5;
const SOL = 4;
const table = (entries: Entry[], relics = [id]) => bench({ faction: 'sol', expansions: ['pok'], start: { relics }, entries });

describe('relic:dynamiscore Dynamis Core', () => {
  // "While this card is in your play area, your commodity value is increased by 2."
  // Checks: Trade replenishes the commodities of a Sol player holding the relic to 6, not to the printed 4.
  // Why the default limit does not apply: replenishing fills commodities up to the faction's commodity value (21.3);
  // the relic raises that value, so this is a modify of the number and nothing is listed as waived.
  test('relic:dynamiscore raises the commodity value by 2', () => {
    const dynamis = table([primary(TRADE)]);
    quote(dynamis.pack, id, 'your commodity value is increased by 2');
    expect(dynamis.pack.factions.sol.commodities).toBe(SOL);
    expect(endOf(dynamis).commodities).toBe(SOL + 2);
  });

  // LRR 21.3: a player replenishes commodities up to the value on their faction sheet.
  // Checks: without the relic Trade fills to the printed 4.
  // Why the check is NOT redundant here: no component of this player changes the commodity value.
  test('relic:dynamiscore not held, commodities are replenished to the printed value', () => {
    expect(endOf(table([primary(TRADE)], [])).commodities).toBe(SOL);
  });

  // "ACTION: Gain trade goods equal to your commodity value, then purge this card."
  // Checks: the action gives 6 trade goods (the value with the relic itself still in play) and purges the relic.
  // Why it is counted here: a play of the component action; the trade goods are the board's own number.
  test('relic:dynamiscore action gains trade goods equal to the commodity value', () => {
    const end = endOf(table([componentAction(id)]));
    expect(end.tradeGoods).toBe(SOL + 2);
    expect(end.holdings.relics).not.toContain(id);
  });

  // Dynamis Core note 1: "If a player uses the purge ability of Dynamis Core, they will need to return commodities if
  //  they now exceed their original commodity value."
  // Checks: commodities replenished to 6 are cut back to 4 when the relic is purged.
  // Why the check is NOT redundant here: once purged the relic no longer raises the value.
  test('relic:dynamiscore purged, commodities beyond the printed value are returned', () => {
    expect(endOf(table([primary(TRADE), componentAction(id)])).commodities).toBe(SOL);
  });

  // Checks: the relic is no longer a mere reminder. Its point and its action need a passive and a play part, which the
  // contract does not give one effect (see the effect file); the shape is pass 2's choice.
  test('relic:dynamiscore is counted, not only shown', () => {
    expect(effect(table([]).pack, id).tier).not.toBe('hint');
  });
});
