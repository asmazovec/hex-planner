/**
 * The tactical entry as the plan edits it: counts of units, the moves of each source, the battle's losses, the landing
 * and the production, and what the entry shows on the map. Pure functions of the entry and the state before it; the
 * replay itself lives in src/domain/replay/.
 */
import { boardSlots } from './movement';
import type { MapSource } from './replay/board';
import { isOnMap, sourceSlot } from './replay';
import type { Pools } from './readers';
import type { AdjustmentDelta, DataPack, StructureCounts, StructureKind, UnitCounts, UnitId } from './types';
import type { TurnFacts } from '../game/turnFacts';
import type { TableFacts } from './facts';

export type TacticalEntry = Extract<TurnFacts, { type: 'tactical' }>;
export type Move = TacticalEntry['moves'][number];

export const hasUnits = (units: UnitCounts | undefined): boolean =>
  Object.values(units ?? {}).some(n => (n ?? 0) > 0);

export const hasStructures = (structures: StructureCounts | undefined): boolean =>
  Object.values(structures ?? {}).some(n => (n ?? 0) > 0);

/** Whether a move carries anything: units, or structures taken on board. */
export const hasCargo = (move: { units: UnitCounts; structures?: StructureCounts }): boolean => hasUnits(move.units) || hasStructures(move.structures);

/** Sets one unit count, dropping the unit at zero. */
export function withCount(units: UnitCounts, unit: UnitId, count: number): UnitCounts {
  const next = { ...units };
  if (count > 0) next[unit] = count;
  else delete next[unit];
  return next;
}

export function addUnits(target: UnitCounts, units: UnitCounts): UnitCounts {
  const sum = { ...target };
  for (const id of Object.keys(units) as UnitId[]) sum[id] = (sum[id] ?? 0) + (units[id] ?? 0);
  return sum;
}

/** All the units of a list of moves, landings or the like, added up. */
export const unitsIn = (list: { units: UnitCounts }[]): UnitCounts =>
  list.reduce((sum, item) => addUnits(sum, item.units), {} as UnitCounts);

export const countOf = (units: UnitCounts): number => Object.values(units).reduce<number>((sum, n) => sum + (n ?? 0), 0);

/** What the battle of an action cost: each kept as a negative count, as the round's merged losses are. */
export function lossesOf(entry: TacticalEntry): { unit: UnitId; planetId: string | null; count: number }[] {
  const of = (units: UnitCounts, planetId: string | null) =>
    (Object.keys(units) as UnitId[]).filter(unit => (units[unit] ?? 0) > 0).map(unit => ({ unit, planetId, count: -(units[unit] ?? 0) }));
  return [...of(entry.losses ?? {}, null), ...Object.entries(entry.groundLosses ?? {}).flatMap(([planetId, units]) => of(units, planetId))];
}

/** Units that land, so a ground force lost in space can only have been on its way to a landing. */
const LANDERS: UnitId[] = ['infantry', 'mech'];

/** Whether a unit is a ground force, one that lands on planets. */
export const isGround = (pack: DataPack, unit: UnitId): boolean => pack.units[unit]?.ground === true;

/**
 * One more lost (-1) or given back (1), in space or on a planet; nothing left leaves no trace in the entry. A unit this
 * action lands that falls in its battle never makes the landing: it leaves the landing and counts as lost on the way.
 * Its landing stays, empty if need be, so that giving the unit back (78.6.2) lands it there again.
 */
export function withLoss(entry: TacticalEntry, unit: UnitId, planetId: string | null, amount: number): Partial<TacticalEntry> {
  const landing = entry.landings.find(l => l.planetId === planetId);
  if (planetId !== null && amount < 0 && landing && (landing.units[unit] ?? 0) > 0) {
    const units = withCount(landing.units, unit, (landing.units[unit] ?? 0) + amount);
    return {
      landings: entry.landings.map(l => (l === landing ? { ...l, units } : l)),
      losses: withCount(entry.losses ?? {}, unit, (entry.losses?.[unit] ?? 0) - amount),
    };
  }
  const back = entry.landings[0];
  if (planetId === null && amount > 0 && back && LANDERS.includes(unit) && (entry.losses?.[unit] ?? 0) > 0) {
    const losses = withCount(entry.losses ?? {}, unit, (entry.losses?.[unit] ?? 0) - amount);
    const units = withCount(back.units, unit, (back.units[unit] ?? 0) + amount);
    return { landings: entry.landings.map(l => (l === back ? { ...l, units } : l)), losses: hasUnits(losses) ? losses : undefined };
  }
  if (planetId === null) {
    const units = withCount(entry.losses ?? {}, unit, (entry.losses?.[unit] ?? 0) - amount);
    return { losses: hasUnits(units) ? units : undefined };
  }
  const { [planetId]: here = {}, ...others } = entry.groundLosses ?? {};
  const units = withCount(here, unit, (here[unit] ?? 0) - amount);
  const groundLosses = hasUnits(units) ? { ...others, [planetId]: units } : others;
  return { groundLosses: Object.keys(groundLosses).length > 0 ? groundLosses : undefined };
}

export const withStructure = (structures: StructureCounts | undefined, kind: StructureKind, count: number): StructureCounts | undefined => {
  const { [kind]: gone, ...rest } = structures ?? {};
  void gone;
  const next: StructureCounts = count > 0 ? { ...rest, [kind]: count } : rest;
  return Object.keys(next).length > 0 ? next : undefined;
};

/** A signed change of one unit in a manual adjustment: in the space of its system, or on a planet. */
export function withAdjustedUnit(delta: AdjustmentDelta, slot: string, unit: UnitId, planetId: string | null, amount: number): AdjustmentDelta {
  const shifted = (units: UnitCounts): UnitCounts => {
    const { [unit]: count = 0, ...rest } = units;
    return count + amount === 0 ? rest : { ...rest, [unit]: count + amount };
  };
  if (planetId === null) return { ...delta, units: { systemId: slot, units: shifted(delta.units?.units ?? {}) } };
  const { [planetId]: here = {}, ...others } = delta.ground ?? {};
  const units = shifted(here);
  const ground = Object.keys(units).length > 0 ? { ...others, [planetId]: units } : others;
  return { ...delta, units: delta.units ?? { systemId: slot, units: {} }, ground: Object.keys(ground).length > 0 ? ground : undefined };
}

/** The stack a move takes its units from: a planet's ground forces, or the space of a system. */
export const poolOf = (state: Pools, pack: DataPack, from: string): UnitCounts | undefined =>
  (from in pack.planets ? state.ground : state.systems)[from];

/** The source systems of an action, in the order of their moves. */
export function sourcesOf(game: MapSource, pack: DataPack, entry: TacticalEntry): string[] {
  const slots = entry.moves.filter(m => m.pickupOf === undefined).map(m => sourceSlot(game, pack, m.from));
  return [...new Set(slots)].filter((s): s is string => s !== null);
}

/** The moves of one source: its space area, its planets, and what it picks up on the way. */
export function groupOf(game: MapSource, pack: DataPack, moves: Move[], source: string): Move[] {
  return moves.filter(m => (m.pickupOf === undefined ? sourceSlot(game, pack, m.from) === source : m.pickupOf === source));
}

const mainMove = (moves: Move[], source: string): Move | undefined =>
  moves.find(m => m.from === source && m.pickupOf === undefined);

export const viaOf = (entry: Pick<TacticalEntry, 'moves'>, source: string): string[] => mainMove(entry.moves, source)?.via ?? [];

/** Sets the way of a source, adding the source if it is new. What it picked up in systems no longer on the way goes. */
export function withRoute(game: TableFacts, pack: DataPack, moves: Move[], source: string, via: string[]): Move[] {
  const kept = moves.filter(m => m.pickupOf !== source || via.includes(sourceSlot(game, pack, m.from) ?? ''));
  const { via: old, ...known } = mainMove(moves, source) ?? { from: source, units: {} };
  void old;
  const main: Move = { ...known, ...(via.length > 0 ? { via } : {}) };
  return mainMove(moves, source) ? kept.map(m => (m.from === source && m.pickupOf === undefined ? main : m)) : [...kept, main];
}

export function withoutSource(game: TableFacts, pack: DataPack, moves: Move[], source: string): Move[] {
  const group = groupOf(game, pack, moves, source);
  return moves.filter(m => !group.includes(m));
}

/** When the editor closes: a source with nothing chosen goes, and with it the empty moves. */
export function withoutEmptySources(game: TableFacts, pack: DataPack, moves: Move[]): Move[] {
  return moves.filter(m => {
    if (hasCargo(m)) return true;
    return m.pickupOf === undefined && groupOf(game, pack, moves, m.from).some(hasCargo);
  });
}

export interface RouteArrow { from: string; via: string[]; to: string; pickups: { slot: string; count: number }[] }

/** One arrow per source system. */
export function arrowsOf(game: TableFacts, pack: DataPack, entry: TacticalEntry): RouteArrow[] {
  const to = entry.systemId;
  if (to === null) return [];
  return sourcesOf(game, pack, entry).filter(from => from !== to).map(from => {
    const group = groupOf(game, pack, entry.moves, from);
    const taken = new Map<string, number>();
    for (const move of group) {
      const slot = move.pickupOf === undefined ? null : sourceSlot(game, pack, move.from);
      if (slot !== null) taken.set(slot, (taken.get(slot) ?? 0) + countOf(move.units));
    }
    return {
      from, to, via: viaOf(entry, from),
      pickups: [...taken].filter(([, count]) => count > 0).map(([slot, count]) => ({ slot, count })),
    };
  });
}

/** The systems an entry touches, for the camera. */
export function entrySystems(game: TableFacts, pack: DataPack, entry: TurnFacts): string[] {
  const slots: (string | null | undefined)[] = [];
  if (entry.type === 'tactical') {
    slots.push(entry.systemId, ...sourcesOf(game, pack, entry));
    for (const move of entry.moves) slots.push(...(move.via ?? []), sourceSlot(game, pack, move.from));
  } else if (entry.type === 'strategic' || entry.type === 'secondary') {
    const { effects } = entry;
    slots.push(effects?.systemId, effects?.production?.systemId, ...(effects?.structures ?? []).map(s => sourceSlot(game, pack, s.planetId)));
    slots.push(...(effects?.readied ?? []).map(id => sourceSlot(game, pack, id)));
  } else if (entry.type === 'adjustment') {
    slots.push(entry.delta.units?.systemId, ...Object.keys(entry.delta.ground ?? {}).map(id => sourceSlot(game, pack, id)));
  }
  const board = new Set(boardSlots(game, pack));
  return [...new Set(slots)].filter((s): s is string => Boolean(s) && (isOnMap(game, s as string) || board.has(s as string)));
}

/** Whether a flight of this entry would show anything: a destination and a unit in its moves. What was entered flies, whether or not it stands at the source. */
export function flies(entry: TacticalEntry): boolean {
  return entry.systemId !== null && entry.moves.some(move => hasUnits(move.units));
}
