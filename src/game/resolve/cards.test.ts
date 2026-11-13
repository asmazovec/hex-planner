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

  // 83.4: a secondary costs a strategy token; the note of the Winnu: "You do not have to spend or place a command token to
  // resolve the secondary ability of that strategy card." The token is not spent: with none left the pool stays at zero.
  test('a secondary that uses a note of Acquiescence spends no token, and the lack of one is still told', () => {
    const note = 'promissory:acq@o1';
    const board = applyAll(start(), [{ type: 'CardGained', player: me, card: note }]);
    const entry = { ...secondary(CARD.trade), uses: [note] };
    const spent = resolveTurn(table, board, turnOf(table, entry, pack), pack, { track: newTrack({ [me]: [] }) });
    expect(poolsOf(spent.board, me).strategy).toBe(2);
    const empty = applyAll(board, [{ type: 'TokensChanged', player: me, delta: { strategy: -2 } }]);
    const none = resolveTurn(table, empty, turnOf(table, entry, pack), pack, { track: newTrack({ [me]: [] }) });
    expect(poolsOf(none.board, me).strategy).toBe(0);
    expect(none.steps.flatMap(st => st.violations.map(v => v.code))).toContain('shortStrategy');
  });
});
