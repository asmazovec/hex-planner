import { describe, expect, test } from 'vitest';
import { loadPack } from '../../data/loadPack';
import { COMPONENT_FILES } from '../../domain/effects/registry';
import { createGame } from '../../domain/newGame';
import { setPlayerFaction } from '../../domain/players';
import { holdings } from '../abilities/testBoard';
import { tableOf } from '../fromLegacy';
import { legacyKey } from '../keys';
import { initialBoard } from '../setup';
import { runHooks } from './hooks';

const pack = loadPack(['pok', 'te']);
let game = createGame({ expansions: ['pok', 'te'], playerCount: 3, faction: 'sol' }, pack);
game = setPlayerFaction(game, 1, 'winnu', pack);
const table = tableOf(game);
const start = initialBoard(table, pack);
const key = (player: string): string => legacyKey(table, player);

/** The hook kinds that run on the kernel's own runner: no component file keeps one on the old state. */
const NATIVE_KINDS = ['dealt'] as const;

describe('the native hook runner', () => {
  test('no component file keeps a hook of a native kind on the old state', () => {
    const old = Object.entries(COMPONENT_FILES).flatMap(([path, file]) =>
      NATIVE_KINDS.filter(kind => (file.effect as Record<string, unknown> | undefined)?.[kind] !== undefined).map(kind => `${path}: ${kind}`));
    expect(old).toEqual([]);
  });

  test('Dark Pact: the holder gives commodities to the Empyrean player and each gains a trade good, as events caused by the note', () => {
    const note = `promissory:dark_pact@${key('p2')}`;
    const board = holdings(start, 'p1', { [note]: { state: 'ready', count: 1 } });
    const value = 4;
    const got = runHooks(table, board, pack, 'dealt', ['p1'], { side: 'give', self: 'p1', partner: 'p2', gave: { commodities: value }, got: {} }, { actor: 'p1', step: 'transaction' });
    expect(got.events).toEqual([
      { type: 'TradeGoodsChanged', player: 'p1', delta: 1, cause: { step: 'transaction', component: note } },
      { type: 'TradeGoodsChanged', player: 'p2', delta: 1, cause: { step: 'transaction', component: note } },
    ]);
    expect(got.board.players.p1.tradeGoods).toBe(board.players.p1.tradeGoods + 1);
    expect(got.board.players.p2.tradeGoods).toBe(board.players.p2.tradeGoods + 1);
  });

  test('a hook of a component nobody holds is not asked, and the board is the same object', () => {
    const got = runHooks(table, start, pack, 'dealt', ['p1'], { side: 'give', self: 'p1', partner: 'p2', gave: { commodities: 9 }, got: {} }, { actor: 'p1' });
    expect(got.events).toEqual([]);
    expect(got.board).toBe(start);
  });
});
