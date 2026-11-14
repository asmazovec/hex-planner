/**
 * Playing a component on the kernel: a component action, or a component the entry names in `uses`. The play of a
 * component written for the kernel (`Hooked.play`) reads the board through the context (`held`, `choices`) and returns
 * events, which are applied with the component as their cause, like those of a hook; its violations go through
 * `ctx.warn`. The plays still written for the old state run in `legacyEffects.ts`.
 */
import { noteBase } from '../../domain/components';
import { choicesFor } from '../../domain/effects/choices';
import { effectOf } from '../../domain/effects/registry';
import { playedBy } from '../../domain/effects/waivers';
import type { Warning } from '../../domain/types';
import { applyChecked } from '../apply';
import type { GameEvent } from '../events';
import type { Board, DataPack, PlayerId, Table } from '../types';
import { warn, type Ctx } from './context';
import { gainedPlanet } from './invasion';
import { contextOf, poolWarnings, type HookOptions, type HookResult } from './hooks';

/** Plays the component `id` for `player`: what it does is applied one event at a time, its warnings are listed. */
export function runPlay(table: Table, start: Board, pack: DataPack, id: string, player: PlayerId, options: HookOptions): HookResult {
  const play = effectOf(pack, id)?.nativePlay;
  if (!play) return { board: start, events: [], violations: [] };
  const violations: Warning[] = [];
  const returned = play(contextOf(table, start, pack, player, id, options, warning => { violations.push(warning); })) ?? [];
  let board = start;
  const events: GameEvent[] = [];
  for (const event of returned) {
    const step = event.cause?.step ?? options.step;
    const stamped: GameEvent = { ...event, cause: { ...(options.turn ? { turn: options.turn } : {}), ...event.cause, ...(step ? { step } : {}), component: id } };
    const applied = applyChecked(board, stamped);
    // Tokens a play names a step for are checked as the tokens of any component are (pools below zero, over the faction's, the fleet pool under the ships).
    if (stamped.type === 'TokensChanged' && event.cause?.step !== undefined) violations.push(...poolWarnings(table, board, applied.board, pack, stamped, event.cause.step));
    board = applied.board;
    events.push(stamped);
  }
  return { board, events, violations };
}

/** Whether the component's play is written for the kernel. */
export const playsNatively = (pack: DataPack, id: string): boolean => effectOf(pack, id)?.nativePlay !== undefined;

/** A warning of the turn taken back, or worded again where it stands. */
function revise(ctx: Ctx, found: Warning, to?: Warning): void {
  const change = (list: Warning[]): Warning[] => (to === undefined ? list.filter(w => w !== found) : list.map(w => (w === found ? to : w)));
  ctx.warnings = change(ctx.warnings);
  for (const step of ctx.steps) step.violations = change(step.violations);
  ctx.cur.violations = change(ctx.cur.violations);
}

/** One component the entry names, played on the turn's board: its events and warnings join the step. */
export function playOne(ctx: Ctx, id: string): GameEvent[] {
  const lacking = ctx.warnings.some(w => (w.code === 'componentNotHeld' || w.code === 'componentExhausted') && noteBase(String(w.params.id)) === noteBase(id));
  const before = ctx.board;
  const result = runPlay(ctx.table, ctx.board, ctx.pack, id, ctx.player, { actor: ctx.player, step: ctx.cur.step, entry: ctx.entry, choices: choicesFor(ctx.entry, id), held: !lacking, memo: ctx.memo, warned: ctx.warnings, revise: (found, to) => revise(ctx, found, to) });
  ctx.board = result.board;
  ctx.cur.events.push(...result.events);
  if (result.violations.length > 0) warn(ctx, result.violations);
  // A planet a play gains is taken as a landing takes it: with the hooks of the gain and what the components add (a play that gains it exhausted says so itself).
  for (const event of result.events) if (event.type === 'PlanetGained' && before.planets[event.planet]?.owner !== event.player) gainedPlanet(ctx, event.planet, before, event.player);
  return result.events;
}

/** The plays the entry names that are written for the kernel and run at a step of a tactical action (`playAt`), in the order it names them. */
export function playNativeAt(ctx: Ctx, at: 'activation' | 'combat'): void {
  for (const id of playedBy(ctx.entry)) {
    const effect = effectOf(ctx.pack, id);
    if (effect?.nativePlay && effect.playAt === at) playOne(ctx, id);
  }
}
