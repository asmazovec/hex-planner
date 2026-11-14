import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import * as edits from '../../../testing/entries';

vi.mock('../../../storage/db', () => ({
  saveGame: vi.fn(async () => undefined),
  loadGame: vi.fn(async () => null),
  listGames: vi.fn(async () => []),
  requestPersistence: vi.fn(async () => true),
}));

import { loadPack } from '../../../data/loadPack';
import type { Entry } from '../../../domain/types';
import type { Move } from '../../../domain/tactical';
import { useGame } from '../../../state/gameStore';
import { motion } from '../../common/preferences';
import { LEAVE_MS, leaveKey, useLeavingSources } from './useLeavingSources';
import { gameNow } from '../../../testing/store';

const pack = loadPack(['pok']);
const HOME = '1,0';
const WAY = '1,1';
const TARGET = '0,1';

let id = '';
const moves = () => (gameNow()!.plans[0].rounds[0].entries[0] as Extract<Entry, { type: 'tactical' }>).moves;
const start = (list: Move[]) => {
  id = edits.addEntry(1, { type: 'tactical', systemId: TARGET, moves: list, landings: [], production: {}, payment: { planets: [], tradeGoods: 0 } }, 'action');
};
const smooth = () => vi.stubGlobal('matchMedia', () => ({ matches: false }));

beforeEach(() => {
  useGame.getState().newGame({ expansions: ['pok'], playerCount: 6, faction: 'arborec' }, pack);
  for (const [slot, tileId] of [[HOME, '5'], [WAY, '39'], [TARGET, '25']]) useGame.getState().setTile(slot, tileId);
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  motion.write(true);
});

describe('a source left with nothing chosen', () => {
  test('is marked as leaving, and goes from the entry only once the time of the transition is over', () => {
    smooth();
    start([{ from: HOME, units: { carrier: 1 } }, { from: WAY, units: {} }]);
    const { result } = renderHook(() => useLeavingSources());
    act(() => result.current.leave(id, WAY));
    expect(result.current.leaving).toEqual([leaveKey(id, WAY)]);
    expect(moves()).toHaveLength(2);
    act(() => { vi.advanceTimersByTime(LEAVE_MS - 1); });
    expect(moves()).toHaveLength(2);
    // No end of a transition came: the timer alone takes the source away.
    act(() => { vi.advanceTimersByTime(1); });
    expect(moves()).toEqual([{ from: HOME, units: { carrier: 1 } }]);
    expect(result.current.leaving).toEqual([]);
  });

  test('goes at once when its row says the transition has ended, and the timer then does nothing more', () => {
    smooth();
    start([{ from: WAY, units: {} }]);
    const { result } = renderHook(() => useLeavingSources());
    act(() => result.current.leave(id, WAY));
    act(() => result.current.finish(id, WAY));
    expect(moves()).toEqual([]);
    expect(result.current.leaving).toEqual([]);
    const changes = vi.fn();
    const stop = useGame.subscribe(changes);
    act(() => { vi.advanceTimersByTime(LEAVE_MS * 2); });
    expect(changes).not.toHaveBeenCalled();
    stop();
  });

  test('goes at once without smooth motion: turned off in the app, or reduced by the system', () => {
    smooth();
    motion.write(false);
    start([{ from: WAY, units: {} }]);
    const { result } = renderHook(() => useLeavingSources());
    act(() => result.current.leave(id, WAY));
    expect(result.current.leaving).toEqual([]);
    expect(moves()).toEqual([]);

    motion.write(true);
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    act(() => edits.updateEntry(id, { moves: [{ from: HOME, units: {} }] }));
    act(() => result.current.leave(id, HOME));
    expect(moves()).toEqual([]);
  });

  test('stays when anything flies from it or is picked up on its way', () => {
    smooth();
    const kept: Move[] = [{ from: HOME, units: {}, via: [WAY] }, { from: WAY, units: { fighter: 1 }, pickupOf: HOME }];
    start(kept);
    const { result } = renderHook(() => useLeavingSources());
    act(() => result.current.leave(id, HOME));
    expect(result.current.leaving).toEqual([]);
    act(() => { vi.advanceTimersByTime(LEAVE_MS); });
    expect(moves()).toEqual(kept);
  });

  test('stays when it was taken up again before the time ran out', () => {
    smooth();
    start([{ from: WAY, units: {} }]);
    const { result } = renderHook(() => useLeavingSources());
    act(() => result.current.leave(id, WAY));
    act(() => result.current.keep(id, WAY));
    expect(result.current.leaving).toEqual([]);
    act(() => { vi.advanceTimersByTime(LEAVE_MS); });
    expect(moves()).toEqual([{ from: WAY, units: {} }]);
  });

  test('goes at once when the screen closes during the transition', () => {
    smooth();
    start([{ from: WAY, units: {} }]);
    const { result, unmount } = renderHook(() => useLeavingSources());
    act(() => result.current.leave(id, WAY));
    unmount();
    expect(moves()).toEqual([]);
  });
});
