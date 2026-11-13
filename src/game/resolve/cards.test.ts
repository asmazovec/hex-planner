/** The strategy cards on the kernel: each card's rule emits its events straight onto the board. */
import { describe, expect, test } from 'vitest';
import { CARD } from '../../domain/replay/cards/ids';
import { primary, rulesGame, rulesPack, secondary } from '../../domain/rules/kit';
import { applyAll } from '../apply';
import { emptyBoard } from '../board';
import { tableOf, turnOf } from '../fromLegacy';
import { poolsOf } from '../queries';
import { resolveTurn } from './index';
import { newTrack } from './track';

const pack = rulesPack();
const game = rulesGame({ game: { opponents: [{ id: 'o1', faction: 'rules-tester', vp: 0, seat: 2, color: 2 }] } });
const table = tableOf(game);
const [me, rival] = table.players.map(p => p.id);
const start = () => applyAll(emptyBoard(table), [
  { type: 'TokensChanged', player: me, delta: { tactic: 3, fleet: 3, strategy: 2 } },
  { type: 'TokensChanged', player: rival, delta: { tactic: 3, fleet: 3, strategy: 2 } },
]);
const run = (entry: ReturnType<typeof primary>, held: number[]) =>
  resolveTurn(table, start(), turnOf(table, entry, pack), pack, { track: newTrack({ [me]: held }) });

describe('a strategy card rule', () => {
  test('Trade primary: three trade goods, and the secondary of the chosen players is free', () => {
    const r = run(primary(CARD.trade, { freeSecondary: ['o1'] }), [CARD.trade]);
    expect(r.board.players[me].tradeGoods).toBe(3);
    expect(r.track.freeSecondary[CARD.trade]).toEqual([rival]);
    expect(poolsOf(r.board, me).strategy).toBe(2);
  });

  test('a secondary spends a strategy token, and leaves the trade goods of the primary out', () => {
    const r = run(secondary(CARD.trade), []);
    expect(poolsOf(r.board, me).strategy).toBe(1);
    expect(r.board.players[me].tradeGoods).toBe(0);
  });

  test('Leadership primary gives the tokens entered, Technology researches nothing it is not told', () => {
    const r = run(primary(CARD.leadership, { tokens: { tactic: 3 } }), [CARD.leadership]);
    expect(poolsOf(r.board, me).tactic).toBe(6);
    expect(r.steps.flatMap(s => s.violations.map(v => v.code))).not.toContain('tokensOver');
    const over = run(primary(CARD.leadership, { tokens: { tactic: 4 } }), [CARD.leadership]);
    expect(over.steps.flatMap(s => s.violations.map(v => v.code))).toContain('tokensOver');
  });
});
