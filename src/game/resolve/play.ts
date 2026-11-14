/**
 * Playing a component on the kernel: a component action, or a component the entry names in `uses`. The play of a
 * component written for the kernel (`Ability.play`) reads the board through the context (`held`, `choices`) and returns
 * events, which are applied with the component as their cause, like those of a hook; its violations go through
 * `ctx.warn`. Also here: the order and the announcing of the plays an entry names (`playNamed`, `playHooks`).
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
import { ACQUIESCENCE } from './natives';
import { gainedPlanet } from './invasion';
import { contextOf, hook, poolWarnings, type HookOptions, type HookResult } from './hooks';

/** Plays the component `id` for `player`: what it does is applied one event at a time, its warnings are listed. */
export function runPlay(table: Table, start: Board, pack: DataPack, id: string, player: PlayerId, options: HookOptions): HookResult {
  const play = effectOf(pack, id)?.play;
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
export const playsNatively = (pack: DataPack, id: string): boolean => effectOf(pack, id)?.play !== undefined;

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
  const result = runPlay(ctx.table, ctx.board, ctx.pack, id, ctx.player, { actor: ctx.player, step: ctx.cur.step, entry: ctx.entry, choices: choicesFor(ctx.entry, id), held: !lacking, memo: ctx.memo, track: ctx.track, warned: ctx.warnings, revise: (found, to) => revise(ctx, found, to) });
  ctx.board = result.board;
  ctx.cur.events.push(...result.events);
  if (result.violations.length > 0) warn(ctx, result.violations);
  // A planet a play gains is taken as a landing takes it: with the hooks of the gain and what the components add (a play that gains it exhausted says so itself).
  for (const event of result.events) if (event.type === 'PlanetGained' && before.planets[event.planet]?.owner !== event.player) gainedPlanet(ctx, event.planet, before, event.player);
  return result.events;
}

/** Components whose play is a rule of the kernel (resolved natively), not a hook. */
const NATIVE_PLAYS: readonly string[] = [ACQUIESCENCE];

/** What a component the entry names plays at a step of the action (Salvage, once the losses are taken), in the order the entry names them. */
export function playNamed(ctx: Ctx, at: 'activation' | 'combat'): void {
  for (const id of playedBy(ctx.entry)) {
    const effect = effectOf(ctx.pack, id);
    if (effect?.play && effect.playAt === at) playOne(ctx, id);
  }
}

/** The plays of the components the entry names that no step of a tactical action took, run where they have an effect, and the components in force told what they spent. */
export function playHooks(ctx: Ctx): void {
  // Nothing named, nothing played, and the round's cards stay as they are.
  if (playedBy(ctx.entry).length === 0) return;
  const spent: { count: number; secondary: boolean }[] = [];
  const { entry, pack } = ctx;
  // A play that asked to run in the middle of a tactical action has run there already; in any other entry (a component action) it runs here, once.
  const ids = playedBy(entry).filter(id => {
    const effect = effectOf(pack, id);
    return !(effect?.playAt && entry.type === 'tactical') && !NATIVE_PLAYS.includes(noteBase(id));
  });
  // A play that spends strategy tokens tells the components in force.
  for (const id of ids) for (const event of playOne(ctx, id)) if (event.type === 'TokensChanged' && (event.delta.strategy ?? 0) < 0) spent.push({ count: -(event.delta.strategy ?? 0), secondary: false });
  for (const each of spent) hook(ctx, 'onTokenSpent', [ctx.player], each);
}
