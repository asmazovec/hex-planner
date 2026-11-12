/**
 * Waivers: the one place where a component lifts a check. The replay makes every warning as the rules alone have it
 * and never names a component; once an entry's warnings are collected, each is marked here with the components whose
 * waiver covers it (`Warning.waivedBy`). A waived warning stays in the list.
 *
 * The components asked for an entry of a player:
 *  - in force (`inForceOf`): what they hold and what their faction, their planets and the laws bring. Only a `passive`
 *    effect waives this way. An ability worded "may" that lifts a check needs no mark in the entry: the player already
 *    entered the breach, so the ability is taken as used.
 *  - played by the entry (`playedBy`): its component action, what it spends, what it names in `uses`. Any tier waives.
 *  - played earlier in the same round by the same player: only the waivers with `lasts: 'round'`.
 */
import { noteBase } from '../components';
import type { DataPack, Entry, Warning } from '../types';
import { effectOf, effectsOf, holderOf, inForceOf } from './registry';
import type { ComponentEffect, WaiverContext } from './types';

/** One component asked for its waivers, and how it came to be asked. */
export interface Asked { id: string; effect: ComponentEffect; by: 'force' | 'entry' | 'round' }

/** The components an entry plays, each once: its component action, what it spends, what it uses. */
export function playedBy(entry: Entry): string[] {
  const ids = [...(entry.type === 'component' && entry.componentId !== undefined ? [entry.componentId] : []), ...(entry.spends ?? []), ...(entry.uses ?? [])];
  return ids.filter((id, index) => ids.indexOf(id) === index);
}

/** Marks each warning with the components asked whose waiver covers it; the list and its order stay. */
export function marked(warnings: Warning[], asked: Asked[], ctx: WaiverContext): Warning[] {
  for (const warning of warnings) {
    const by: string[] = [];
    for (const { id, effect, by: how } of asked) {
      if (by.includes(id) || (how === 'force' && effect.tier !== 'passive')) continue;
      const lifts = effect.waive?.some(waiver => waiver.code === warning.code && (how !== 'round' || waiver.lasts === 'round') && (waiver.when?.(warning, ctx) ?? true));
      if (lifts) by.push(id);
    }
    if (by.length > 0) warning.waivedBy = by;
  }
  return warnings;
}

/** The ids of the pack's components that waive anything: most boards hold none of them. */
const WAIVING = new WeakMap<DataPack, Set<string>>();
function waiving(pack: DataPack): Set<string> {
  let ids = WAIVING.get(pack);
  if (!ids) WAIVING.set(pack, ids = new Set([...effectsOf(pack)].filter(([, effect]) => (effect.waive?.length ?? 0) > 0).map(([id]) => id)));
  return ids;
}

/** The components asked for the warnings of `ctx`: in force for the owner, played by the entry, and `earlier` in its round. */
export function askedFor(ctx: WaiverContext, earlier: readonly string[] = []): Asked[] {
  const { pack } = ctx;
  const known = waiving(pack);
  const asked: Asked[] = [];
  const ask = (ids: readonly string[], by: Asked['by']): void => {
    for (const id of ids) if (known.has(noteBase(id))) asked.push({ id, effect: effectOf(pack, id)!, by });
  };
  ask(inForceOf(pack, holderOf(ctx.game, ctx.before, ctx.shared)), 'force');
  if (ctx.entry) ask(playedBy(ctx.entry), 'entry');
  ask(earlier, 'round');
  return asked;
}

/**
 * Marks the warnings of an entry (or of the board itself, without an entry) with the components that lift them.
 * `earlier` are the components the same player played before in the round.
 */
export function waive(warnings: Warning[], ctx: WaiverContext, earlier: readonly string[] = []): Warning[] {
  if (warnings.length === 0 || waiving(ctx.pack).size === 0) return warnings;
  const asked = askedFor(ctx, earlier);
  return asked.length === 0 ? warnings : marked(warnings, asked, ctx);
}
