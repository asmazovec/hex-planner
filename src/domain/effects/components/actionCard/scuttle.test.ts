import { describe, expect, test } from 'vitest';
import type { AnyWarningCode, Entry } from '../../../types';
import { bench, componentAction, effect, endOf, expectStanding, HOME, NEAR, quote, warningsOf } from '../kit';
import { id } from './scuttle';

/** A carrier, two cruisers and two fighters at home, Scuttle in hand. */
const table = (entries: Entry[]) => bench({
  faction: 'sol', expansions: ['pok'], start: { hand: [id] }, units: { [HOME]: { carrier: 1, cruiser: 2, fighter: 2 } }, entries,
});
const scuttle = (choices: Record<string, number>) => componentAction(id, { choices });

describe('actionCard:scuttle Scuttle', () => {
  // "Choose 1 or 2 of your non-fighter ships on the game board and return them to your reinforcements. Gain trade goods
  //  equal to the combined cost of those ships."
  // Checks: a carrier (cost 3) and a cruiser (cost 2) leave the home system and I gain 5 trade goods.
  // Why the check is redundant here: nothing is lifted; the card changes the board and the trade goods, which the
  // replay must do itself.
  test.fails('actionCard:scuttle returns a carrier and a cruiser and gains their combined cost in trade goods', () => {
    const without = endOf(table([])).tradeGoods;
    const scuttled = table([scuttle({ [`carrier@${HOME}`]: 1, [`cruiser@${HOME}`]: 1 })]);
    quote(scuttled.pack, id, 'Gain trade goods equal to the combined cost of those ships.');
    const end = endOf(scuttled);
    expect(end.systems[HOME]).toEqual({ cruiser: 1, fighter: 2 });
    expect(end.tradeGoods).toBe(without + 5);
  });

  // "... of your non-fighter ships on the game board ..."
  // Checks: a cruiser chosen where none stands is reported missing and gives no trade goods.
  // Why the check is NOT redundant here: only ships on the board are returned, and only those are paid for.
  test.fails('actionCard:scuttle a ship chosen where there is none is missing and gives nothing', () => {
    const without = endOf(table([])).tradeGoods;
    const entry = scuttle({ [`cruiser@${NEAR}`]: 1 });
    const scuttled = table([entry]);
    expectStanding(warningsOf(scuttled, entry), 'unitsMissing');
    expect(endOf(scuttled).tradeGoods).toBe(without);
  });

  // "Choose 1 or 2 ..."
  // Checks: three ships are beyond the card's limit and warned of (a new code).
  // Why the check is NOT redundant here: the card names at most two ships.
  test.fails('actionCard:scuttle three ships are more than the card allows: warned', () => {
    const entry = scuttle({ [`carrier@${HOME}`]: 1, [`cruiser@${HOME}`]: 2 });
    expectStanding(warningsOf(table([entry]), entry), 'choiceOverLimit' as AnyWarningCode);
  });

  // Checks: the card only held changes nothing.
  // Why the check is NOT redundant here: the card is an ACTION; until it is played the ships stay.
  test('actionCard:scuttle held but not played changes nothing', () => {
    expect(endOf(table([])).systems[HOME]).toEqual({ carrier: 1, cruiser: 2, fighter: 2 });
  });

  test.todo('actionCard:scuttle a fighter chosen is no non-fighter ship: pass 2 decides between a warning and ignoring it');

  test.fails('actionCard:scuttle is a play effect', () => {
    const { pack } = table([]);
    expect(effect(pack, id).tier).toBe('play');
  });
});
