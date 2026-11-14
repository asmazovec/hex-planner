/**
 * The waiver pass on the kernel: once the warnings of a turn are collected, each is marked with the components whose
 * permit covers it (`Warning.waivedBy`); a lifted warning stays in the list. The components asked, in this order:
 *  - in force for the player whose turn it is (a `passive` ability, as the board stood before the turn), and for the
 *    other side of a transaction of the turn when its permit says `partner`;
 *  - played by the turn: its component action, what it spends, what it names in `uses` (any tier);
 *  - the promissory notes in the play area, whatever their tier;
 *  - played earlier in the same round by the same player: only the permits with `lasts: 'round'`.
 */
import { noteBase } from '../../domain/components';
import { notesInPlay } from '../../domain/effects/points/rivals';
import { effectOf, effectsOf } from '../../domain/effects/registry';
import type { Ability } from '../../domain/effects/types';
import { playedBy } from '../../domain/effects/waivers';
import { MECATOL_TILE, MECATOL_TILE_TE } from '../../domain/mecatol';
import { hasAnomaly, systemSlots, tileIdOf, type MapSource } from '../../domain/replay/board';
import { costOf } from '../../domain/replay/production';
import { unitIds, type Move } from '../../domain/replay/state';
import type { DataPack, Entry, UnitCounts, UnitId, Warning } from '../../domain/types';
import type { Turn } from '../actions';
import { unitStats } from '../../domain/unitStats';
import { readerOf } from '../abilities/facade';
import { appliedOn, holderIn, inForce } from '../abilities/registry';
import type { PermitContext, RouteBlockKind } from '../abilities/types';
import { playerOfKey } from '../keys';
import { viewFor } from '../legacyViews';
import { adjacentSlots, blockersOf, mapSource, pathOf, planetsIn, shipBlockers } from '../space';
import type { Board, PlayerId, Table } from '../types';
import { NO_TACTICAL, type Ctx } from './context';
import { newTrack } from './track';
import { contextOf } from './hooks';

interface Asked {
  id: string;
  effect: Ability;
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
  if (!ids) WAIVING.set(pack, ids = new Set([...effectsOf(pack)].filter(([, effect]) => (effect.permit?.length ?? 0) > 0).map(([id]) => id)));
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
      if (effect?.permit?.some(permit => permit.partner)) asked.push({ id, effect, by: 'force', holder: other, partner: act.with });
    }
  }
  ask(playedBy(ctx.entry), 'entry');
  // A promissory note in the play area acts in every turn of its holder, whatever its tier, until it is returned.
  ask(notesInPlay(holderIn(table, before, player).holdings), 'entry');
  ask(earlier, 'round');
  return asked;
}

/** The context a permit's `when` is asked with: the board after the turn, the board before it (`prior`), and the questions about the turn's route over the map. */
function permitContext(ctx: Ctx, before: Board, earlier: readonly string[], asked: Asked): PermitContext {
  const { table, pack, entry } = ctx;
  const mover = ctx.player;
  const base = contextOf(table, ctx.board, pack, asked.holder, asked.id, { actor: mover, entry, warned: ctx.warnings }, () => undefined);
  const prior = contextOf(table, before, pack, asked.holder, asked.id, { actor: mover, entry }, () => undefined);
  const primaries = ctx.track.primaries[mover];
  const source = (): MapSource => mapSource(table, ctx.board);
  const moveOf = (warning: Warning): Move | undefined => (entry.type === 'tactical' ? entry.moves.find(move => move.from === warning.params.from) : undefined);
  const movingCount = (warning: Warning): number => (moveOf(warning)?.units as UnitCounts | undefined)?.[String(warning.params.unit) as keyof UnitCounts] ?? 0;
  const shortfall = (warning: Warning): number => Number(warning.params.steps) - Number(warning.params.move);
  const speedOf = (player: PlayerId, unit: UnitId): number => {
    const faction = table.players.find(p => p.id === player)?.faction ?? '';
    const printed = unitStats(faction, unit, false, pack)?.move ?? 0;
    const value = appliedOn(table, before, pack, player, 'speed', printed, { faction, unit }).value;
    return value > 0 ? value : 0;
  };
  const isShip = (unit: UnitId): boolean => pack.units[unit] !== undefined && !pack.units[unit].ground && !pack.units[unit].fighter;
  const had = readerOf(table, before, pack, asked.holder);
  return Object.assign(Object.create(base) as PermitContext, {
    before, had, ready: (id: string) => had.ready(id), prior, plays: earlier, ...(primaries ? { primaries } : {}),
    blockedByShips: (slot: string): boolean => shipBlockers(before, mover, pack).has(slot),
    routeBlockKind: (warning: Warning): RouteBlockKind | undefined => {
      if (warning.code !== 'routeBlocked') return undefined;
      if (warning.params.context === 'hyperlane') return 'hyperlane';
      const slot = String(warning.params.systemId);
      for (const kind of ['asteroid', 'supernova', 'nebula'] as const) if (hasAnomaly(source(), slot, kind, pack)) return kind;
      if (shipBlockers(before, mover, pack).has(slot)) return 'ships';
      return blockersOf(table, before, mover, pack).has(slot) ? 'structures' : undefined;
    },
    // Of the speedShort warnings of the turn, only the first that one ship's shortfall of at most `by` covers is lifted.
    oneShipShort: (warning: Warning, by = 1): boolean => {
      if (warning.code !== 'speedShort' || shortfall(warning) > by || movingCount(warning) !== 1) return false;
      const first = ctx.warnings.find(other => other.code === 'speedShort' && shortfall(other) <= by && movingCount(other) === 1);
      return first !== undefined && JSON.stringify(first.params) === JSON.stringify(warning.params);
    },
    speedWithoutAnomalies: (warning: Warning): number => speedOf(mover, String(warning.params.unit) as UnitId),
    crossesRift: (warning: Warning): boolean => {
      const move = moveOf(warning);
      const target = entry.type === 'tactical' ? entry.systemId : null;
      if (target === null || !move) return false;
      return pathOf(table, ctx.board, [move.from, ...(move.via ?? []), target], pack).slice(0, -1).some(slot => hasAnomaly(source(), slot, 'rift', pack));
    },
    hasAnomaly: (slot: string, kind: 'asteroid' | 'nebula' | 'rift' | 'supernova') => hasAnomaly(source(), slot, kind, pack),
    othersShipsIn: (slot: string): UnitCounts => {
      const total: UnitCounts = {};
      for (const [player, units] of Object.entries(before.systems[slot]?.ships ?? {})) {
        if (player === mover) continue;
        for (const unit of unitIds(units)) if (isShip(unit)) total[unit] = (total[unit] ?? 0) + (units[unit] ?? 0);
      }
      return total;
    },
    onlyUnits: (warning: Warning, kinds: readonly string[]): boolean => {
      const units = unitIds(moveOf(warning)?.units ?? {});
      return units.length > 0 && units.every(unit => kinds.includes(unit));
    },
    shipsOnly: (warning: Warning): boolean => unitIds(moveOf(warning)?.units ?? {}).every(unit => isShip(unit)),
    playerNear: (player: string, slot: string): boolean => {
      const who = playerOfKey(table, player);
      if (who === undefined) return false;
      const reader = readerOf(table, before, pack, who);
      return [slot, ...adjacentSlots(table, before, slot, pack)].some(here => reader.standsIn(here, planetsIn(table, before, pack, here)));
    },
    fastestOnBoard: (): number => Math.max(0, ...table.players.flatMap(p => Object.values(before.systems).flatMap(system => unitIds(system.ships[p.id] ?? {}).map(unit => speedOf(p.id, unit))))),
    productionCostOf: (units: UnitCounts): number => {
      const v = viewFor(table, before, pack, mover);
      return costOf(v.game, v.state, units, pack, false, entry);
    },
    mecatolSlot: (): string | undefined => systemSlots(source()).find(slot => [MECATOL_TILE, MECATOL_TILE_TE].includes(tileIdOf(source(), slot))),
  });
}

/**
 * Marks the warnings of the turn with the components that lift them; the list and its order stay. `before` is the
 * board before the turn, `earlier` the components the player played before in the round.
 */
export function waive(ctx: Ctx, warnings: Warning[], before: Board, earlier: readonly string[]): Warning[] {
  if (warnings.length === 0 || waiving(ctx.pack).size === 0) return warnings;
  const asked = askedFor(ctx, before, earlier);
  if (asked.length === 0) return warnings;
  const contexts = new Map<Asked, PermitContext>();
  const nativeOf = (a: Asked): PermitContext => contexts.get(a) ?? contexts.set(a, permitContext(ctx, before, earlier, a)).get(a)!;
  for (const warning of warnings) {
    const by: string[] = [];
    for (const item of asked) {
      const { id, effect, by: how, partner } = item;
      if (by.includes(id) || (how === 'force' && effect.tier !== 'passive')) continue;
      const covers = (entry: { code: string; lasts?: 'round'; partner?: boolean }): boolean =>
        entry.code === warning.code && (how !== 'round' || entry.lasts === 'round') && (partner === undefined || (entry.partner === true && warning.params.player === partner));
      if (effect.permit?.some(permit => covers(permit) && (permit.when?.(warning, nativeOf(item)) ?? true))) by.push(id);
    }
    if (by.length > 0) warning.waivedBy = by;
  }
  return warnings;
}

/**
 * The waiver pass for what the board breaks by itself, with no turn: the passive permits in force for `player` lift
 * what they cover (the big hex checks the capacity and the fleet pool of a system as placed by hand).
 */
export function waiveBoard(table: Table, board: Board, pack: DataPack, player: PlayerId, warnings: Warning[]): Warning[] {
  const entry = { id: '', phase: 'tactical', status: 'planned', type: 'pass', label: '' } as unknown as Entry;
  const ctx: Ctx = {
    table, pack, turn: { id: '', player, action: { kind: 'pass' } } as unknown as Turn, tactical: NO_TACTICAL, track: newTrack(), player, entry, board,
    blockers: new Set(), steps: [], cur: { step: 'activation', events: [], violations: [], hints: [] }, warnings, memo: new Map(),
  };
  return waive(ctx, warnings, board, []);
}
