import { describe, expect, test } from 'vitest';
import type { Opponent } from '../../../types';
import { bench, componentAction, effect, endOf, expectStanding, NEAR, quote, secondary, tactical, warningsOf } from '../kit';
import { id } from './dark_pact';

const EMPYREAN: Opponent = { id: 'emp', faction: 'empyrean', vp: 0, seat: 2, color: 2 };
const NOTE = `${id}@emp`;

/** I play Sol (commodity value 4): Trade's secondary fills my commodities, then a turn gives `commodities` to the Empyrean player. */
const deal = (commodities: number, notes: string[] = [NOTE]) => {
  const turn = tactical(NEAR, { acts: [{ kind: 'transaction', with: 'emp', give: { commodities }, get: {} }] });
  const table = bench({ faction: 'sol', expansions: ['pok'], start: { promissory: notes }, entries: [secondary(5), turn], game: { opponents: [EMPYREAN] } });
  return { turn, table };
};

describe('promissory:dark_pact Dark Pact', () => {
  // "When you give a number of commodities to the Empyrean player equal to your maximum commodity value, you each gain
  //  1 trade good."
  // Checks: I give my 4 commodities, all of my commodity value, to the Empyrean player: I end with 1 trade good, and
  // the Empyrean player with the 4 commodities turned to trade goods (21.5) plus 1.
  // Why the default count is not enough here: a transaction (94) moves only what each side gives; the note adds a
  // trade good to each side, which the count must add.
  test.fails('promissory:dark_pact giving all my commodities to the Empyrean player gains each of us 1 trade good', () => {
    const { table } = deal(4);
    quote(table.pack, id, 'When you give a number of commodities to the Empyrean player equal to your maximum commodity value, you each gain 1 trade good.');
    const end = endOf(table);
    expect(end.tradeGoods).toBe(1);
    expect(end.rivals?.emp.tradeGoods).toBe(5);
  });

  // "... equal to your maximum commodity value ..."
  // Checks: three commodities of four gain nothing.
  // Why the default count stands here: the note asks for the whole commodity value.
  test('promissory:dark_pact fewer commodities than my commodity value gain nothing', () => {
    const end = endOf(deal(3).table);
    expect(end.tradeGoods).toBe(0);
    expect(end.rivals?.emp.tradeGoods).toBe(3);
  });

  // LRR 21.5: commodities given in a transaction become the receiver's trade goods; nothing more.
  // Checks: without the note the same transaction gives no trade good to anybody beyond the commodities.
  // Why the default count stands here: the note is not held.
  test('promissory:dark_pact without the note the transaction gains nothing more', () => {
    const end = endOf(deal(4, []).table);
    expect(end.tradeGoods).toBe(0);
    expect(end.rivals?.emp.tradeGoods).toBe(4);
  });

  // "ACTION: Place this card faceup in your play area." LRR 69.2: a player cannot play their own promissory note.
  // Checks: the Empyrean player playing their own Dark Pact is warned of.
  // Why the check is NOT redundant here: the note is for the other players; nothing of the Empyrean lifts 69.2.
  test('promissory:dark_pact played by the Empyrean player themselves is warned of', () => {
    const play = componentAction(`${id}@me`);
    const table = bench({ faction: 'empyrean', expansions: ['pok'], start: { promissory: [`${id}@me`] }, entries: [play] });
    quote(table.pack, id, 'ACTION: Place this card faceup in your play area.');
    expect(effect(table.pack, id)).toBeDefined();
    expectStanding(warningsOf(table, play), 'ownPromissory');
  });

  test.todo('promissory:dark_pact has no effect while in hand and goes back on activating a system with Empyrean units: the holdings do not tell a note played face up from one in hand');
});
