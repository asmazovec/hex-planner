import { beforeEach, describe, expect, test } from 'vitest';
import { fixturePack as pack, longGame } from '../domain/replay/timelineFixture';
import { savedFor } from '../testing/legacySave';
import { forgetTimelines as forgetOld, timelineOf as oldTimelineOf } from '../testing/projection';
import { boardAt, boardBefore, forgetTimelines, startOfSaved, timelineOf, turnsOfRound, warningsByTurn } from './projection';

beforeEach(() => { forgetTimelines(); forgetOld(); });

describe('the kernel-shaped projection', () => {
  const game = longGame(3, 1);
  const saved = savedFor(game);
  const planId = saved.plans[0].id;

  test('the same saved game and plan give the same timeline, each filter its own', () => {
    const forecast = timelineOf(saved, planId, 'forecast', pack);
    expect(timelineOf(saved, planId, 'forecast', pack)).toBe(forecast);
    expect(timelineOf(saved, planId, 'now', pack)).not.toBe(forecast);
  });

  test('it replays the plan to the same boards and warnings as the timeline of the old game', () => {
    const line = timelineOf(saved, planId, 'forecast', pack);
    const old = oldTimelineOf(game, game.plans[0], 'forecast', pack).kernel;
    expect(line.end).toEqual(old.end);
    expect(warningsByTurn(line)).toEqual(warningsByTurn(old));
    expect(line.frames.length).toBe(old.frames.length);
  });

  test('boards by round and by turn, and the turns of a round', () => {
    const line = timelineOf(saved, planId, 'forecast', pack);
    expect(boardAt(line, 99)).toBe(line.end);
    const round = line.rounds[0];
    expect(turnsOfRound(round)).toBe(round.turns);
    const first = round.turns[0];
    expect(boardBefore(line, first.id)).toBe(line.byTurn.get(first.id)!.before);
    expect(boardBefore(line, 'none')).toBe(line.end);
  });

  test('the table and the start stay the same objects until the setup changes', () => {
    const a = startOfSaved(saved, pack);
    expect(startOfSaved({ ...saved, plans: [] }, pack).table).toBe(a.table);
    expect(startOfSaved({ ...saved, start: { ...saved.start } }, pack).table).not.toBe(a.table);
  });
});
