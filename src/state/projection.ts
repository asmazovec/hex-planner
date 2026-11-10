/**
 * The replay of the open game, kept between renders: one timeline for each plan and filter, replayed from the round
 * that changed. The screens ask here and never replay a plan themselves. It rests on the store keeping every object it
 * did not edit.
 */
import { timeline, type Filter, type Timeline } from '../domain/project';
import type { DataPack, Game, Plan } from '../domain/types';

let gameId: string | null = null;
const lines = new Map<string, Timeline>();

export function timelineOf(game: Game, plan: Plan, filter: Filter, pack: DataPack): Timeline {
  if (game.id !== gameId) {
    lines.clear();
    gameId = game.id;
  }
  const key = `${filter}:${plan.id}`;
  const line = timeline(game, plan, filter, pack, lines.get(key));
  lines.set(key, line);
  return line;
}

/** Forgets every timeline: for tests, and when a game closes. */
export function forgetTimelines(): void {
  lines.clear();
  gameId = null;
}
