/**
 * What still reaches the old per-player state from the kernel's component step. Every component's `play` is written
 * for the kernel now (`resolve/play.ts` runs it), so what is left here is the order and the announcing of the plays an
 * entry names, and the context the components' old-shape waivers (`waive`) are asked with.
 */
import { noteBase } from '../../domain/components';
import { effectOf } from '../../domain/effects/registry';
import { playedBy } from '../../domain/effects/waivers';
import type { WaiverContext } from '../../domain/effects/types';
import { viewFor, type LegacyViews } from '../legacyViews';
import { ACQUIESCENCE } from './natives';
import type { Ctx } from './context';
import { hook } from './hooks';
import { playOne } from './play';

/** Components whose play is a rule of the kernel (resolved natively), not a hook. */
const NATIVE_PLAYS: readonly string[] = [ACQUIESCENCE];

/** What a component the entry names plays at a step of the action (Salvage, once the losses are taken), in the order the entry names them. */
export function playNamed(ctx: Ctx, at: 'activation' | 'combat'): void {
  for (const id of playedBy(ctx.entry).filter(each => effectOf(ctx.pack, each)?.playAt === at)) playOne(ctx, id);
}

/** The play of the components the entry names, run where they have an effect: the hooks of the components, not the rules of playing them. */
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

/** The turn's waiver context on the old state, for the components still written for it (`waive`) and the map questions of the native permits; built only when asked. */
export function legacyWaiverContext(ctx: Ctx, before: LegacyViews, after: LegacyViews): WaiverContext {
  const now = viewFor(ctx.table, ctx.board, ctx.pack, ctx.player, after);
  const prior = viewFor(ctx.table, ctx.board, ctx.pack, ctx.player, before);
  return { pack: ctx.pack, game: now.game, entry: ctx.entry, before: prior.state, after: now.state, shared: before.states.me, primaries: ctx.track.primaries[ctx.player] ?? [] };
}
