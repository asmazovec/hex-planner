import { beforeEach, describe, expect, test } from 'vitest';
import { project as oldProject } from '../domain/project';
import { normalState } from '../game/compare';
import { editRound, fixturePack as pack, longGame } from '../domain/replay/timelineFixture';
import { forgetTimelines, project, projectionAtRound, timelineOf } from './projection';

beforeEach(forgetTimelines);

/**
 * My own state, as the old replay has it. What the rivals hold is left out: the round-start abilities of a rival fire in the
 * kernel (Arborec's Mitosis of the fixture gives its infantry every status phase, LRR 81, abilities apply to every player),
 * the old replay asked only the viewer (docs/superpowers/specs/2026-11-13-game-model-differences.md).
 */
const mine = (state: Parameters<typeof normalState>[0]) => { const { rivals, ...own } = normalState(state); void rivals; return own; };

describe('the timelines kept for the open game', () => {
  const game = longGame(3, 1);
  const plan = game.plans[0];

  test('the same game and plan give the same timeline, each filter its own', () => {
    const forecast = timelineOf(game, plan, 'forecast', pack);
    expect(timelineOf(game, plan, 'forecast', pack)).toBe(forecast);
    expect(timelineOf(game, plan, 'now', pack)).not.toBe(forecast);
    expect(timelineOf(game, plan, 'now', pack).filter).toBe('now');
  });

  test('an edit of a later round keeps the frames of the earlier ones', () => {
    const before = timelineOf(game, plan, 'forecast', pack);
    const edited = editRound(game, 3, r => ({ ...r, entries: r.entries.slice(1) }));
    const after = timelineOf(edited, edited.plans[0], 'forecast', pack);
    expect(after.frames[0]).toBe(before.frames[0]);
    expect(after.end).toEqual(project(edited, edited.plans[0], 'forecast', pack).state);
    expect(mine(after.end)).toEqual(mine(oldProject(edited, edited.plans[0], 'forecast', pack).state));
  });

  test('another game starts over', () => {
    const before = timelineOf(game, plan, 'forecast', pack);
    const other = { ...game, id: 'other' };
    expect(timelineOf(other, plan, 'forecast', pack).frames[0]).not.toBe(before.frames[0]);
  });

  test('the plan as far as a round equals the replay of the plan cut there, and is one object per round', () => {
    const line = timelineOf(game, plan, 'forecast', pack);
    for (const upTo of [1, 2, 3]) {
      const cut = project(game, { ...plan, rounds: plan.rounds.filter(r => r.number <= upTo) }, 'forecast', pack);
      expect(projectionAtRound(line, upTo)).toEqual(cut);
      const old = oldProject(game, { ...plan, rounds: plan.rounds.filter(r => r.number <= upTo) }, 'forecast', pack);
      expect(mine(projectionAtRound(line, upTo).state)).toEqual(mine(old.state));
      expect(Object.keys(projectionAtRound(line, upTo).warningsByEntry)).toEqual(Object.keys(old.warningsByEntry));
    }
    expect(projectionAtRound(line, 2)).toBe(projectionAtRound(line, 2));
  });
});
