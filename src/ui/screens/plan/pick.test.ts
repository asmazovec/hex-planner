import { describe, expect, test } from 'vitest';
import type { Entry, Round } from '../../../domain/types';
import { LIST, resolvePick, slotOf, START, type Panel, type PickState } from './pick';

const tactical = { id: 't', type: 'tactical', status: 'planned', phase: 'action', systemId: '0,1', moves: [], landings: [], production: {}, payment: { planets: [], tradeGoods: 0 } } as unknown as Entry;
const card = { id: 'c', type: 'strategic', status: 'planned', phase: 'action', card: 1 } as unknown as Entry;
const expedition = { id: 'x', type: 'expedition', status: 'planned', phase: 'action', sliceId: null, payment: { planets: [], tradeGoods: 0 } } as unknown as Entry;
const round = { number: 1, entries: [tactical, card, expedition] } as unknown as Round;
const at = (panel: Panel): PickState => ({ ...START, panel });

describe('the one slot of the panel', () => {
  test('each state shows one thing', () => {
    expect(slotOf(START, round)).toEqual({ kind: 'list' });
    expect(slotOf(at({ kind: 'tactical', entryId: null, pickerFrom: null, fromCard: 'c' }), round)).toEqual({ kind: 'pickSystem', fromCard: 'c' });
    expect(slotOf(at({ kind: 'tactical', entryId: 't', pickerFrom: null }), round)).toMatchObject({ kind: 'tactical', entry: { id: 't' } });
    expect(slotOf(at({ kind: 'tactical', entryId: 't', pickerFrom: '1,0' }), round)).toMatchObject({ kind: 'flight', source: '1,0', entry: { id: 't' } });
    expect(slotOf(at({ kind: 'card', entryId: 'c' }), round)).toMatchObject({ kind: 'card', entry: { id: 'c' } });
    expect(slotOf(at({ kind: 'expedition', entryId: 'x' }), round)).toMatchObject({ kind: 'expedition', entry: { id: 'x' } });
  });

  test('an editor whose entry undo took away falls back to the list', () => {
    const gone = at({ kind: 'expedition', entryId: 'missing' });
    expect(resolvePick(gone, round).panel).toEqual(LIST);
    expect(slotOf(gone, round)).toEqual({ kind: 'list' });
  });
});
