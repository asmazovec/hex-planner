/** The acts of a turn on the kernel: transactions (LRR 94) and the Thunder's Edge expedition resolve into their own events. */
import { describe, expect, test } from 'vitest';
import { NEAR, rulesGame, rulesPack, tactical } from '../../domain/rules/kit';
import type { Act, Entry } from '../../domain/types';
import { applyAll } from '../apply';
import { emptyBoard } from '../board';
import { tableOf, turnOf } from '../fromLegacy';
import { resolveTurn } from './index';
import { newTrack } from './track';

const pack = rulesPack(undefined, ['te']);
const game = rulesGame({
  expansions: ['te'], units: { [NEAR]: { carrier: 1 } },
  game: { opponents: [{ id: 'o1', faction: 'rules-tester', vp: 0, seat: 2, color: 2 }], enemyUnits: { [NEAR]: { o1: { carrier: 1 } } } },
});
const table = tableOf(game);
const [me, rival] = table.players.map(p => p.id);
const start = () => applyAll(emptyBoard(table), [
  { type: 'UnitsPlaced', player: me, at: { slot: NEAR }, units: { carrier: 1 } },
  { type: 'UnitsPlaced', player: rival, at: { slot: NEAR }, units: { carrier: 1 } },
  { type: 'TradeGoodsChanged', player: me, delta: 2 },
  { type: 'CommoditiesChanged', player: me, delta: 1 },
  { type: 'TokensChanged', player: me, delta: { tactic: 3 } },
]);
const run = (acts: Act[]) => {
  const entry = { ...tactical(NEAR, { acts }), free: true } as Entry;
  return resolveTurn(table, start(), turnOf(table, entry, pack), pack, { track: newTrack() });
};
const eventsOf = (r: ReturnType<typeof run>, step: string) => r.steps.filter(s => s.step === step).flatMap(s => s.events);

describe('a transaction (94)', () => {
  // 94.1 neighbours; 21.5: commodities that change hands become trade goods of the receiver.
  test('goods change hands in one event, commodities arrive as trade goods', () => {
    const r = run([{ kind: 'transaction', with: 'o1', give: { tradeGoods: 1, commodities: 1 }, get: {} }]);
    expect(eventsOf(r, 'transaction')).toContainEqual({ type: 'GoodsTransferred', from: me, to: rival, tradeGoods: 1, commodities: 1 });
    expect(r.board.players[rival].tradeGoods).toBe(2);
    expect(r.board.players[me].tradeGoods).toBe(1);
  });

  test('what the giver lacks is told and nothing goes below zero', () => {
    const r = run([{ kind: 'transaction', with: 'o1', give: { tradeGoods: 5 }, get: {} }]);
    expect(r.steps.flatMap(s => s.violations.map(v => v.code))).toContain('shortTradeGoods');
    expect(r.board.players[me].tradeGoods).toBe(0);
    expect(r.board.players[rival].tradeGoods).toBe(2);
  });
});

describe('the expedition (Thunder\'s Edge)', () => {
  test('a slice is taken once: the board says who took it, the second try is told', () => {
    const first = run([{ kind: 'expedition', sliceId: 'tg3', payment: { planets: [], tradeGoods: 0 } }]);
    expect(first.board.common.expedition.tg3).toBe(me);
    expect(eventsOf(first, 'expedition').map(e => e.type)).toContain('ExpeditionSliceTaken');
    const again = resolveTurn(table, first.board, turnOf(table, { ...tactical(NEAR, { acts: [{ kind: 'expedition', sliceId: 'tg3', payment: { planets: [], tradeGoods: 0 } }] }), free: true } as Entry, pack), pack, { track: newTrack() });
    expect(again.steps.flatMap(s => s.violations.map(v => v.code))).toContain('sliceTaken');
  });
});
