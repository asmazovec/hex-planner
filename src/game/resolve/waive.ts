/**
 * The waiver pass on the kernel: once the warnings of a turn are collected, each is marked with the components whose
 * permit covers it (`Warning.waivedBy`); a lifted warning stays in the list. The components asked, in this order:
 *  - in force for the player whose turn it is (a `passive` ability, as the board stood before the turn), and for the
 *    other side of a transaction of the turn when its permit says `partner`;
 *  - played by the turn: its component action, what it spends, what it names in `uses` (any tier);
 *  - the promissory notes in the play area, whatever their tier;
 *  - played earlier in the same round by the same player: only the permits with `lasts: 'round'`.
 * A component still written on the old state (`waive`) is asked through `legacy`, built only when one is asked.
 */
import { noteBase } from '../../domain/components';
import * as movement from '../../domain/effects/helpers/movement';
import { notesInPlay } from '../../domain/effects/points/rivals';
import { effectOf, effectsOf } from '../../domain/effects/registry';
import type { ComponentEffect, WaiverContext } from '../../domain/effects/types';
import { playedBy } from '../../domain/effects/waivers';
import { hasAnomaly } from '../../domain/replay/board';
import type { DataPack, Warning } from '../../domain/types';
import { readerOf } from '../abilities/facade';
import { holderIn, inForce } from '../abilities/registry';
import type { PermitContext } from '../abilities/types';
import { playerOfKey } from '../keys';
import type { Board, PlayerId } from '../types';
import type { Ctx } from './context';
import { contextOf } from './hooks';

interface Asked {
  id: string;
  effect: ComponentEffect;
  by: 'force' | 'entry' | 'round';
  /** The player who holds it. */
  holder: PlayerId;
  /** Held by this other side of a transaction of the turn, not by the actor: only a permit marked `partner` is asked, and only of that deal. */
  partner?: string;
}

/** The ids of the pack's components that lift anything: most boards hold none of them. */
const WAIVING = new WeakMap<DataPack, Set<string>>();
function waiving(pack: DataPack): Set<string> {
  let ids = WAIVING.get(pack);
  if (!ids) WAIVING.set(pack, ids = new Set([...effectsOf(pack)].filter(([, effect]) => (effect.permit?.length ?? 0) + (effect.waive?.length ?? 0) > 0).map(([id]) => id)));
  return ids;
}

/** The components asked for the warnings of the turn. */
function askedFor(ctx: Ctx, before: Board, earlier: readonly string[]): Asked[] {
  const { pack, table, player } = ctx;
  const known = waiving(pack);
  const asked: Asked[] = [];
  const ask = (ids: readonly string[], by: Asked['by']): void => {
    for (const id of ids) if (known.has(noteBase(id))) asked.push({ id, effect: effectOf(pack, id)!, by, holder: player });
  };
  ask(inForce(table, before, pack, player), 'force');
  // What the other side of a deal holds lifts the checks of that deal, where its text says so (Guild Ships: either may start negotiating).
  for (const act of 'acts' in ctx.entry ? ctx.entry.acts ?? [] : []) {
    if (act.kind !== 'transaction') continue;
    const other = playerOfKey(table, act.with);
    if (other === undefined) continue;
    for (const id of inForce(table, before, pack, other)) {
      const effect = known.has(noteBase(id)) ? effectOf(pack, id) : undefined;
      if (effect && (effect.permit?.some(permit => permit.partner) || effect.waive?.some(waiver => waiver.partner))) asked.push({ id, effect, by: 'force', holder: other, partner: act.with });
    }
  }
  ask(playedBy(ctx.entry), 'entry');
  // A promissory note in the play area acts in every turn of its holder, whatever its tier, until it is returned.
  ask(notesInPlay(holderIn(table, before, player).holdings), 'entry');
  ask(earlier, 'round');
  return asked;
}

/** The context a permit's `when` is asked with; the questions about routes and the map go through the old views, built once and only when asked. */
function permitContext(ctx: Ctx, before: Board, earlier: readonly string[], old: () => WaiverContext, asked: Asked): PermitContext {
  const base = contextOf(ctx.table, ctx.board, ctx.pack, asked.holder, asked.id, { actor: ctx.player, entry: ctx.entry }, () => undefined);
  const primaries = ctx.track.primaries[ctx.player];
  return Object.assign(Object.create(base) as PermitContext, {
    before, had: readerOf(ctx.table, before, ctx.pack, asked.holder), plays: earlier, ...(primaries ? { primaries } : {}),
    routeBlockKind: (warning: Warning) => movement.routeBlockKind(warning, old()),
    oneShipShort: (warning: Warning, by?: number) => movement.oneShipShort(warning, old(), by),
    speedWithoutAnomalies: (warning: Warning) => movement.speedWithoutAnomalies(warning, old()),
    crossesRift: (warning: Warning) => movement.crossesRift(warning, old()),
    hasAnomaly: (slot: string, kind: 'asteroid' | 'nebula' | 'rift' | 'supernova') => hasAnomaly(old().game, slot, kind, ctx.pack),
    blockedByShips: (slot: string) => movement.blockedByShips(old(), slot),
    othersShipsIn: (slot: string) => movement.othersShipsIn(old(), slot),
    onlyUnits: (warning: Warning, kinds: readonly string[]) => movement.onlyUnits(warning, old(), kinds as never),
    shipsOnly: (warning: Warning) => movement.shipsOnly(warning, old()),
    playerNear: (player: string, slot: string) => movement.playerNear(old(), player, slot),
    mecatolSlot: () => movement.mecatolSlot(old().game),
  });
}

/**
 * Marks the warnings of the turn with the components that lift them; the list and its order stay. `before` is the
 * board before the turn, `earlier` the components the player played before in the round.
 */
export function waive(ctx: Ctx, warnings: Warning[], before: Board, earlier: readonly string[], legacy: () => WaiverContext): Warning[] {
  if (warnings.length === 0 || waiving(ctx.pack).size === 0) return warnings;
  const asked = askedFor(ctx, before, earlier);
  if (asked.length === 0) return warnings;
  let old: WaiverContext | undefined;
  const lazy = (): WaiverContext => (old ??= legacy());
  const contexts = new Map<Asked, PermitContext>();
  const nativeOf = (a: Asked): PermitContext => contexts.get(a) ?? contexts.set(a, permitContext(ctx, before, earlier, lazy, a)).get(a)!;
  for (const warning of warnings) {
    const by: string[] = [];
    for (const item of asked) {
      const { id, effect, by: how, partner } = item;
      if (by.includes(id) || (how === 'force' && effect.tier !== 'passive')) continue;
      const covers = (entry: { code: string; lasts?: 'round'; partner?: boolean }): boolean =>
        entry.code === warning.code && (how !== 'round' || entry.lasts === 'round') && (partner === undefined || (entry.partner === true && warning.params.player === partner));
      const lifts = (effect.permit?.some(permit => covers(permit) && (permit.when?.(warning, nativeOf(item)) ?? true)) ?? false)
        || (effect.waive?.some(waiver => covers(waiver) && (waiver.when?.(warning, lazy()) ?? true)) ?? false);
      if (lifts) by.push(id);
    }
    if (by.length > 0) warning.waivedBy = by;
  }
  return warnings;
}
