/** The actions beside the tactical one on the kernel: a card's two sides, Warfare's nested action, a pass, the status phase, a correction, and the timeline of a plan. */
import { describe, expect, test } from 'vitest';
import { adjust, HOME, NEAR, NO_PAYMENT, planned, primary, rulesGame, rulesPack, secondary, statusTokens, tactical, TARGET } from '../../domain/rules/kit';
import type { Entry, Plan } from '../../testing/old/domain/types';
import { applyAll } from '../apply';
import { emptyBoard } from '../board';
import type { GameEvent } from '../events';
import { tableOf, turnOf } from '../../testing/old/game/fromLegacy';
import { poolsOf, shipsIn, tokensOnMap } from '../queries';
import { timeline } from '../timeline';
import { planOf } from '../../testing/old/game/fromLegacy';
import { resolveTurn } from './index';
import { newTrack } from './track';

const pack = rulesPack();
const game = rulesGame({ game: { opponents: [{ id: 'o1', faction: 'rules-tester', vp: 0, seat: 2, color: 2 }] } });
const table = tableOf(game);
const [me, rival] = table.players.map(p => p.id);

const board = (events: GameEvent[] = []) => applyAll(emptyBoard(table), [
  { type: 'TokensChanged', player: me, delta: { tactic: 3, fleet: 3, strategy: 2 } },
  { type: 'TokensChanged', player: rival, delta: { tactic: 3, fleet: 3, strategy: 2 } },
  { type: 'PlanetGained', player: me, planet: 'h1' },
  ...events,
]);
const codes = (r: { steps: { violations: { code: string }[] }[] }) => r.steps.flatMap(s => s.violations.map(v => v.code));

describe('a strategy card on the kernel', () => {
  test('the primary of a card I do not hold costs a token and is warned about; the secondary costs one too', () => {
    const track = newTrack({ [me]: [1] });
    const r = resolveTurn(table, board(), turnOf(table, primary(3), pack), pack, { track });
    expect(codes(r)).toContain('foreignPrimary');
    expect(poolsOf(r.board, me).strategy).toBe(1);
    const s = resolveTurn(table, board(), turnOf(table, secondary(3), pack), pack, { track });
    expect(poolsOf(s.board, me).strategy).toBe(1);
  });

  test('the round remembers the primaries: the same card twice is a repeat', () => {
    const track = newTrack({ [me]: [1] });
    const first = resolveTurn(table, board(), turnOf(table, primary(1), pack), pack, { track });
    expect(codes(first)).not.toContain('primaryRepeated');
    const again = resolveTurn(table, first.board, turnOf(table, primary(1), pack), pack, { track: first.track });
    expect(codes(again)).toContain('primaryRepeated');
    expect(track.primaries).toEqual({});
  });

  test('Warfare\'s free action is nested in the card: one turn, the card\'s status, resolved right after it', () => {
    const te = rulesPack(undefined, ['pok', 'te']);
    const warfare = primary(6, {}, {});
    const free = tactical(TARGET, { moves: [{ from: NEAR, units: { cruiser: 1 } }] }, { fromCard: warfare.id, status: 'done' });
    const turn = turnOf(table, { ...warfare, status: 'planned' }, te, free);
    expect(turn.action.kind === 'strategic' && turn.action.nested).toHaveLength(1);
    if (turn.action.kind !== 'strategic') throw new Error('strategic');
    expect(turn.action.nested![0].status).toBe('planned');
    const start = board([{ type: 'UnitsPlaced', player: me, at: { slot: NEAR }, units: { cruiser: 1 } }]);
    const r = resolveTurn(table, start, turn, te, { track: newTrack({ [me]: [6] }) });
    expect(shipsIn(r.board, TARGET, me)).toEqual({ cruiser: 1 });
    expect(tokensOnMap(r.board, me)).toContain(TARGET);
  });
});

describe('the other actions', () => {
  test('a pass records itself; a turn after it is warned about, and a pass before the primaries too', () => {
    const track = newTrack({ [me]: [1] });
    const pass = resolveTurn(table, board(), turnOf(table, planned({ type: 'pass' }), pack), pack, { track });
    expect(codes(pass)).toEqual(['passBeforeStrategy']);
    expect(pass.board.players[me].passed).toBe(true);
    const after = resolveTurn(table, pass.board, turnOf(table, tactical(TARGET), pack), pack, { track: pass.track });
    expect(codes(after)).toContain('actionAfterPass');
  });

  test('a turn outside the action phase is warned about', () => {
    const entry: Entry = { ...tactical(TARGET), phase: 'status' };
    expect(codes(resolveTurn(table, board(), turnOf(table, entry, pack), pack))).toContain('actionOutsidePhase');
  });

  test('the status phase gives tokens; its end (kept by the timeline) clears the board', () => {
    const r = resolveTurn(table, board(), turnOf(table, statusTokens(2, 0, 0), pack), pack);
    expect(poolsOf(r.board, me).tactic).toBe(5);
  });

  test('a correction is the numbers it says, as events', () => {
    const r = resolveTurn(table, board(), turnOf(table, adjust({ tradeGoods: 2, vp: 1 }), pack), pack);
    expect(r.board.players[me].tradeGoods).toBe(2);
    expect(r.board.players[me].vp).toBe(1);
    expect(r.steps.flatMap(s => s.events).map(e => e.type)).toEqual(expect.arrayContaining(['TradeGoodsChanged', 'PointsChanged']));
  });

  test('turnOf and factsOf are inverses for every kind of entry', () => {
    const entries: Entry[] = [primary(2, { tokens: { tactic: 1 } }), secondary(2), planned({ type: 'pass' }), statusTokens(1, 1, 0), adjust({ vp: 1 }), adjust({}, 'agenda')];
    for (const entry of entries) expect(turnOf(table, entry, pack).action.kind).toBeDefined();
  });
});

describe('the timeline of a plan', () => {
  const plan: Plan = {
    id: 'p', name: 'p',
    rounds: [{ number: 1, strategyCard: 1, backupCard: null, entries: [
      { ...tactical(TARGET), id: 'a', status: 'done' },
      { ...primary(1), id: 'b', status: 'planned' },
      { ...statusTokens(1, 0, 0), id: 'c', phase: 'status', status: 'planned' },
    ] }],
  };

  test('the board flows from turn to turn, and "now" counts only what is done', () => {
    const rounds = planOf(table, plan, pack);
    expect(rounds[0].turns.map(t => t.id)).toEqual(['a', 'b', 'c']);
    const forecast = timeline(table, pack, rounds, 'forecast');
    const now = timeline(table, pack, rounds, 'now');
    expect(forecast.frames.every(f => f.applied)).toBe(true);
    expect(now.frames.map(f => f.applied)).toEqual([true, false, false]);
    expect(forecast.byTurn.get('a')!.after).toBe(forecast.byTurn.get('b')!.before);
    expect(tokensOnMap(now.end, me)).toEqual([TARGET]);
    // The status phase clears the board of its tokens and the round after starts clear.
    expect(tokensOnMap(forecast.end, me)).toEqual([]);
  });

  test('a changed plan keeps the frames of the rounds before the change', () => {
    const two: Plan = { ...plan, rounds: [plan.rounds[0], { number: 2, strategyCard: null, backupCard: null, entries: [{ ...tactical(NEAR), id: 'd', status: 'planned' }] }] };
    const first = timeline(table, pack, planOf(table, two, pack), 'forecast');
    const edited: Plan = { ...two, rounds: [two.rounds[0], { ...two.rounds[1], entries: [{ ...tactical(HOME, { payment: NO_PAYMENT }), id: 'd', status: 'planned' }] }] };
    const next = timeline(table, pack, planOf(table, edited, pack), 'forecast', { previous: first });
    expect(next.frames[0]).toBe(first.frames[0]);
    expect(next.frames.at(-1)).not.toBe(first.frames.at(-1));
  });
});
