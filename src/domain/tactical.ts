/**
 * The tactical entry as the plan edits it: counts of units, the moves of each source, the battle's losses, the landing
 * and the production, and what the entry shows on the map. Pure functions of the entry and the state before it; the
 * replay itself lives in src/domain/replay/.
 */
import { fleetSpeed, routeMove, routeReach, type Blockers } from './movement';
import { autoPay } from './payment';
import { fightersFly, isOnMap, productionCost, routeSteps, sourceSlot, systemPlanets, systemSlots, tileIdOf } from './project';
import type { AdjustmentDelta, DataPack, Entry, Game, GameState, Holdings, UnitCounts, UnitId } from './types';

export type TacticalEntry = Extract<Entry, { type: 'tactical' }>;
export type Move = TacticalEntry['moves'][number];

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

/** All the units of a list of moves, landings or the like, added up. */
export const unitsIn = (list: { units: UnitCounts }[]): UnitCounts =>
  list.reduce((sum, item) => addUnits(sum, item.units), {} as UnitCounts);

export const countOf = (units: UnitCounts): number => Object.values(units).reduce<number>((sum, n) => sum + (n ?? 0), 0);

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

/** One more (or fewer) ship of a type removed beyond the fleet pool (37.3); nothing left removes the field. */
export function withFleetRemoval(entry: TacticalEntry, unit: UnitId, amount: number): Partial<TacticalEntry> {
  const units = withCount(entry.fleetRemovals ?? {}, unit, (entry.fleetRemovals?.[unit] ?? 0) + amount);
  return { fleetRemovals: hasUnits(units) ? units : undefined };
}

/** Sets how many of a unit land on a planet; a planet with nothing left to land leaves the landing. */
export function withLanding(entry: TacticalEntry, planetId: string, unit: UnitId, count: number): Partial<TacticalEntry> {
  const current = entry.landings.find(l => l.planetId === planetId)?.units ?? {};
  const rest = entry.landings.filter(l => l.planetId !== planetId);
  const units = withCount(current, unit, count);
  return { landings: hasUnits(units) ? [...rest, { planetId, units }] : rest };
}

/**
 * One more built (1) or taken back (-1), in space or on a planet. A ground force built on a planet is kept by planet.
 * Unless its payment was chosen by hand, a change of the price pays anew from the ready planets.
 */
export function withProduction(
  entry: TacticalEntry, before: GameState, faction: string, unit: UnitId, planetId: string | null, amount: 1 | -1, pack: DataPack, manualPayment: boolean,
): Partial<TacticalEntry> {
  const production = withCount(entry.production, unit, (entry.production[unit] ?? 0) + amount);
  const cost = productionCost(production, faction, before.holdings, pack);
  const seed = !manualPayment && cost !== productionCost(entry.production, faction, before.holdings, pack);
  const { [planetId ?? '']: onPlanet = {}, ...others } = entry.productionGround ?? {};
  const units = withCount(onPlanet, unit, (onPlanet[unit] ?? 0) + amount);
  const productionGround = Object.keys(units).length > 0 ? { ...others, [planetId ?? '']: units } : others;
  return {
    production,
    ...(planetId === null || !isGround(pack, unit) ? {} : { productionGround: Object.keys(productionGround).length > 0 ? productionGround : undefined }),
    ...(seed ? { payment: autoPay(before, cost, 'resources', pack) } : {}),
  };
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

/** The stack a move takes its units from: a planet's ground forces, or the space of a system. */
export const poolOf = (state: Pick<GameState, 'systems' | 'ground'>, pack: DataPack, from: string): UnitCounts | undefined =>
  (from in pack.planets ? state.ground : state.systems)[from];

/** Where a system's units can come from: its space area, then its planets that hold ground forces. */
export function sourcePools(
  game: Game, pack: DataPack, before: GameState, source: string,
): { from: string; name: string | null; available: UnitCounts }[] {
  const planets = systemPlanets(game, source, pack).filter(p => hasUnits(before.ground[p.id]));
  return [
    { from: source, name: null, available: before.systems[source] ?? {} },
    ...planets.map(p => ({ from: p.id, name: p.name, available: before.ground[p.id] })),
  ];
}

/** Whether a system can be the source of a route: it has units of mine, in space or on its planets. */
export const isValidSource = (game: Game, pack: DataPack, before: GameState, slot: string): boolean =>
  sourcePools(game, pack, before, slot).some(pool => hasUnits(pool.available));

/** Whether a unit flies by itself at this point of the replay; everything else rides as cargo. */
export function fliesNow(game: Game, pack: DataPack, holdings: Holdings, unit: UnitId): boolean {
  const def = pack.units[unit];
  if (!def || def.ground) return false;
  return !def.fighter || fightersFly(game, holdings, pack);
}

/** Splits units into the ships that fly by themselves and what rides on board. */
export function splitFlight(game: Game, pack: DataPack, holdings: Holdings, units: UnitCounts): { ships: UnitCounts; cargo: UnitCounts } {
  const ships: UnitCounts = {};
  const cargo: UnitCounts = {};
  for (const unit of Object.keys(units) as UnitId[]) (fliesNow(game, pack, holdings, unit) ? ships : cargo)[unit] = units[unit];
  return { ships, cargo };
}

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

/**
 * A source's flight as it reads: the ships that leave it, what rides on board from the source itself, and what is picked
 * up in each system on the way.
 */
export function flightOf(game: Game, pack: DataPack, holdings: Holdings, entry: TacticalEntry, source: string): { ships: UnitCounts; board: UnitCounts; stops: Map<string, UnitCounts> } {
  const group = groupOf(game, pack, entry.moves, source);
  const own = group.filter(m => m.pickupOf === undefined);
  const leaving = own.filter(m => m.from === source).reduce((sum, m) => ({ ...sum, ...m.units }), {} as UnitCounts);
  const { ships } = splitFlight(game, pack, holdings, leaving);
  const { cargo: board } = splitFlight(game, pack, holdings, unitsIn(own));
  const stops = new Map<string, UnitCounts>();
  for (const move of group) {
    const slot = move.pickupOf === undefined ? null : sourceSlot(game, pack, move.from);
    if (slot !== null) stops.set(slot, addUnits(stops.get(slot) ?? {}, move.units));
  }
  return { ships, board, stops };
}

/** How many of a unit a source's group takes from one place: its space, one of its planets, or a place on its way. */
export const pickedFrom = (group: Move[], from: string, unit: UnitId): number =>
  group.filter(m => m.from === from).reduce((sum, m) => sum + (m.units[unit] ?? 0), 0);

/** What stands at a place before the action, less what the other routes of the action take from it. */
export function availableFor(game: Game, pack: DataPack, before: GameState, entry: TacticalEntry, source: string, from: string, unit: UnitId): number {
  const group = groupOf(game, pack, entry.moves, source);
  const elsewhere = entry.moves.filter(m => m.from === from && !group.includes(m)).reduce((sum, m) => sum + (m.units[unit] ?? 0), 0);
  return (poolOf(before, pack, from)?.[unit] ?? 0) - elsewhere;
}

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

/**
 * The active system after the flight and the battle, before the landing (89.3, 89.4): what arrived, what the battle
 * left, and the ground forces that can land, those still assigned to a landing among them.
 */
export function afterBattle(pack: DataPack, entry: TacticalEntry, before: GameState, order: UnitId[]): { fighting: UnitId[]; left: UnitCounts; landable: UnitId[] } {
  const arrived = addUnits(before.systems[entry.systemId ?? ''] ?? {}, unitsIn(entry.moves));
  const lost = entry.losses ?? {};
  const fighting = order.filter(u => pack.units[u] && ((arrived[u] ?? 0) > 0 || (lost[u] ?? 0) > 0));
  const left = Object.fromEntries(fighting.map(u => [u, Math.max(0, (arrived[u] ?? 0) - (lost[u] ?? 0))])) as UnitCounts;
  const landed = unitsIn(entry.landings);
  const landable = order.filter(u => isGround(pack, u) && ((left[u] ?? 0) > 0 || (landed[u] ?? 0) > 0));
  return { fighting, left, landable };
}

/** Who of mine still stands on a planet after the battle's losses there, before the landing. */
export function standingAfterBattle(before: GameState, planetId: string, lost: Record<string, UnitCounts> = {}): UnitCounts {
  const here = before.ground[planetId] ?? {};
  const left: UnitCounts = {};
  for (const unit of Object.keys(here) as UnitId[]) {
    const count = (here[unit] ?? 0) - (lost[planetId]?.[unit] ?? 0);
    if (count > 0) left[unit] = count;
  }
  return left;
}

export interface RouteArrow { from: string; via: string[]; to: string; pickups: { slot: string; count: number }[] }

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

/** Whether a flight of this entry would show anything: a destination, and a unit its move really finds at the source. */
export function flies(pack: DataPack, entry: TacticalEntry, before: GameState): boolean {
  if (entry.systemId === null) return false;
  return entry.moves.some(move => {
    const pool = poolOf(before, pack, move.from) ?? {};
    return (Object.keys(move.units) as UnitId[]).some(unit => Math.min(move.units[unit] ?? 0, pool[unit] ?? 0) > 0);
  });
}

/** The map during a flight: what flies has left its tile, what is picked up on the way leaves when the leader passes. It lands with the end of the flight. */
export function stateInFlight(pack: DataPack, entry: TacticalEntry, before: GameState, passed: number[]): GameState {
  const state = structuredClone(before);
  entry.moves.forEach((move, index) => {
    if (move.pickupOf !== undefined && !passed.includes(index)) return;
    const pool = poolOf(state, pack, move.from);
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

/** The systems a tap can make the system of an action: any tile on the map. */
export const tileSystems = (game: Game, pack: DataPack): string[] =>
  systemSlots(game).filter(slot => Boolean(pack.tiles[tileIdOf(game, slot)]));

/** The systems that can start a route: those with units of mine, in space or on a planet. */
export const sourceSystems = (game: Game, pack: DataPack, before: GameState): string[] =>
  systemSlots(game).filter(slot => isValidSource(game, pack, before, slot));

/**
 * A route under way: how far the fastest ship of its source flies (`speed`, after the anomalies on the path), the steps
 * taken, what is left, and the systems it can still reach towards the active one. A source without ships has no speed,
 * only its distance. `blockers` are asked for only when the reach is counted.
 */
export function routeHint(
  game: Game, path: string[], before: GameState, active: string | null, pack: DataPack, blockers: () => Blockers,
): { speed: number | null; steps: number; left: number | null; reach: Set<string> } {
  const fastest = fleetSpeed(game, before.systems[path[0]] ?? {}, before.holdings, pack);
  const steps = routeSteps(game, path, pack);
  if (fastest === null) return { speed: null, steps, left: null, reach: new Set() };
  const speed = routeMove(game, path, fastest, pack);
  const reach = active === null ? new Set<string>() : routeReach(game, path, fastest, active, pack, blockers());
  return { speed, steps, left: Math.max(0, speed - steps), reach };
}
