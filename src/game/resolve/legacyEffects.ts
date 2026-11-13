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
import { applyActs } from '../../domain/replay/acts';
import { playNamedAt, reactToActivation } from '../../domain/replay/activation';
import { afterEntry } from '../../domain/replay/afterEntry';
import { applyGains, applyUses } from '../../domain/replay/holdings';
import { afterControl, reactToLanding } from '../../domain/replay/invasion';
import { payPlayedCost } from '../../domain/replay/payment';
import type { Entry, Game, GameState, UnitCounts, Warning } from '../../domain/types';
import type { GameEvent } from '../events';
import { legacyEvents, legacyKey, legacyViews, viewFor, type LegacyViews } from '../legacyViews';
import { emit, warn, type Ctx } from './context';
import { cardRoundOf, keepRound } from './track';

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

function emitChanges(ctx: Ctx, before: LegacyViews, after: LegacyViews): GameEvent[] {
  const events = legacyEvents(ctx.table, ctx.pack, before, after, ctx.player, { step: ctx.cur.step });
  emit(ctx, events, { quiet: true });
  return events;
}

/** Runs `effect` on a copy of the board's views and applies what it changed. */
export function viaLegacy(ctx: Ctx, effect: (r: Run) => void): void {
  const before = legacyViews(ctx.table, ctx.board, ctx.pack);
  const work = legacyViews(ctx.table, ctx.board, ctx.pack);
  const v = viewFor(ctx.table, ctx.board, ctx.pack, ctx.player, work);
  const warnings: Warning[] = [];
  effect({ game: v.game, state: v.state, shared: v.shared, states: work.states, entry: ctx.entry, warnings });
  emitChanges(ctx, before, work);
  warn(ctx, warnings);
}

/** Whatever answers the activation: every player's components in force, then those the entry names for it. */
export const reactActivation = (ctx: Ctx, target: string): void =>
  viaLegacy(ctx, r => reactToActivation(r.game, r.state, r.shared, r.entry as Tactic, target, ctx.pack, r.warnings));

export const reactLanding = (ctx: Ctx, planetId: string, landed: number): void =>
  viaLegacy(ctx, r => reactToLanding(r.game, r.state, r.shared, r.entry as Tactic, planetId, landed, ctx.pack, r.warnings));

/** What a component the entry names plays at a step of the action (Salvage, once the losses are taken). */
export const playNamed = (ctx: Ctx, at: 'activation' | 'combat'): void =>
  viaLegacy(ctx, r => playNamedAt(at, r.game, r.state, r.shared, r.entry as Tactic, ctx.pack, r.warnings));

/** The components in force told of what the action produced and destroyed. */
export function momentsAfter(
  ctx: Ctx, produced: { units: UnitCounts; systemId: string } | null, losses: { unit: string; count: number; planetId?: string; systemId?: string }[],
): void {
  if (!produced && losses.length === 0) return;
  viaLegacy(ctx, r => {
    const at = { game: r.game, state: r.state, shared: r.shared, pack: ctx.pack, warnings: r.warnings, entry: r.entry, player: legacyKey(ctx.table, ctx.player) };
    if (produced) fire('onProduced', at, produced);
    if (losses.length > 0) fire('onDestroyed', at, { losses });
  });
}

export type LostStructures = { kind: 'pds' | 'spacedock'; owner: string; count: number }[];

/** What follows a planet gained, once it is the player's: the components hooked on the gain and the trade goods it brings. */
export const controlHooks = (ctx: Ctx, planetId: string, fromPlayer: boolean, lost: LostStructures): void =>
  viaLegacy(ctx, r => afterControl(r.game, r.state, planetId, ctx.pack, r.warnings, r.entry, fromPlayer, lost));

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

/** What follows the action of a turn: what it uses, what a played component costs and does, what it gains and loses, the hooks after. */
export function turnTail(ctx: Ctx): void {
  viaLegacy(ctx, r => {
    const { entry, pack } = ctx;
    const cards = cardRoundOf(ctx.table, ctx.track, r.states);
    applyUses(r.state, entry, pack, r.warnings, r.game.faction, r.states);
    payPlayedCost(r.game, r.state, r.shared, entry, pack, r.warnings);
    for (const id of playedBy(entry)) {
      const effect = effectOf(pack, id);
      // A play that asked to run in the middle of a tactical action has run there already.
      if (!effect?.play || effect.playAt) continue;
      const lacking = r.warnings.some(w => (w.code === 'componentNotHeld' || w.code === 'componentExhausted') && noteBase(String(w.params.id)) === noteBase(id));
      effect.play({
        game: r.game, state: r.state, shared: r.shared, entry, id, player: entry.owner ?? 'me', states: r.states, choices: choicesFor(entry, id), held: !lacking, pack, warnings: r.warnings, cards,
      });
    }
    const factionOf = (key: string): string | undefined => ctx.table.players.find(p => legacyKey(ctx.table, p.id) === key)?.faction;
    applyGains(r.state, r.shared, entry, pack, factionOf);
    afterEntry({ game: r.game, state: r.state, shared: r.shared, entry, pack, cards, warnings: r.warnings, states: r.states });
    keepRound(ctx.table, ctx.track, cards);
  });
}

/** The transactions and the expedition at the end of a turn. */
export function turnActs(ctx: Ctx): void {
  const taken = new Set(Object.keys(ctx.board.common.expedition));
  const was = new Set(taken);
  viaLegacy(ctx, r => applyActs(r.game, r.state, r.entry, ctx.pack, { taken, states: r.states }, r.warnings));
  const events: GameEvent[] = [...taken].filter(slice => !was.has(slice)).map(slice => ({ type: 'ExpeditionSliceTaken', player: ctx.player, slice }));
  emit(ctx, events, { quiet: true });
}

/** Marks the warnings of the turn with the components whose waivers cover them (the one place a component lifts a check). */
export function waived(ctx: Ctx, warnings: Warning[], before: LegacyViews, after: LegacyViews, earlier: readonly string[] = []): Warning[] {
  const now = viewFor(ctx.table, ctx.board, ctx.pack, ctx.player, after);
  const prior = viewFor(ctx.table, ctx.board, ctx.pack, ctx.player, before);
  return waive(warnings, { pack: ctx.pack, game: now.game, entry: ctx.entry, before: prior.state, after: now.state, shared: before.states.me }, earlier);
}
