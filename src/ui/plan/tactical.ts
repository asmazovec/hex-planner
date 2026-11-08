import { hexLayout } from '../../domain/hexLayout';
import { fightersFly, isOnMap, sourceSlot, systemPlanets, systemsAdjacent } from '../../domain/project';
import { flightDuration, joinShare, type CurveSegment, type RouteShape } from '../map/geometry';
import type { AdjustmentDelta, DataPack, Entry, Game, GameState, UnitCounts, UnitId } from '../../domain/types';

export type TacticalEntry = Extract<Entry, { type: 'tactical' }>;
export type Move = TacticalEntry['moves'][number];

// TODO(P2-301) #ws:ui-logic-to-domain #type:arch #size:s — арифметика UnitCounts (hasUnits, withCount, addUnits, countOf) нужна и домену; перенести в src/domain вместе с остальной тактикой
export const hasUnits = (units: UnitCounts | undefined): boolean =>
  Object.values(units ?? {}).some(n => (n ?? 0) > 0);

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

// TODO(P2-302) #ws:ui-logic-to-domain #type:arch #dep:P2-300 — правки записи (isUntouched, lossesOf, withLoss, withAdjustedUnit) — правила записи тактики и корректировки, не UI; в src/domain/tactical.ts
/** Nothing of the action is filled in yet, so its system can still change. */
export const isUntouched = (entry: TacticalEntry): boolean =>
  entry.moves.length === 0 && entry.landings.length === 0 && !hasUnits(entry.production) && !hasUnits(entry.losses) && !entry.groundLosses
  && entry.payment.planets.length === 0 && entry.payment.tradeGoods === 0;

/** What the battle of an action cost: each kept as a negative count, as the round's merged losses are. */
export function lossesOf(entry: TacticalEntry): { unit: UnitId; planetId: string | null; count: number }[] {
  const of = (units: UnitCounts, planetId: string | null) =>
    (Object.keys(units) as UnitId[]).filter(unit => (units[unit] ?? 0) > 0).map(unit => ({ unit, planetId, count: -(units[unit] ?? 0) }));
  return [...of(entry.losses ?? {}, null), ...Object.entries(entry.groundLosses ?? {}).flatMap(([planetId, units]) => of(units, planetId))];
}

/** Units that land, so a ground force lost in space can only have been on its way to a landing. */
const LANDERS: UnitId[] = ['infantry', 'mech'];

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

// TODO(P2-303) #ws:ui-logic-to-domain #type:arch #duplicate-of-domain — sourcePools и fliesNow решают, откуда что берётся и кто летит сам (fliesNow повторяет fightersFly и ground домена); в src/domain/tactical.ts
/** Where a system's units can come from: its space area, then its planets that hold ground units. */
export function sourcePools(
  game: Game, pack: DataPack, before: GameState, source: string,
): { from: string; name: string | null; available: UnitCounts }[] {
  const planets = systemPlanets(game, source, pack).filter(p => hasUnits(before.ground[p.id]));
  return [
    { from: source, name: null, available: before.systems[source] ?? {} },
    ...planets.map(p => ({ from: p.id, name: p.name, available: before.ground[p.id] })),
  ];
}

/** Whether a unit flies by itself at this point of the replay; everything else rides as cargo. */
export function fliesNow(game: Game, pack: DataPack, upgrades: UnitId[], unit: UnitId): boolean {
  const def = pack.units[unit];
  if (!def || def.ground) return false;
  return !def.fighter || fightersFly(game, upgrades, pack);
}

// TODO(P2-304) #ws:ui-logic-to-domain #type:arch — модель ходов тактики (sourcesOf, groupOf, viaOf, withRoute, withoutSource, withUnitCount, withoutEmptySources) живёт в UI, а project.ts группирует ходы тем же sourceSlot; в src/domain/tactical.ts
/** The source systems of an action, in the order of their moves. */
export function sourcesOf(game: Game, pack: DataPack, entry: TacticalEntry): string[] {
  const slots = entry.moves.filter(m => m.pickupOf === undefined).map(m => sourceSlot(game, pack, m.from));
  return [...new Set(slots)].filter((s): s is string => s !== null);
}

/** The moves of one source: its space area, its planets, and what it picks up on the way. */
export function groupOf(game: Game, pack: DataPack, moves: Move[], source: string): Move[] {
  return moves.filter(m => (m.pickupOf === undefined ? sourceSlot(game, pack, m.from) === source : m.pickupOf === source));
}

const mainMove = (moves: Move[], source: string): Move | undefined =>
  moves.find(m => m.from === source && m.pickupOf === undefined);

export const viaOf = (entry: Pick<TacticalEntry, 'moves'>, source: string): string[] => mainMove(entry.moves, source)?.via ?? [];

/** Sets the way of a source, adding the source if it is new. What it picked up in systems no longer on the way goes. */
export function withRoute(game: Game, pack: DataPack, moves: Move[], source: string, via: string[]): Move[] {
  const kept = moves.filter(m => m.pickupOf !== source || via.includes(sourceSlot(game, pack, m.from) ?? ''));
  const main: Move = { from: source, units: mainMove(moves, source)?.units ?? {}, ...(via.length > 0 ? { via } : {}) };
  return mainMove(moves, source) ? kept.map(m => (m.from === source && m.pickupOf === undefined ? main : m)) : [...kept, main];
}

export function withoutSource(game: Game, pack: DataPack, moves: Move[], source: string): Move[] {
  const group = groupOf(game, pack, moves, source);
  return moves.filter(m => !group.includes(m));
}

/** Sets a count in a source's group. `from` is the source, one of its planets, or a system or planet on its way. */
export function withUnitCount(game: Game, pack: DataPack, moves: Move[], source: string, from: string, unit: UnitId, count: number): Move[] {
  const pickup = sourceSlot(game, pack, from) !== source;
  const same = (m: Move) => m.from === from && (pickup ? m.pickupOf === source : m.pickupOf === undefined);
  const known = moves.find(same);
  const units = withCount(known?.units ?? {}, unit, count);
  const item: Move = known ? { ...known, units } : { from, units, ...(pickup ? { pickupOf: source } : {}) };
  const next = known ? moves.map(m => (m === known ? item : m)) : [...moves, item];
  // The source's own move stays even when empty: it holds the arrow and the way.
  return next.filter(m => m !== item || hasUnits(m.units) || (m.from === source && m.pickupOf === undefined));
}

/** When the editor closes: a source with nothing chosen goes, and with it the empty moves. */
export function withoutEmptySources(game: Game, pack: DataPack, moves: Move[]): Move[] {
  return moves.filter(m => {
    if (hasUnits(m.units)) return true;
    return m.pickupOf === undefined && groupOf(game, pack, moves, m.from).some(other => hasUnits(other.units));
  });
}

// TODO(P2-305) #ws:ui-logic-to-domain #type:arch #size:s — arrowsOf и entrySystems выводят из записи стрелки и системы для камеры: чистые функции записи, в src/domain/tactical.ts
export interface RouteArrow { from: string; via: string[]; to: string; pickups: { slot: string; count: number }[] }

const countOf = (units: UnitCounts): number => Object.values(units).reduce<number>((sum, n) => sum + (n ?? 0), 0);

/** One arrow per source system. */
export function arrowsOf(game: Game, pack: DataPack, entry: TacticalEntry): RouteArrow[] {
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
export function entrySystems(game: Game, pack: DataPack, entry: Entry): string[] {
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
  return [...new Set(slots)].filter((s): s is string => Boolean(s) && isOnMap(game, s as string));
}

/** A cell of a route's formation. `joins` say when its units come on board, as a share of the route's length; 0 is the start. */
export interface FlightStack {
  kind: UnitId;
  x: number;
  y: number;
  size: number;
  joins: { at: number; count: number; move: number }[];
}
export interface FlightRoute { segments: CurveSegment[]; durationMs: number; delayMs: number; stacks: FlightStack[] }

const STAGGER_MS = 60;

/** What flies when an action is played: only what really exists, as a rigid formation per route, laid out as on a tile with no planets. */
export function flightRoutes(game: Game, pack: DataPack, entry: TacticalEntry, before: GameState, shapeOf: (from: string) => RouteShape | undefined): FlightRoute[] {
  const left = structuredClone({ systems: before.systems, ground: before.ground });
  const routes: FlightRoute[] = [];
  for (const from of sourcesOf(game, pack, entry)) {
    const shape = shapeOf(from);
    if (!shape || entry.systemId === null) continue;
    const slots = [from, ...viaOf(entry, from), entry.systemId];
    const { segments } = shape;
    const joins = new Map<UnitId, FlightStack['joins']>();
    entry.moves.forEach((move, index) => {
      if (!groupOf(game, pack, [move], from).length) return;
      // TODO(P2-307) #ws:ui-logic-to-domain #type:dup #size:s #dep:P2-306 — выбор пула «планета или космос» по move.from повторён в flightRoutes, flies, stateInFlight и UnitPicker.available; один доменный poolOf
      const pool = (move.from in pack.planets ? left.ground : left.systems)[move.from] ?? {};
      const stop = move.pickupOf === undefined ? 0 : slots.indexOf(sourceSlot(game, pack, move.from) ?? '');
      for (const unit of Object.keys(move.units) as UnitId[]) {
        const count = Math.min(move.units[unit] ?? 0, pool[unit] ?? 0);
        if (count <= 0) continue;
        pool[unit] = (pool[unit] ?? 0) - count;
        joins.set(unit, [...(joins.get(unit) ?? []), { at: stop > 0 ? joinShare(segments, stop) : 0, count, move: index }]);
      }
    });
    if (joins.size === 0) continue;
    const space = [...joins].map(([kind, list]) => ({ kind, owner: 'me', count: list.reduce((sum, j) => sum + j.count, 0) }));
    const { items } = hexLayout({ planets: 0, ground: [], space });
    routes.push({
      segments,
      durationMs: flightDuration(slots, systemsAdjacent(game)),
      delayMs: routes.length * STAGGER_MS,
      stacks: items.map(item => ({ kind: item.kind as UnitId, x: item.x, y: item.y, size: item.size, joins: joins.get(item.kind as UnitId) ?? [] })),
    });
  }
  return routes;
}

// TODO(P2-306) #ws:ui-logic-to-domain #type:arch #duplicate-of-domain — flies и stateInFlight повторяют снятие юнитов и выставление жетона из applyTactical (project.ts); состояние в полёте должен давать домен шагом replay
/** Whether a flight of this entry would show anything: a destination, and a unit its move really finds at the source. */
export function flies(pack: DataPack, entry: TacticalEntry, before: GameState): boolean {
  if (entry.systemId === null) return false;
  return entry.moves.some(move => {
    const pool = (move.from in pack.planets ? before.ground : before.systems)[move.from] ?? {};
    return (Object.keys(move.units) as UnitId[]).some(unit => Math.min(move.units[unit] ?? 0, pool[unit] ?? 0) > 0);
  });
}

/** The map during a flight: what flies has left its tile, what is picked up on the way leaves when the leader passes. It lands with the end of the flight. */
export function stateInFlight(pack: DataPack, entry: TacticalEntry, before: GameState, passed: number[]): GameState {
  const state = structuredClone(before);
  entry.moves.forEach((move, index) => {
    if (move.pickupOf !== undefined && !passed.includes(index)) return;
    const pool = (move.from in pack.planets ? state.ground : state.systems)[move.from];
    if (!pool) return;
    for (const unit of Object.keys(move.units) as UnitId[]) {
      const count = (pool[unit] ?? 0) - (move.units[unit] ?? 0);
      if (count > 0) pool[unit] = count;
      else delete pool[unit];
    }
  });
  if (!entry.free && entry.systemId !== null && !state.tokensOnMap.includes(entry.systemId)) state.tokensOnMap.push(entry.systemId);
  return state;
}
