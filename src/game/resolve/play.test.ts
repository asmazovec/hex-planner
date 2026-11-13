import { describe, expect, test } from 'vitest';
import { loadPack } from '../../data/loadPack';
import { COMPONENT_FILES, effectOf } from '../../domain/effects/registry';
import { createGame } from '../../domain/newGame';
import { tableOf } from '../fromLegacy';
import { applyAll } from '../apply';
import { initialBoard } from '../setup';
import { runPlay } from './play';

const pack = loadPack(['pok']);
const game = createGame({ expansions: ['pok'], playerCount: 3, faction: 'sol' }, pack);
const table = tableOf(game);
const start = initialBoard(table, pack);
const [p1, p2] = table.players.map(p => p.id);
const planet = Object.keys(start.planets).find(id => start.planets[id].owner === undefined) ?? Object.keys(start.planets)[0];

describe('the native play of a component', () => {
  test('the files that moved to it keep no old-state play', () => {
    for (const id of ['actionCard:bribery', 'actionCard:cripple']) {
      const file = Object.values(COMPONENT_FILES).find(f => f.id === id)!;
      expect((file.effect as { play?: unknown } | undefined)?.play).toBeUndefined();
      expect(effectOf(pack, id)?.nativePlay).toBeTypeOf('function');
    }
  });

  test('Bribery: the trade goods chosen leave the holder as an event; more than held is told and nothing goes below zero', () => {
    const board = applyAll(start, [{ type: 'TradeGoodsChanged', player: p1, delta: 3 }]);
    const ok = runPlay(table, board, pack, 'actionCard:bribery', p1, { actor: p1, step: 'component', choices: { tradeGoods: 2 }, held: true });
    expect(ok.events).toEqual([{ type: 'TradeGoodsChanged', player: p1, delta: -2, cause: { step: 'component', component: 'actionCard:bribery' } }]);
    expect(ok.board.players[p1].tradeGoods).toBe(1);
    const over = runPlay(table, board, pack, 'actionCard:bribery', p1, { actor: p1, step: 'component', choices: { tradeGoods: 5 }, held: true });
    expect(over.violations.map(v => v.code)).toEqual(['shortTradeGoods']);
    expect(over.board.players[p1].tradeGoods).toBe(0);
  });

  test('Cripple Defenses: each PDS on the chosen planet goes back to its owner, whoever holds it', () => {
    const board = applyAll(start, [
      { type: 'PlanetGained', player: p2, planet },
      { type: 'StructurePlaced', player: p2, at: { planet }, structures: { pds: 2 } },
    ]);
    const r = runPlay(table, board, pack, 'actionCard:cripple', p1, { actor: p1, step: 'component', choices: { planet }, held: true });
    expect(r.events).toEqual([{ type: 'StructureRemoved', player: p2, at: { planet }, structures: { pds: 2 }, cause: { step: 'component', component: 'actionCard:cripple' } }]);
    expect(r.board.planets[planet].structures.pds ?? 0).toBe(0);
    expect(runPlay(table, start, pack, 'actionCard:cripple', p1, { actor: p1, choices: { planet }, held: true }).events).toEqual([]);
  });
});
