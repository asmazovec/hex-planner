/**
 * The one place the existing component effects run on the kernel (step 3 of the move replaces it). An effect is a
 * function that changes an old per-player `GameState`; here it is given the board's views, and what it changed becomes
 * events, applied like any others. The effects themselves, the registry and the waivers are the old code, untouched.
 */
import { noteBase } from '../../domain/components';
import { choicesFor } from '../../domain/effects/choices';
import { fire, hooked, run } from '../../domain/effects/points/moments';
import { effectOf } from '../../domain/effects/registry';
import { playedBy, waive } from '../../domain/effects/waivers';
import { playNamedAt, reactToActivation } from '../../domain/replay/activation';
import { afterEntryHooks } from '../../domain/replay/afterEntry';
import { reactToLanding, runControlHooks } from '../../domain/replay/invasion';
import type { Entry, Game, GameState, UnitCounts, Warning } from '../../domain/types';
import type { GameEvent } from '../events';
import { legacyEvents, legacyKey, legacyViews, legacyViewsFresh, viewFor, type LegacyViews } from '../legacyViews';
import { anyInForce } from '../abilities/registry';
import { ACQUIESCENCE } from './natives';
import { emit, warn, type Ctx } from './context';
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

/** Whether anything answers: a component in force with the hook, or one the entry names. The old state is built only if so. */
const answers = (ctx: Ctx, has: Parameters<typeof anyInForce>[3], named: readonly string[] = playedBy(ctx.entry)): boolean => anyInForce(ctx.table, ctx.board, ctx.pack, has, named);

/** Whatever answers the activation: every player's components in force, then those the entry names for it. */
export const reactActivation = (ctx: Ctx, target: string): void =>
  !answers(ctx, e => e.onActivate !== undefined || e.playAt === 'activation') ? undefined : viaLegacy(ctx, r => reactToActivation(r.game, r.state, r.shared, r.entry as Tactic, target, ctx.pack, r.warnings));

export const reactLanding = (ctx: Ctx, planetId: string, landed: number): void =>
  !answers(ctx, e => e.onLanding !== undefined, []) ? undefined : viaLegacy(ctx, r => reactToLanding(r.game, r.state, r.shared, r.entry as Tactic, planetId, landed, ctx.pack, r.warnings));

/** What a component the entry names plays at a step of the action (Salvage, once the losses are taken). */
export const playNamed = (ctx: Ctx, at: 'activation' | 'combat'): void =>
  !playedBy(ctx.entry).some(id => effectOf(ctx.pack, id)?.playAt === at) ? undefined : viaLegacy(ctx, r => playNamedAt(at, r.game, r.state, r.shared, r.entry as Tactic, ctx.pack, r.warnings));

/** The components in force told of what the action produced and destroyed. */
export function momentsAfter(
  ctx: Ctx, produced: { units: UnitCounts; systemId: string } | null, losses: { unit: string; count: number; planetId?: string; systemId?: string }[],
): void {
  if (!produced && losses.length === 0) return;
  if (!answers(ctx, e => e.onProduced !== undefined || e.onDestroyed !== undefined, [])) return;
  viaLegacy(ctx, r => {
    const at = { game: r.game, state: r.state, shared: r.shared, pack: ctx.pack, warnings: r.warnings, entry: r.entry, player: legacyKey(ctx.table, ctx.player) };
    if (produced) fire('onProduced', at, produced);
    if (losses.length > 0) fire('onDestroyed', at, { losses });
  });
}

export type LostStructures = { kind: 'pds' | 'spacedock'; owner: string; count: number }[];

/** The components hooked on a planet gained, once it is the player's; the trade goods it brings are the step's own. */
export const controlHooks = (ctx: Ctx, planetId: string, fromPlayer: boolean, lost: LostStructures): void =>
  !answers(ctx, e => e.onGainControl !== undefined) ? undefined : viaLegacy(ctx, r => runControlHooks(r.game, r.state, planetId, ctx.pack, r.warnings, r.entry, fromPlayer, lost));

/** Which components of the viewer's are hooked on losing a planet, asked before it goes. */
export function controlLostBefore(ctx: Ctx): string[] {
  const v = viewFor(ctx.table, ctx.board, ctx.pack, ctx.table.viewer);
  return hooked('onControlLost', { game: v.game, state: v.shared, shared: v.shared, pack: ctx.pack });
}

/** What the viewer's components hooked on the loss of a planet are asked, for each planet a rival's invasion took. */
export function controlLostHooks(ctx: Ctx, lost: { planetId: string; to: string }[], ids: string[]): void {
  if (lost.length === 0 || ids.length === 0) return;
  viaLegacy(ctx, r => {
    for (const { planetId, to } of lost) {
      run('onControlLost', ids, { game: r.game, state: r.shared, shared: r.shared, pack: ctx.pack, warnings: r.warnings, entry: r.entry, states: r.states }, { planetId, to });
    }
  });
}

/** The play of the components the entry names, run where they have an effect: the hooks of the components, not the rules of playing them. */
export function playHooks(ctx: Ctx): void {
  // Nothing named, nothing played, and the round's cards stay as they are.
  if (playedBy(ctx.entry).length === 0) return;
  viaLegacy(ctx, r => {
    const { entry, pack } = ctx;
    const cards = cardRoundOf(ctx.table, ctx.track, r.states);
    for (const id of playedBy(entry)) {
      const effect = effectOf(pack, id);
      // A play that asked to run in the middle of a tactical action has run there already; in any other entry (a component action) it runs here, once.
      if (!effect?.play || (effect.playAt && entry.type === 'tactical') || NATIVE_PLAYS.includes(noteBase(id))) continue;
      const lacking = r.warnings.some(w => (w.code === 'componentNotHeld' || w.code === 'componentExhausted') && noteBase(String(w.params.id)) === noteBase(id));
      effect.play({
        game: r.game, state: r.state, shared: r.shared, entry, id, player: entry.owner ?? 'me', states: r.states, choices: choicesFor(entry, id), held: !lacking, pack, warnings: r.warnings, cards,
      });
    }
    keepRound(ctx.table, ctx.track, cards);
  });
}

/** The hooks of the components the entry gained or lost, and the checks the components in force add after it. */
export function gainHooks(ctx: Ctx): void {
  const { entry } = ctx;
  const touched = (entry.gains?.length ?? 0) > 0 || (entry.spends?.length ?? 0) > 0 || Object.values(ctx.board.planets).some(p => p.attached.length > 0);
  if (!touched && !answers(ctx, e => e.restrict !== undefined, [])) return;
  viaLegacy(ctx, r => {
    const cards = cardRoundOf(ctx.table, ctx.track, r.states);
    afterEntryHooks({ game: r.game, state: r.state, shared: r.shared, entry: ctx.entry, pack: ctx.pack, cards, warnings: r.warnings, states: r.states });
  });
}

/** The `gained` hook of a component the player has just been given (a breakthrough from an expedition). */
export const gainedHook = (ctx: Ctx, id: string): void =>
  effectOf(ctx.pack, id)?.gained === undefined ? undefined : viaLegacy(ctx, r => effectOf(ctx.pack, id)?.gained?.({
    game: r.game, state: r.state, shared: r.shared, entry: r.entry, id, player: ctx.entry.owner ?? 'me', states: r.states, choices: {}, held: true, pack: ctx.pack, warnings: r.warnings,
  }));

/** Marks the warnings of the turn with the components whose waivers cover them (the one place a component lifts a check). */
export function waived(ctx: Ctx, warnings: Warning[], before: LegacyViews, after: LegacyViews, earlier: readonly string[] = []): Warning[] {
  const now = viewFor(ctx.table, ctx.board, ctx.pack, ctx.player, after);
  const prior = viewFor(ctx.table, ctx.board, ctx.pack, ctx.player, before);
  return waive(warnings, { pack: ctx.pack, game: now.game, entry: ctx.entry, before: prior.state, after: now.state, shared: before.states.me, primaries: ctx.track.primaries[ctx.player] ?? [] }, earlier);
}

/** The components in force told that command tokens were spent from the strategy pool. */
export const tokenSpent = (ctx: Ctx, count: number, card: number | undefined, secondary: boolean): void =>
  !answers(ctx, e => e.onTokenSpent !== undefined, []) ? undefined : viaLegacy(ctx, r => fire('onTokenSpent', {
    game: r.game, state: r.state, shared: r.shared, pack: ctx.pack, warnings: r.warnings, player: legacyKey(ctx.table, ctx.player), states: r.states, entry: r.entry,
  }, { count, card, secondary }));
