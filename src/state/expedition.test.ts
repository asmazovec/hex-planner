/** Who took an expedition part is a player of the table: any player, by hand at the start or by a turn of the plan. */
import { beforeEach, describe, expect, test } from 'vitest';
import { loadPack } from '../data/loadPack';
import { createSaved, swapSeats } from '../game/edit/table';
import { sliceOwnersOf } from '../game/screenQueries';
import { withSlice } from '../game/edit/start';
import type { SavedGame } from '../game/save';
import type { Turn } from '../game/actions';
import { useGame } from './gameStore';

const pack = loadPack(['pok', 'te']);
const fresh = (): SavedGame => createSaved({ expansions: ['pok', 'te'], playerCount: 4, faction: 'sol' }, pack);

describe('expedition parts belong to players of the table', () => {
  beforeEach(() => { useGame.setState({ saved: null }); });

  test('a part set by hand for the third player is the third player\'s, not the first rival\'s', () => {
    useGame.setState({ saved: fresh() });
    useGame.getState().setSlice('res5', 'p3');
    const saved = useGame.getState().saved!;
    expect(saved.start.expedition.slices.res5).toBe('p3');
    expect(sliceOwnersOf(saved)).toEqual({ res5: 'p3' });
  });

  test('a part a rival takes with a turn of the plan is that rival\'s, not the viewer\'s', () => {
    const saved = fresh();
    const turn: Turn = {
      id: 't1', player: 'p3', status: 'planned', action: { kind: 'pass' }, used: [],
      acts: [{ kind: 'expedition', slice: 'inf5', payment: { planets: [], tradeGoods: 0 } }],
    };
    const planned: SavedGame = { ...saved, plans: saved.plans.map(plan => ({ ...plan, rounds: plan.rounds.map(round => ({ ...round, turns: [turn] })) })) };
    expect(sliceOwnersOf(planned)).toEqual({ inf5: 'p3' });
  });

  test('a part stays with its player when other players trade seats', () => {
    const taken = withSlice(fresh(), 'tg3', 'p3');
    // The second and the fourth player of the list trade seats: the third one keeps both the seat and the part.
    expect(swapSeats(taken, 1, 3).start.expedition.slices).toEqual({ tg3: 'p3' });
  });
});
