/**
 * The one place the existing component effects run on the kernel (step 3 of the move replaces it). An effect is a
 * function that changes an old per-player `GameState`; here it is given the board's views, and what it changed becomes
 * events, applied like any others. The effects themselves, the registry and the waivers are the old code, untouched.
 */
import { noteBase } from '../../domain/components';
import { choicesFor } from '../../domain/effects/choices';
import { effectOf } from '../../domain/effects/registry';
import { playedBy } from '../../domain/effects/waivers';
import type { WaiverContext } from '../../domain/effects/types';
import { playNamedAt } from '../../domain/replay/activation';
import type { Entry, Game, GameState, Warning } from '../../domain/types';
import type { GameEvent } from '../events';
import { legacyEvents, legacyViews, legacyViewsFresh, viewFor, type LegacyViews } from '../legacyViews';
import { ACQUIESCENCE } from './natives';
import { emit, warn, type Ctx } from './context';
import { hook } from './hooks';
import { cardRoundOf, keepRound } from './track';

/** Components whose play is a rule of the kernel (resolved natively), not a hook. */
const NATIVE_PLAYS: readonly string[] = [ACQUIESCENCE];

type Tactic = Extract<Entry, { type: 'tactical' }>;

/** What an old effect is given: the owner's state, mine, everyone's, and the list its warnings go to. */
export interface Run {
  game: Game;
  state: GameState;
  shared: GameState;
  states: Record<string, GameState>;
  entry: Entry;
  warnings: Warning[];
}

/** Whether two plain values hold the same: the cheap way to know that an effect changed nothing, before its changes are read as events. */
function same(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const x = a as Record<string, unknown>;
  const y = b as Record<string, unknown>;
  const keys = Object.keys(x);
  if (keys.length !== Object.keys(y).length) return false;
  for (const key of keys) if (!(key in y) || !same(x[key], y[key])) return false;
  return true;
}

function emitChanges(ctx: Ctx, before: LegacyViews, after: LegacyViews): GameEvent[] {
  if (same(before.states, after.states) && same(before.game, after.game)) return [];
  const events = legacyEvents(ctx.table, ctx.pack, before, after, ctx.player, { step: ctx.cur.step });
  emit(ctx, events, { quiet: true });
  return events;
}

/** Runs `effect` on a copy of the board's views and applies what it changed. */
export function viaLegacy(ctx: Ctx, effect: (r: Run) => void): void {
  const before = legacyViews(ctx.table, ctx.board, ctx.pack);
  const work = legacyViewsFresh(ctx.table, ctx.board, ctx.pack);
  const v = viewFor(ctx.table, ctx.board, ctx.pack, ctx.player, work);
  // An effect may take back a warning an earlier step gave (Doctor Sucaban lowers a cost already checked): it is given the turn's list.
  const known = [...ctx.warnings];
  const warnings: Warning[] = [...known];
  effect({ game: v.game, state: v.state, shared: v.shared, states: work.states, entry: ctx.entry, warnings });
  emitChanges(ctx, before, work);
  const gone = known.filter(w => !warnings.includes(w));
  if (gone.length > 0) {
    ctx.warnings = ctx.warnings.filter(w => !gone.includes(w));
    for (const step of ctx.steps) step.violations = step.violations.filter(w => !gone.includes(w));
  }
  warn(ctx, warnings.filter(w => !known.includes(w)));
}

/** What a component the entry names plays at a step of the action (Salvage, once the losses are taken). */
export const playNamed = (ctx: Ctx, at: 'activation' | 'combat'): void =>
  !playedBy(ctx.entry).some(id => effectOf(ctx.pack, id)?.playAt === at) ? undefined : viaLegacy(ctx, r => playNamedAt(at, r.game, r.state, r.shared, r.entry as Tactic, ctx.pack, r.warnings));

/** The play of the components the entry names, run where they have an effect: the hooks of the components, not the rules of playing them. */
export function playHooks(ctx: Ctx): void {
  // Nothing named, nothing played, and the round's cards stay as they are.
  if (playedBy(ctx.entry).length === 0) return;
  const spent: { count: number; secondary: boolean }[] = [];
  viaLegacy(ctx, r => {
    const { entry, pack } = ctx;
    const cards = cardRoundOf(ctx.table, ctx.track, r.states);
    for (const id of playedBy(entry)) {
      const effect = effectOf(pack, id);
      // A play that asked to run in the middle of a tactical action has run there already; in any other entry (a component action) it runs here, once.
      if (!effect?.play || (effect.playAt && entry.type === 'tactical') || NATIVE_PLAYS.includes(noteBase(id))) continue;
      const lacking = r.warnings.some(w => (w.code === 'componentNotHeld' || w.code === 'componentExhausted') && noteBase(String(w.params.id)) === noteBase(id));
      effect.play({
        game: r.game, state: r.state, shared: r.shared, entry, id, player: entry.owner ?? 'me', states: r.states, choices: choicesFor(entry, id), held: !lacking, pack, warnings: r.warnings, cards, spent,
      });
    }
    keepRound(ctx.table, ctx.track, cards);
  });
  // The components in force are told of the strategy tokens the play spent.
  for (const each of spent) hook(ctx, 'onTokenSpent', [ctx.player], each);
}

/** The turn's waiver context on the old state, for the components still written for it (`waive`) and the map questions of the native permits; built only when asked. */
export function legacyWaiverContext(ctx: Ctx, before: LegacyViews, after: LegacyViews): WaiverContext {
  const now = viewFor(ctx.table, ctx.board, ctx.pack, ctx.player, after);
  const prior = viewFor(ctx.table, ctx.board, ctx.pack, ctx.player, before);
  return { pack: ctx.pack, game: now.game, entry: ctx.entry, before: prior.state, after: now.state, shared: before.states.me, primaries: ctx.track.primaries[ctx.player] ?? [] };
}
