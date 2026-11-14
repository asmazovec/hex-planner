import type { DataPack, GameState, UnitId, StructureKind, StructureCounts, Game, UnitCounts, Holdings } from '../../../domain/types';
import { type TacticalEntry, poolOf, hasUnits, withCount, hasStructures, withStructure, type Move, groupOf, hasCargo, isGround, unitsIn, addUnits, sourcesOf } from '../../../domain/tactical';
import { sourceSlot, productionCost, systemPlanets, fightersFly, tileIdOf, routeSteps } from '../../../domain/replay/index';
import { holderOf } from '../../../domain/effects/registry';
import { autoPay } from './payment';
import { boardSlots, type Blockers, type MoveView, linksOf, fleetSpeed, routeMove, routeReach } from '../../../domain/movement';
import { MECATOL_PLANETS, CUSTODIANS_COST } from '../../../domain/mecatol';
import { productionDue } from './replay/production';
/** Nothing of the action is filled in yet, so its system can still change. */
export const isUntouched = (entry: TacticalEntry): boolean =>
  entry.moves.length === 0 && entry.landings.length === 0 && !hasUnits(entry.production) && !hasUnits(entry.losses) && !entry.groundLosses
  && entry.payment.planets.length === 0 && entry.payment.tradeGoods === 0;
/** One more (or fewer) ship of a type removed beyond the fleet pool (37.3); nothing left removes the field. */
export function withFleetRemoval(entry: TacticalEntry, unit: UnitId, amount: number): Partial<TacticalEntry> {
  const units = withCount(entry.fleetRemovals ?? {}, unit, (entry.fleetRemovals?.[unit] ?? 0) + amount);
  return { fleetRemovals: hasUnits(units) ? units : undefined };
}
/** Sets how many of a unit land on a planet; a planet with nothing left to land leaves the landing. */
export function withLanding(entry: TacticalEntry, planetId: string, unit: UnitId, count: number): Partial<TacticalEntry> {
  const known = entry.landings.find(l => l.planetId === planetId && l.from === undefined);
  const rest = entry.landings.filter(l => l !== known);
  const units = withCount(known?.units ?? {}, unit, count);
  return { landings: hasUnits(units) || hasStructures(known?.structures) ? [...rest, { ...known, planetId, units }] : rest };
}
/** How many of a unit are committed to land on `planetId` from the planet `from` (49.2: a component lets it). */
export const landedFrom = (entry: TacticalEntry, planetId: string, from: string, unit: UnitId): number =>
  entry.landings.find(l => l.planetId === planetId && l.from === from)?.units[unit] ?? 0;
/** Sets how many of a unit are committed to land on `planetId` from the planet `from`; a landing with nothing left goes. */
export function withLandingFrom(entry: TacticalEntry, planetId: string, from: string, unit: UnitId, count: number): Partial<TacticalEntry> {
  const known = entry.landings.find(l => l.planetId === planetId && l.from === from);
  const rest = entry.landings.filter(l => l !== known);
  const units = withCount(known?.units ?? {}, unit, count);
  return { landings: hasUnits(units) ? [...rest, { planetId, units, from }] : rest };
}
/** Sets how many structures of a kind an action puts on a planet from the space area of its system; a planet with nothing left leaves the landing. */
export function withLandedStructure(entry: TacticalEntry, planetId: string, kind: StructureKind, count: number): Partial<TacticalEntry> {
  const known = entry.landings.find(l => l.planetId === planetId && l.from === undefined);
  const rest = entry.landings.filter(l => l !== known);
  const { structures: old, ...kept } = known ?? { planetId, units: {} };
  const structures = withStructure(old, kind, count);
  return { landings: hasUnits(kept.units) || structures ? [...rest, { ...kept, ...(structures ? { structures } : {}) }] : rest };
}
/** The structures that stand in the space area of the active system once the flights of an action arrived: those already there and those it brings. */
export function structuresArrived(entry: TacticalEntry, before: GameState): StructureCounts {
  const sum: StructureCounts = { ...before.afloat?.[entry.systemId ?? ''] };
  for (const move of entry.moves) {
    if (move.from === entry.systemId) continue;
    for (const kind of Object.keys(move.structures ?? {}) as StructureKind[]) sum[kind] = (sum[kind] ?? 0) + (move.structures?.[kind] ?? 0);
  }
  return sum;
}
/** How many structures of a kind stand at a place before the action: on a planet, or in the space area of a system. */
export const structuresAt = (before: GameState, pack: DataPack, from: string, kind: StructureKind): number =>
  (from in pack.planets ? (kind === 'pds' ? before.pds[from] ?? 0 : before.docks.includes(from) ? 1 : 0) : before.afloat?.[from]?.[kind] ?? 0);
/** How many structures of a kind a source's group takes from one place. */
export const pickedStructures = (group: Move[], from: string, kind: StructureKind): number =>
  group.filter(m => m.from === from).reduce((sum, m) => sum + (m.structures?.[kind] ?? 0), 0);
/** The structures of a kind at a place before the action, less what the other routes of the action take from it. */
export function structuresFor(game: Game, pack: DataPack, before: GameState, entry: TacticalEntry, source: string, from: string, kind: StructureKind): number {
  const group = groupOf(game, pack, entry.moves, source);
  const elsewhere = entry.moves.filter(m => m.from === from && !group.includes(m)).reduce((sum, m) => sum + (m.structures?.[kind] ?? 0), 0);
  return structuresAt(before, pack, from, kind) - elsewhere;
}
/** Sets how many structures of a kind a source's group takes on board at `from`: one of its planets, or a planet or system on its way. */
export function withStructureCount(game: Game, pack: DataPack, moves: Move[], source: string, from: string, kind: StructureKind, count: number): Move[] {
  const pickup = sourceSlot(game, pack, from) !== source;
  const same = (m: Move) => m.from === from && (pickup ? m.pickupOf === source : m.pickupOf === undefined);
  const known = moves.find(same);
  const { structures: old, ...kept } = known ?? { from, units: {}, ...(pickup ? { pickupOf: source } : {}) };
  const structures = withStructure(old, kind, count);
  const item: Move = { ...kept, ...(structures ? { structures } : {}) };
  const next = known ? moves.map(m => (m === known ? item : m)) : [...moves, item];
  return next.filter(m => m !== item || hasCargo(m) || (m.from === source && m.pickupOf === undefined));
}
/**
 * One more built (1) or taken back (-1), in space or on a planet. A ground force built on a planet is kept by planet.
 * Unless its payment was chosen by hand, a change of the price pays anew from the ready planets.
 */
export function withProduction(
  entry: TacticalEntry, before: GameState, faction: string, unit: UnitId, planetId: string | null, amount: 1 | -1, pack: DataPack, manualPayment: boolean,
  game?: Game,
): Partial<TacticalEntry> {
  const production = withCount(entry.production, unit, (entry.production[unit] ?? 0) + amount);
  const holder = holderOf({ faction }, before);
  // With the game the price is what the check asks (the combined cost counts); without it, the sum of the units.
  const due = (units: UnitCounts) => (game ? productionDue(game, before, units, pack, entry) : productionCost(units, faction, holder, pack, entry));
  const cost = due(production);
  const seed = !manualPayment && cost !== due(entry.production);
  const { [planetId ?? '']: onPlanet = {}, ...others } = entry.productionGround ?? {};
  const units = withCount(onPlanet, unit, (onPlanet[unit] ?? 0) + amount);
  const productionGround = Object.keys(units).length > 0 ? { ...others, [planetId ?? '']: units } : others;
  return {
    production,
    ...(planetId === null || !isGround(pack, unit) ? {} : { productionGround: Object.keys(productionGround).length > 0 ? productionGround : undefined }),
    ...(seed ? { payment: autoPay(before, cost, 'resources', pack, { faction }) } : {}),
  };
}
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
/** Sets a count in a source's group. `from` is the source, one of its planets, or a system or planet on its way. */
export function withUnitCount(game: Game, pack: DataPack, moves: Move[], source: string, from: string, unit: UnitId, count: number): Move[] {
  const pickup = sourceSlot(game, pack, from) !== source;
  const same = (m: Move) => m.from === from && (pickup ? m.pickupOf === source : m.pickupOf === undefined);
  const known = moves.find(same);
  const units = withCount(known?.units ?? {}, unit, count);
  const item: Move = known ? { ...known, units } : { from, units, ...(pickup ? { pickupOf: source } : {}) };
  const next = known ? moves.map(m => (m === known ? item : m)) : [...moves, item];
  // The source's own move stays even when empty: it holds the arrow and the way.
  return next.filter(m => m !== item || hasCargo(m) || (m.from === source && m.pickupOf === undefined));
}
/** The sources with nothing chosen: no ship flies from them, nothing rides on board and nothing is picked up on their way. */
export const emptySources = (game: Game, pack: DataPack, entry: TacticalEntry): string[] =>
  sourcesOf(game, pack, entry).filter(source => !groupOf(game, pack, entry.moves, source).some(hasCargo));
/**
 * The active system after the flight and the battle, before the landing (89.3, 89.4): what arrived, what the battle
 * left, and the ground forces that can land, those still assigned to a landing among them.
 */
export function afterBattle(pack: DataPack, entry: TacticalEntry, before: GameState, order: UnitId[]): { fighting: UnitId[]; left: UnitCounts; landable: UnitId[] } {
  const arrived = addUnits(before.systems[entry.systemId ?? ''] ?? {}, unitsIn(entry.moves));
  const lost = entry.losses ?? {};
  const fighting = order.filter(u => pack.units[u] && ((arrived[u] ?? 0) > 0 || (lost[u] ?? 0) > 0));
  const left = Object.fromEntries(fighting.map(u => [u, Math.max(0, (arrived[u] ?? 0) - (lost[u] ?? 0))])) as UnitCounts;
  const landed = unitsIn(entry.landings.filter(l => l.from === undefined));
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
/** The systems a tap can make the system of an action: any tile on the map. */
export const tileSystems = (game: Game, pack: DataPack): string[] =>
  boardSlots(game, pack).filter(slot => Boolean(pack.tiles[tileIdOf(game, slot)]));
/** The systems that can start a route: those with units of mine, in space or on a planet. */
export const sourceSystems = (game: Game, pack: DataPack, before: GameState): string[] =>
  boardSlots(game, pack).filter(slot => isValidSource(game, pack, before, slot));
/**
 * A route under way: how far the fastest ship of its source flies (`speed`, after the anomalies on the path), the steps
 * taken, what is left, and the systems it can still reach towards the active one. A source without ships has no speed,
 * only its distance. `blockers` are asked for only when the reach is counted.
 */
export function routeHint(
  game: Game, path: string[], before: GameState, active: string | null, pack: DataPack, blockers: () => Blockers,
): { speed: number | null; steps: number; left: number | null; reach: Set<string> } {
  // The components of the player answer for the start, the active system and the group, as in the replay of the move.
  const group = before.systems[path[0]] ?? {};
  const view: MoveView = {
    holder: holderOf(game, before), state: before, from: path[0], target: active ?? undefined, group,
    links: linksOf(game, pack, { state: before, during: 'tactical' }),
  };
  const fastest = fleetSpeed(game, group, holderOf(game, before), pack, view);
  const steps = routeSteps(game, path, pack);
  if (fastest === null) return { speed: null, steps, left: null, reach: new Set() };
  const speed = routeMove(game, path, fastest, pack, undefined, view);
  const reach = active === null ? new Set<string>() : routeReach(game, path, fastest, active, pack, blockers(), view);
  return { speed, steps, left: Math.max(0, speed - steps), reach };
}
/**
 * The Mecatol Rex planet this entry lands ground forces on while the custodians token still stands on it (the state
 * before the entry: no one controls it, no one has removed the token), or undefined. Its removal is paid in
 * `custodiansPayment`.
 */
export function custodiansLanding(before: Pick<GameState, 'control' | 'custodiansRemoved'>, entry: TacticalEntry, pack: DataPack): string | undefined {
  if (before.custodiansRemoved) return undefined;
  return entry.landings.find(l => MECATOL_PLANETS.includes(l.planetId) && before.control[l.planetId] === undefined
    && (Object.keys(l.units) as UnitId[]).some(unit => l.units[unit] && isGround(pack, unit)))?.planetId;
}
/** The entry with the payment of the custodians token seeded or dropped to follow its landing: automatic unless the ability frees the price. */
export function withCustodiansPayment(entry: TacticalEntry, before: GameState, faction: string, pack: DataPack, free: boolean): Partial<TacticalEntry> {
  if (custodiansLanding(before, entry, pack) === undefined) return entry.custodiansPayment ? { custodiansPayment: undefined } : {};
  if (entry.custodiansPayment !== undefined || free) return {};
  return { custodiansPayment: autoPay(before, CUSTODIANS_COST, 'influence', pack, { faction }) };
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
