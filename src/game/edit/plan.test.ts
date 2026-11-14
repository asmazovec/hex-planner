import { describe, expect, test } from 'vitest';
import type { Turn } from '../actions';
import type { Round } from '../round';
import { copiedRounds, heldOf, withCardCycled, withRoundAdded, withTurnAdded, withTurnMoved, withTurnRemoved, withTurnReplaced, withTurnStatus, withoutRound } from './plan';

const turn = (id: string, extra: Partial<Turn> = {}): Turn => ({ id, player: 'p1', status: 'planned', phase: 'action', action: { kind: 'pass' }, acts: [], used: [], ...extra });
const round = (turns: Turn[] = [], extra: Partial<Round> = {}): Round => ({ number: 1, strategyCard: null, backupCard: null, held: [], turns, ...extra });
const free = turn('free', { action: { kind: 'tactical', system: 'B', movement: [], invasion: [], free: true } });
const card = (nested: Turn[] = [free]): Turn => turn('card', { action: { kind: 'strategic', card: 6, nested } });

describe('turns', () => {
  test('a new turn goes to the end of its phase; a status turn is of the status phase', () => {
    const r = withTurnAdded(round([turn('a'), turn('s', { phase: 'status', action: { kind: 'status', tactic: 0, fleet: 0, strategy: 0 } })]), turn('b'));
    expect(r.turns.map(t => t.id)).toEqual(['a', 'b', 's']);
    expect(withTurnAdded(round(), { ...turn('x'), phase: undefined, action: { kind: 'status', tactic: 0, fleet: 0, strategy: 0 } }).turns[0].phase).toBe('status');
  });

  test('a free action is nested in its card and takes its status', () => {
    const r = withTurnAdded(round([{ ...card([]), status: 'done' }]), turn('n'), 'card');
    expect((r.turns[0].action as { nested: Turn[] }).nested).toMatchObject([{ id: 'n', status: 'done' }]);
  });

  test('replacing with the same turn keeps the round; a nested action is replaced inside its card', () => {
    const r = round([turn('a'), card()]);
    expect(withTurnReplaced(r, 'a', { ...turn('a') })).toBe(r);
    const changed = withTurnReplaced(r, 'free', { ...free, status: 'done' });
    expect((changed.turns[1].action as { nested: Turn[] }).nested[0].status).toBe('done');
    expect(changed.turns[0]).toBe(r.turns[0]);
  });

  test('removing a card removes its free action; removing the free action leaves the card', () => {
    const r = round([card()]);
    expect(withTurnRemoved(r, 'card').turns).toEqual([]);
    expect((withTurnRemoved(r, 'free').turns[0].action as { nested: Turn[] }).nested).toEqual([]);
    expect(withTurnRemoved(r, 'nothing')).toBe(r);
  });

  test('moving counts within the phase and changes it', () => {
    const r = round([turn('a'), turn('b'), turn('s', { phase: 'status' })]);
    expect(withTurnMoved(r, 'b', 'action', 0).turns.map(t => t.id)).toEqual(['b', 'a', 's']);
    expect(withTurnMoved(r, 'a', 'status', 5).turns.map(t => [t.id, t.phase])).toEqual([['b', 'action'], ['s', 'status'], ['a', 'status']]);
    expect(withTurnMoved(r, 'a', 'action', 0)).toBe(r);
  });

  test('the status of a card is the status of its free action', () => {
    const r = withTurnStatus(round([card()]), 'card', 'done');
    expect(r.turns[0].status).toBe('done');
    expect((r.turns[0].action as { nested: Turn[] }).nested[0].status).toBe('done');
  });
});

describe('cards and rounds', () => {
  test('backup, primary, removed; the cards held follow', () => {
    let r = round();
    r = withCardCycled(r, 6, 4, 'p1'); expect(r).toMatchObject({ strategyCard: null, backupCard: 6, held: [6] });
    r = withCardCycled(r, 6, 4, 'p1'); expect(r).toMatchObject({ strategyCard: 6, backupCard: null, held: [6] });
    r = withCardCycled(r, 6, 4, 'p1'); expect(r).toMatchObject({ strategyCard: null, backupCard: null, held: [] });
    expect(heldOf(3, 5, 6)).toEqual([3]);
  });

  test('a primary of a card not held is for a token', () => {
    const r = withCardCycled(round([card([])], { }), 2, 4, 'p1');
    expect(r.turns[0].action).toMatchObject({ forToken: true });
  });

  test('rounds are added after the last and removed with the gap closed; one stays', () => {
    const rounds = withRoundAdded(withRoundAdded([round()]));
    expect(rounds.map(r => r.number)).toEqual([1, 2, 3]);
    expect(withoutRound(rounds, 2).map(r => r.number)).toEqual([1, 2]);
    expect(withoutRound([round()], 1)).toHaveLength(1);
  });

  test('a copy has fresh ids, the nested ones too, and shares nothing', () => {
    let n = 0;
    const rounds = [round([card()])];
    const copy = copiedRounds(rounds, () => `n${++n}`);
    expect(copy[0].turns[0].id).toBe('n1');
    expect((copy[0].turns[0].action as { nested: Turn[] }).nested[0].id).toBe('n2');
    expect(copy[0].turns[0]).not.toBe(rounds[0].turns[0]);
    expect((rounds[0].turns[0].action as { nested: Turn[] }).nested[0].id).toBe('free');
  });
});
