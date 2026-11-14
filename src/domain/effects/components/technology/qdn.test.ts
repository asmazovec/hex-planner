import { describe, expect, test } from 'vitest';
import type { Entry, EntryBody } from '../../../types';
import type { Player } from '../../../players';
import { adjust, bench, effect, endOf, expectStanding, FAR, planned, quote, warningsOf } from '../kit';
import { id } from './qdn';

const RIVAL: Player = { id: 'o1', faction: 'letnev', vp: 0, seat: 2, color: 2 };
/** The node used at the end of the strategy phase, toward the rival. */
const swap = () => planned({ type: 'component', componentId: id, note: '', choices: { player: 'o1' } } as EntryBody, 'strategy');
const table = (entries: Entry[]) =>
  bench({ faction: 'hacan', start: { technologies: [id] }, entries, game: { opponents: [RIVAL], enemyUnits: { [FAR]: { o1: { carrier: 1 } } } } });

describe('technology:qdn Quantum Datahub Node', () => {
  // "At the end of the strategy phase, you may spend 1 token from your strategy pool and give another player 3 of your
  //  trade goods."
  // Checks: the Hacan with 3 trade goods spends a strategy token and the trade goods go to the rival.
  // Why the check is redundant here: trade goods otherwise change hands only in a transaction (94), between
  // neighbours and in the action phase; the card gives them at the end of the strategy phase to any player.
  test('technology:qdn spends a strategy token and gives 3 trade goods to the chosen player', () => {
    const hacan = table([adjust({ tradeGoods: 3 }, 'strategy'), swap()]);
    quote(hacan.pack, id, 'spend 1 token from your strategy pool and give another player 3 of your trade goods');
    const end = endOf(hacan);
    expect(end.strategy).toBe(1);
    expect(end.tradeGoods).toBe(0);
    expect(end.rivals?.o1.tradeGoods).toBe(3);
  });

  // Ruling (Hacan, Quantum Datahub Node 3): "The Hacan player must have three trade goods before they spend the command token."
  // Checks: with 2 trade goods the use is warned of.
  // Why the check is NOT redundant here: the three trade goods are the card's price.
  test('technology:qdn with fewer than 3 trade goods is warned of', () => {
    const use = swap();
    const hacan = table([adjust({ tradeGoods: 2 }, 'strategy'), use]);
    expectStanding(warningsOf(hacan, use), 'shortTradeGoods');
  });

  test.todo('technology:qdn gives one of my strategy cards to that player and takes one of theirs: the other players\' cards are not planned');

  test('technology:qdn is a play effect', () => {
    expect(effect(table([]).pack, id).tier).toBe('play');
  });
});
