import { describe, expect, test } from 'vitest';
import type { Turn } from '../../../game/actions';
import type { Round } from '../../../game/round';
import { LIST, resolvePick, slotOf, START, type Panel, type PickState } from './pick';

const turn = (id: string, action: Turn['action']): Turn => ({ id, player: 'p1', status: 'planned', phase: 'action', action, acts: [], used: [] });
const tactical = turn('t', { kind: 'tactical', system: '0,1', movement: [], invasion: [] });
const card = turn('c', { kind: 'strategic', card: 1 });
const adjustment = turn('x', { kind: 'correction', label: '', delta: {} });
const round: Round = { number: 1, strategyCard: null, backupCard: null, held: [], turns: [tactical, card, adjustment] };
const at = (panel: Panel): PickState => ({ ...START, panel });

describe('the one slot of the panel', () => {
  test('each state shows one thing', () => {
    expect(slotOf(START, round)).toEqual({ kind: 'list' });
    expect(slotOf(at({ kind: 'tactical', entryId: null, pickerFrom: null, byCard: 'c' }), round)).toEqual({ kind: 'pickSystem', byCard: 'c' });
    expect(slotOf(at({ kind: 'tactical', entryId: 't', pickerFrom: null }), round)).toMatchObject({ kind: 'tactical', entry: { id: 't' } });
    expect(slotOf(at({ kind: 'tactical', entryId: 't', pickerFrom: '1,0' }), round)).toMatchObject({ kind: 'flight', source: '1,0', entry: { id: 't' } });
    expect(slotOf(at({ kind: 'card', entryId: 'c' }), round)).toMatchObject({ kind: 'card', entry: { id: 'c' } });
    expect(slotOf(at({ kind: 'adjustment', entryId: 'x' }), round)).toMatchObject({ kind: 'adjustment', entry: { id: 'x' } });
  });

  test('an editor whose entry undo took away falls back to the list', () => {
    const gone = at({ kind: 'adjustment', entryId: 'missing' });
    expect(resolvePick(gone, round).panel).toEqual(LIST);
    expect(slotOf(gone, round)).toEqual({ kind: 'list' });
  });
});

test('a turn editor or an act step whose entry or act undo took away falls back: the act to where it came from, the turn to the list', () => {
  const withAct: Turn = { ...card, acts: [{ kind: 'transaction', with: 'o1', give: {}, get: {} }] };
  const turnRound: Round = { ...round, turns: [withAct] };
  const back: Panel = { kind: 'card', entryId: 'c' };
  expect(resolvePick(at({ kind: 'act', entryId: 'c', index: 0, back }), turnRound).panel).toMatchObject({ kind: 'act' });
  expect(resolvePick(at({ kind: 'act', entryId: 'c', index: 1, back }), turnRound).panel).toEqual(back);
  expect(resolvePick(at({ kind: 'act', entryId: 'gone', index: 0, back }), turnRound).panel).toEqual(LIST);
  expect(resolvePick(at({ kind: 'turn', entryId: 'gone' }), turnRound).panel).toEqual(LIST);
});
