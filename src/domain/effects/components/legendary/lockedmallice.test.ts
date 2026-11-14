import { describe, expect, test } from 'vitest';
import type { Entry, EntryBody } from '../../../../testing/old/domain/types';
import { bench, effect, endOf, expectStanding, HOME, planned, primary, quote, using, warningsOf } from '../kit';
import { id } from './lockedmallice';

const PLANET = 'lockedmallice';
const atEnd = (choice?: string): Entry => {
  const turn = using(planned({ type: 'pass' } as EntryBody), id);
  return (choice ? { ...turn, choices: { exterrix: choice } } : turn) as Entry;
};
/** The Federation of Sol, with a Trade primary first (4 commodities, 3 trade goods) and control of the planet when `controlled`. */
const table = (turn: Entry, controlled = true) => bench({
  faction: 'sol', expansions: ['pok'], units: { [HOME]: { carrier: 1 } }, entries: [primary(5), turn],
  game: { planetControl: controlled ? { [PLANET]: 'me' } : {} },
});

describe('legendary:lockedmallice Exterrix Headquarters (Mallice before the nexus flips)', () => {
  // "You may exhaust this card at the end of your turn to gain 2 trade goods or convert all of your commodities to
  //  trade goods."
  // Checks: the first branch gives 2 trade goods.
  // Why this is automated: trade goods are counted by the plan, and the card gives them by itself.
  test('legendary:lockedmallice gives 2 trade goods', () => {
    const mallice = table(atEnd('tradeGoods'));
    quote(mallice.pack, id, 'gain 2 trade goods or convert all of your commodities to trade goods');
    expect(endOf(mallice).tradeGoods).toBe(endOf(table(atEnd())).tradeGoods + 2);
  });

  // "... or convert all of your commodities to trade goods."
  // Checks: the second branch turns every commodity into a trade good (21.4).
  test('legendary:lockedmallice converts every commodity into a trade good', () => {
    const without = endOf(table(atEnd()));
    const end = endOf(table(atEnd('convert')));
    expect(without.commodities).toBeGreaterThan(0);
    expect(end.commodities).toBe(0);
    expect(end.tradeGoods).toBe(without.tradeGoods + without.commodities);
  });

  // Checks: named without a choice, the card changes no count ("may").
  test('legendary:lockedmallice with no choice changes no count', () => {
    const end = endOf(table(atEnd()));
    expect([end.commodities, end.tradeGoods]).toEqual([4, 3]);
  });

  // LRR 53.3: "Players can use the abilities on the legendary planet ability cards in their play area."
  // Checks: without control of Locked Mallice, using the card is warned of.
  // Why the check is NOT redundant here: the card belongs to whoever controls the planet (53.2).
  test('legendary:lockedmallice without control of Locked Mallice its use is warned of', () => {
    const turn = atEnd('tradeGoods');
    expectStanding(warningsOf(table(turn, false), turn), 'componentNotHeld');
  });

  test('legendary:lockedmallice is a play effect', () => {
    const { pack } = table(atEnd());
    expect(effect(pack, id).tier).toBe('play');
  });
});
