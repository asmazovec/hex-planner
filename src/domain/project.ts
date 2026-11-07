import { EXPEDITION_SLICES, readyPlanetIds, type PaymentKind } from './payment';
import { absentHomePlanets, CARD, cardCost, cardsHeld, costsStrategyToken, freeTokens, homePlanets, homeSlot, startingDocks, STATUS_TOKENS, type CardEntry } from './strategy';
import { rotateLanes } from './lanes';
import { gameAs } from './players';
import { areAdjacent, gridDistance, oppositeEdge, slotAcross, type Adjacency } from './route';
import { productionCost, unitStats } from './unitStats';
import type {
  Anomaly, DataPack, Entry, Game, GameState, Payment, Phase, Plan, PlanetDef, Projection, UnitCounts, UnitId, Warning,
} from './types';

export { productionCost };

const PHASE_ORDER: Phase[] = ['strategy', 'action', 'status', 'agenda'];
const THUNDERS_EDGE_PLANET = 'thundersedge';

const unitIds = (units: UnitCounts): UnitId[] =>
  (Object.keys(units) as UnitId[]).filter(id => (units[id] ?? 0) > 0);

const sumPlanets = (state: GameState, pack: DataPack, field: PaymentKind): number =>
  readyPlanetIds(state).reduce((total, id) => total + (pack.planets[id]?.[field] ?? 0), 0);

export const readyResources = (state: GameState, pack: DataPack): number => sumPlanets(state, pack, 'resources');
export const readyInfluence = (state: GameState, pack: DataPack): number => sumPlanets(state, pack, 'influence');

export const tileIdOf = (game: Game, systemId: string): string => (game.map[systemId] ?? game.fracture.tiles?.[systemId] ?? systemId).split('@')[0];

/** Whether a slot holds a system ships can go to: a tile of the map, or of the open Fracture. */
export const isOnMap = (game: Game, slot: string): boolean => game.map[slot] !== undefined || game.fracture.tiles?.[slot] !== undefined;

/** Grid neighbours, except across the edge of the Fracture: its systems do not touch the map they stand next to. */
export const systemsAdjacent = (game: Game): Adjacency => (a, b) =>
  areAdjacent(a, b) && Boolean(game.fracture.tiles?.[a]) === Boolean(game.fracture.tiles?.[b]);

/** Every slot holding a system. */
export const systemSlots = (game: Game): string[] => [...Object.keys(game.map), ...Object.keys(game.fracture.tiles ?? {})];

const routeGraphs = new WeakMap<Game, Map<string, string[]>>();

const tileAt = (game: Game, slot: string, pack: DataPack) => pack.tiles[tileIdOf(game, slot)];
const isLane = (game: Game, slot: string, pack: DataPack): boolean => tileAt(game, slot, pack)?.kind === 'hyperlane';

/** The edges a line of this hyperlane leads to from one edge, or from any with none given. A tile whose lines the data lacks joins all its sides. */
function laneExits(game: Game, slot: string, entry: number | null, pack: DataPack): number[] {
  const known = tileAt(game, slot, pack)?.lanes;
  if (!known) return [0, 1, 2, 3, 4, 5].filter(edge => edge !== entry);
  const turns = Number((game.map[slot] ?? '').split('@')[1] ?? 0) % 6 || 0;
  const lanes = rotateLanes(known, turns);
  if (entry === null) return lanes.flat();
  return lanes.flatMap(([a, b]) => (a === entry ? [b] : b === entry ? [a] : []));
}

/** The systems at the far ends of the lines leaving a hyperlane, through any hyperlanes that follow it. */
function systemsAlongLanes(game: Game, slot: string, entry: number | null, pack: DataPack, seen = new Set<string>()): string[] {
  return laneExits(game, slot, entry, pack).flatMap(edge => {
    const next = slotAcross(slot, edge);
    if (next === null || !isOnMap(game, next)) return [];
    if (!isLane(game, next, pack)) return [next];
    const arrival = `${next}:${oppositeEdge(edge)}`;
    if (seen.has(arrival)) return [];
    seen.add(arrival);
    return systemsAlongLanes(game, next, oppositeEdge(edge), pack, seen);
  });
}

/** What a ship can step to from each system: its neighbours, those a hyperlane's line joins it to, and those sharing a wormhole with it. */
function routeGraph(game: Game, pack: DataPack): Map<string, string[]> {
  const known = routeGraphs.get(game);
  if (known) return known;
  const slots = systemSlots(game);
  const adjacent = systemsAdjacent(game);
  const holes = (slot: string) => tileAt(game, slot, pack)?.wormholes ?? [];
  const stepsOf = (slot: string): string[] => {
    if (isLane(game, slot, pack)) return systemsAlongLanes(game, slot, null, pack);
    const across = [0, 1, 2, 3, 4, 5].flatMap(edge => {
      const next = slotAcross(slot, edge);
      if (next === null || !isOnMap(game, next) || !adjacent(slot, next)) return [];
      return isLane(game, next, pack) ? systemsAlongLanes(game, next, oppositeEdge(edge), pack) : [next];
    });
    return [...across, ...slots.filter(other => holes(slot).some(hole => holes(other).includes(hole)))];
  };
  const graph = new Map(slots.map(slot => [slot, [...new Set(stepsOf(slot))].filter(other => other !== slot)]));
  routeGraphs.set(game, graph);
  return graph;
}

const hasAnomaly = (game: Game, slot: string, anomaly: Anomaly, pack: DataPack): boolean => {
  const tile = tileAt(game, slot, pack);
  return tile?.anomaly === anomaly || tile?.secondAnomaly === anomaly;
};

/** A ship can neither enter nor pass: asteroids and a supernova. */
const closedToRoute = (game: Game, slot: string, pack: DataPack): boolean =>
  hasAnomaly(game, slot, 'asteroid', pack) || hasAnomaly(game, slot, 'supernova', pack);

/** A ship can enter only to end its move, so only as the active system: a nebula, or a system holding other players' ships. */
const endsRoute = (game: Game, slot: string, pack: DataPack): boolean =>
  hasAnomaly(game, slot, 'nebula', pack)
  || Object.values(game.enemyUnits[slot] ?? {}).some(units => unitIds(units).some(id => !pack.units[id]?.ground));

/** Steps from a system to every system joined to it, whatever stands in the way: this measures a route already drawn. */
export function routeDistances(game: Game, from: string, pack: DataPack): Map<string, number> {
  const graph = routeGraph(game, pack);
  const steps = new Map([[from, 0]]);
  const queue = [from];
  for (let i = 0; i < queue.length; i += 1) {
    for (const next of graph.get(queue[i]) ?? []) {
      if (steps.has(next)) continue;
      steps.set(next, steps.get(queue[i])! + 1);
      queue.push(next);
    }
  }
  return steps;
}

/** The length of a drawn route: a hyperlane is no system and takes no step. Two systems no way joins, over holes of a map not finished or into the Fracture, count by the grid. */
export function routeSteps(game: Game, path: string[], pack: DataPack): number {
  const stops = path.filter(slot => !isLane(game, slot, pack));
  return stops.slice(1).reduce((sum, slot, i) => sum + (routeDistances(game, stops[i], pack).get(slot) ?? gridDistance(stops[i], slot)), 0);
}

export const shipSpeed = (game: Game, unit: UnitId, upgrades: UnitId[], pack: DataPack): number | null =>
  unitStats(game.faction, unit, upgrades.includes(unit), pack)?.move ?? null;

/** How far the fastest ship among these units flies; null without a ship that flies by itself. */
export function fleetSpeed(game: Game, units: UnitCounts, upgrades: UnitId[], pack: DataPack): number | null {
  const speeds = unitIds(units).flatMap(id => shipSpeed(game, id, upgrades, pack) ?? []);
  return speeds.length > 0 ? Math.max(...speeds) : null;
}

/** A ship's speed having left these systems, the first its start: a start in a nebula makes it 1, a gravity rift adds 1, once a ship. */
export function routeMove(game: Game, left: string[], speed: number, pack: DataPack): number {
  const start = hasAnomaly(game, left[0], 'nebula', pack) ? 1 : speed;
  return start + (left.some(slot => hasAnomaly(game, slot, 'rift', pack)) ? 1 : 0);
}

/** The systems a ship can still go to from the end of a path, by the rules for anomalies, other players' ships and speed. */
export function routeReach(game: Game, path: string[], speed: number, active: string, pack: DataPack): Set<string> {
  const graph = routeGraph(game, pack);
  const reached = new Set<string>();
  const start = { slot: path.at(-1)!, steps: routeSteps(game, path, pack), left: path };
  const queue = [start];
  const seen = new Map<string, number>();
  for (let i = 0; i < queue.length; i += 1) {
    const { slot, steps, left } = queue[i];
    if (steps >= routeMove(game, left, speed, pack)) continue;
    for (const next of graph.get(slot) ?? []) {
      if (closedToRoute(game, next, pack) || (endsRoute(game, next, pack) && next !== active)) continue;
      reached.add(next);
      if (next === active) continue;
      // Having passed a rift is what can change later, so a system is looked at again only with that gained.
      const passed = [...left, next];
      const key = `${next}:${passed.some(s => hasAnomaly(game, s, 'rift', pack))}`;
      if ((seen.get(key) ?? Infinity) <= steps + 1) continue;
      seen.set(key, steps + 1);
      queue.push({ slot: next, steps: steps + 1, left: passed });
    }
  }
  for (const slot of path) reached.delete(slot);
  return reached;
}

/** Warns about what a route cannot do by the rules: abilities and technologies may still allow it. */
function checkRoutes(game: Game, state: GameState, target: string, entry: TacticalEntry, pack: DataPack, warnings: Warning[]): void {
  for (const move of entry.moves) {
    if (move.pickupOf !== undefined || move.from in pack.planets || move.from === target) continue;
    if (state.tokensOnMap.includes(move.from)) warnings.push({ code: 'sourceActivated', params: { from: move.from } });
    const via = move.via ?? [];
    for (const slot of via) {
      if (closedToRoute(game, slot, pack) || endsRoute(game, slot, pack)) warnings.push({ code: 'routeBlocked', params: { from: move.from, systemId: slot } });
    }
    if (closedToRoute(game, target, pack)) warnings.push({ code: 'routeBlocked', params: { from: move.from, systemId: target } });
    const left = [move.from, ...via];
    const steps = routeSteps(game, [...left, target], pack);
    for (const unit of unitIds(move.units)) {
      const speed = shipSpeed(game, unit, state.upgrades, pack);
      if (speed === null) continue;
      const moves = routeMove(game, left, speed, pack);
      if (moves < steps) warnings.push({ code: 'speedShort', params: { from: move.from, unit, move: moves, steps } });
    }
  }
}

/** Planets of a system; the Thunder's Edge planet belongs to the system the expedition put it in. */
function planetsOf(game: Game, systemId: string, pack: DataPack): string[] {
  const planets = [...(pack.tiles[tileIdOf(game, systemId)]?.planetIds ?? [])];
  if (game.expedition.thundersEdgeSystem === systemId && pack.planets[THUNDERS_EDGE_PLANET]) {
    planets.push(THUNDERS_EDGE_PLANET);
  }
  return planets;
}

/** Planet definitions of a system, including Thunder's Edge when the expedition placed it there. */
export const systemPlanets = (game: Game, systemId: string, pack: DataPack): PlanetDef[] =>
  planetsOf(game, systemId, pack).map(id => pack.planets[id]).filter((p): p is PlanetDef => p !== undefined);

function add(target: Record<string, UnitCounts>, key: string, units: UnitCounts): void {
  const bucket = (target[key] ??= {});
  for (const id of unitIds(units)) bucket[id] = (bucket[id] ?? 0) + (units[id] ?? 0);
}

/** Removes what exists, up to the request; returns what was actually removed and warns about the shortfall. */
function take(
  target: Record<string, UnitCounts>, key: string, units: UnitCounts, warnings: Warning[],
): UnitCounts {
  const taken: UnitCounts = {};
  const bucket = (target[key] ??= {});
  for (const id of unitIds(units)) {
    const wanted = units[id] ?? 0;
    const have = bucket[id] ?? 0;
    const got = Math.min(wanted, have);
    if (got > 0) {
      taken[id] = got;
      if (have > got) bucket[id] = have - got;
      else delete bucket[id];
    }
    if (got < wanted) warnings.push({ code: 'unitsMissing', params: { where: key, unit: id, missing: wanted - got } });
  }
  return taken;
}

/** Whether my fighters move by themselves at this point of the replay: their current stat has a move value. */
export const fightersFly = (game: Game, upgrades: UnitId[], pack: DataPack): boolean =>
  (unitStats(game.faction, 'fighter', upgrades.includes('fighter'), pack)?.move ?? null) !== null;

/** Cargo against the capacity of my ships at my current levels: only ground units and fighters that do not fly count as load. */
function capacity(game: Game, units: UnitCounts, upgrades: UnitId[], pack: DataPack): { load: number; capacity: number } {
  const flying = fightersFly(game, upgrades, pack);
  let load = 0;
  let cap = 0;
  for (const id of unitIds(units)) {
    const def = pack.units[id];
    if (!def) continue;
    const n = units[id] ?? 0;
    if (def.ground || (def.fighter && !flying)) load += n * def.capacityUsed;
    else if (!def.fighter) cap += n * (unitStats(game.faction, id, upgrades.includes(id), pack)?.capacity ?? 0);
  }
  return { load, capacity: cap };
}

/** Ships for the fleet pool: flying fighters beyond the capacity left after the ground units count as ships. */
function fleetCount(game: Game, units: UnitCounts, upgrades: UnitId[], pack: DataPack): number {
  const ships = unitIds(units).reduce((sum, id) => {
    const def = pack.units[id];
    return def && !def.fighter && !def.ground ? sum + (units[id] ?? 0) : sum;
  }, 0);
  if (!fightersFly(game, upgrades, pack)) return ships;
  const { load, capacity: cap } = capacity(game, units, upgrades, pack);
  return ships + Math.max(0, (units.fighter ?? 0) - Math.max(0, cap - load));
}

/** What a system's stack holds against the fleet pool and its own capacity. */
export function systemMeters(game: Game, units: UnitCounts, upgrades: UnitId[], pack: DataPack): { load: number; capacity: number; ships: number } {
  return { ...capacity(game, units, upgrades, pack), ships: fleetCount(game, units, upgrades, pack) };
}

/** Exhausts the paying planets and spends the trade goods; returns what the payment is worth for `kind`. */
function pay(state: GameState, payment: Payment, kind: PaymentKind, pack: DataPack, warnings: Warning[]): number {
  let value = 0;
  for (const planetId of payment.planets) {
    if (state.exhausted.includes(planetId)) {
      warnings.push({ code: 'planetExhausted', params: { planetId } });
      continue;
    }
    state.exhausted.push(planetId);
    if (state.control[planetId] === 'me') value += pack.planets[planetId]?.[kind] ?? 0;
  }
  if (payment.tradeGoods > state.tradeGoods) {
    warnings.push({ code: 'shortTradeGoods', params: { needed: payment.tradeGoods, have: state.tradeGoods } });
  }
  const spent = Math.max(0, Math.min(payment.tradeGoods, state.tradeGoods));
  state.tradeGoods -= spent;
  return value + spent;
}

function initialState(game: Game, pack: DataPack): GameState {
  const faction = pack.factions[game.faction];
  const systems: Record<string, UnitCounts> = {};
  const control: GameState['control'] = {};
  if (faction) {
    add(systems, homeSlot(game, pack) ?? faction.homeTile, faction.startUnits);
    for (const planetId of homePlanets(game, pack)) control[planetId] = 'me';
  }
  Object.assign(control, game.planetControl);
  for (const planetId of absentHomePlanets(game, pack)) delete control[planetId];
  return {
    systems, ground: {}, exhausted: [], control, tokensOnMap: [],
    tradeGoods: 0, tactic: 3, fleet: 3, strategy: 2, vp: game.vp, opponentVp: Object.fromEntries(game.opponents.map(o => [o.id, o.vp])), upgrades: [...game.upgrades.me],
    docks: startingDocks(game, pack), pds: { ...game.pds },
  };
}

type TacticalEntry = Extract<Entry, { type: 'tactical' }>;

/** The system a move leaves: its `from`, or for a planet pickup the system holding that planet. */
export function sourceSlot(game: Game, pack: DataPack, from: string): string | null {
  if (!(from in pack.planets)) return from;
  return systemSlots(game).find(slot => planetsOf(game, slot, pack).includes(from)) ?? null;
}

/**
 * Carries the moves into the target and returns what each source system really sent, by slot.
 * Pickups from the target's own planets stay in the system, so they join no group.
 */
function applyMoves(
  game: Game, state: GameState, target: string, entry: TacticalEntry, pack: DataPack, warnings: Warning[],
): Record<string, UnitCounts> {
  const groups: Record<string, UnitCounts> = {};
  for (const move of entry.moves) {
    const taken = take(move.from in pack.planets ? state.ground : state.systems, move.from, move.units, warnings);
    add(state.systems, target, taken);
    const slot = move.pickupOf ?? sourceSlot(game, pack, move.from);
    if (slot !== null && slot !== target) add(groups, slot, taken);
  }
  return groups;
}

/** The numbers behind `capacityGroup` and `fleetPool`, for the source being edited. */
export function tacticalMeters(
  game: Game, entry: TacticalEntry, source: string, before: GameState, pack: DataPack,
): { group: { load: number; capacity: number }; ships: number; fleet: number } {
  const state = structuredClone(before);
  const target = entry.systemId;
  const groups = target === null ? {} : applyMoves(game, state, target, entry, pack, []);
  if (target !== null) landAndBuild(game, state, target, entry, pack, []);
  return {
    group: capacity(game, groups[source] ?? {}, before.upgrades, pack),
    ships: fleetCount(game, state.systems[target ?? ''] ?? {}, before.upgrades, pack),
    fleet: before.fleet,
  };
}

/** Where a system's production puts ground forces: one of the player's planets there, or null for its space area. */
const productionPlanet = (game: Game, state: GameState, systemId: string, pack: DataPack): string | null =>
  planetsOf(game, systemId, pack).find(p => state.control[p] === 'me') ?? null;

/** Ground units land in the target after the moves. */
function landUnits(state: GameState, target: string, entry: TacticalEntry, warnings: Warning[]): void {
  const wanted: UnitCounts = {};
  for (const landing of entry.landings) {
    for (const id of unitIds(landing.units)) wanted[id] = (wanted[id] ?? 0) + (landing.units[id] ?? 0);
  }
  for (const id of unitIds(wanted)) {
    const available = state.systems[target]?.[id] ?? 0;
    const total = wanted[id] ?? 0;
    if (total > available) warnings.push({ code: 'landingOverLimit', params: { unit: id, wanted: total, available } });
  }
  for (const landing of entry.landings) {
    // The shortfall is already reported as landingOverLimit, so the generic warning is dropped here.
    const landed = take(state.systems, target, landing.units, []);
    if (unitIds(landed).length === 0) continue;
    add(state.ground, landing.planetId, landed);
    // A planet newly taken enters exhausted, so it cannot pay within this entry.
    if (state.control[landing.planetId] !== 'me' && !state.exhausted.includes(landing.planetId)) {
      state.exhausted.push(landing.planetId);
    }
    state.control[landing.planetId] = 'me';
  }
}

export interface ProductionPlace { unit: UnitId; /** Null for the space area. */ planetId: string | null; count: number }

/** Ships go to the space area; ground forces to the planets they were bought on, the rest to one of my planets there, or to space if I have none. */
export function placesOf(
  game: Game, state: GameState, target: string, units: UnitCounts, pack: DataPack, onPlanets: Record<string, UnitCounts> = {},
): ProductionPlace[] {
  const places: ProductionPlace[] = [];
  for (const unit of unitIds(units)) {
    let left = units[unit] ?? 0;
    if (pack.units[unit]?.ground) {
      for (const [planetId, counts] of Object.entries(onPlanets)) {
        const count = Math.min(left, counts[unit] ?? 0);
        if (count > 0) places.push({ unit, planetId, count });
        left -= count;
      }
    }
    if (left > 0) places.push({ unit, planetId: pack.units[unit]?.ground ? productionPlanet(game, state, target, pack) : null, count: left });
  }
  return places;
}

function placeProduction(
  game: Game, state: GameState, target: string, units: UnitCounts, pack: DataPack, onPlanets?: Record<string, UnitCounts>,
): void {
  for (const { unit, planetId, count } of placesOf(game, state, target, units, pack, onPlanets)) {
    add(planetId === null ? state.systems : state.ground, planetId ?? target, { [unit]: count });
  }
}

/** What happens in the target after the moves: ground units land, then what was built is placed. */
function landAndBuild(
  game: Game, state: GameState, target: string, entry: TacticalEntry, pack: DataPack, warnings: Warning[],
): void {
  if (entry.losses) take(state.systems, target, entry.losses, warnings);
  landUnits(state, target, entry, warnings);
  for (const [planetId, units] of Object.entries(entry.groundLosses ?? {})) take(state.ground, planetId, units, warnings);
  placeProduction(game, state, target, entry.production, pack, entry.productionGround);
}

/** Where a tactical entry's production stands, as the replay places it: after the entry's own moves and landings. */
export function productionPlaces(game: Game, entry: TacticalEntry, before: GameState, pack: DataPack): ProductionPlace[] {
  const target = entry.systemId;
  if (target === null) return [];
  const state = structuredClone(before);
  applyMoves(game, state, target, entry, pack, []);
  if (entry.losses) take(state.systems, target, entry.losses, []);
  landUnits(state, target, entry, []);
  return placesOf(game, state, target, entry.production, pack, entry.productionGround);
}

/** The capacity and the fleet pool of a system after units arrived or were built there. */
function checkSystem(game: Game, state: GameState, target: string, pack: DataPack, warnings: Warning[]): void {
  const here = state.systems[target] ?? {};
  const load = capacity(game, here, state.upgrades, pack);
  if (load.load > load.capacity) {
    warnings.push({ code: 'capacitySystem', params: { systemId: target, load: load.load, capacity: load.capacity } });
  }
  const ships = fleetCount(game, here, state.upgrades, pack);
  if (ships > state.fleet) warnings.push({ code: 'fleetPool', params: { systemId: target, ships, fleet: state.fleet } });
}

function applyTactical(
  game: Game, state: GameState, entry: TacticalEntry, pack: DataPack, warnings: Warning[],
): void {
  const target = entry.systemId;
  if (target === null) return;
  if (!entry.free) {
    state.tactic -= 1;
    if (!state.tokensOnMap.includes(target)) state.tokensOnMap.push(target);
  }
  checkRoutes(game, state, target, entry, pack, warnings);
  const groups = applyMoves(game, state, target, entry, pack, warnings);
  for (const [from, units] of Object.entries(groups)) {
    const group = capacity(game, units, state.upgrades, pack);
    if (group.load > group.capacity) {
      warnings.push({ code: 'capacityGroup', params: { from, load: group.load, capacity: group.capacity } });
    }
  }
  landAndBuild(game, state, target, entry, pack, warnings);
  const cost = productionCost(entry.production, game.faction, state.upgrades, pack);
  const paid = pay(state, entry.payment, 'resources', pack, warnings);
  if (cost > paid) warnings.push({ code: 'shortResources', params: { needed: cost, paid } });
  if (entry.moves.length > 0 || unitIds(entry.production).length > 0) checkSystem(game, state, target, pack, warnings);
}

function checkTokensGiven(given: number, free: number, warnings: Warning[]): void {
  if (given > free) warnings.push({ code: 'tokensOver', params: { given, free } });
}

/** Applies what a strategy card can track; everything else about it is shown only. `primaries` holds the cards of this round's so far. */
function applyCard(game: Game, state: GameState, entry: CardEntry, pack: DataPack, primaries: (number | undefined)[], warnings: Warning[]): void {
  const primary = entry.type === 'strategic';
  if (costsStrategyToken(entry)) {
    if (state.strategy < 1) warnings.push({ code: 'shortStrategy', params: { have: state.strategy } });
    state.strategy -= 1;
  }
  if (primary && !entry.forToken) {
    const held = cardsHeld(game.playerCount);
    const sameCard = entry.card !== undefined && primaries.includes(entry.card);
    primaries.push(entry.card);
    if (primaries.length > held || sameCard) warnings.push({ code: 'primaryRepeated', params: { held } });
  }
  const effects = entry.effects ?? {};
  const cost = cardCost(entry, game.faction, state.upgrades, pack);
  const paid = pay(state, effects.payment ?? { planets: [], tradeGoods: 0 }, cost.kind, pack, warnings);
  if (cost.amount > paid) {
    warnings.push({ code: cost.kind === 'influence' ? 'shortInfluence' : 'shortResources', params: { needed: cost.amount, paid } });
  }
  const given = (effects.tokens?.tactic ?? 0) + (effects.tokens?.fleet ?? 0) + (effects.tokens?.strategy ?? 0);
  checkTokensGiven(given, freeTokens(entry, game.expansions), warnings);
  for (const pool of ['tactic', 'fleet', 'strategy'] as const) {
    const change = effects.tokens?.[pool] ?? 0;
    state[pool] += change;
    if (change < 0 && state[pool] < 0) warnings.push({ code: 'poolNegative', params: { pool, have: state[pool] } });
  }
  state.exhausted = state.exhausted.filter(id => !effects.readied?.includes(id));
  addUpgrades(state, entry.upgrades);
  if (primary && entry.card === CARD.trade) state.tradeGoods += 3;
  if (primary && entry.card === CARD.imperial && effects.mecatol) state.vp += 1;
  // The card itself says so: before Thunder's Edge this secondary leaves its token in the chosen system.
  if (!primary && entry.card === CARD.construction && effects.systemId && !game.expansions.includes('te')) {
    if (state.tokensOnMap.includes(effects.systemId)) warnings.push({ code: 'systemHasToken', params: { systemId: effects.systemId } });
    else state.tokensOnMap.push(effects.systemId);
  }
  // Thunder's Edge's secondary text speaks of a structure only; building units there is allowed, and said so.
  if (!primary && entry.card === CARD.construction && effects.production) warnings.push({ code: 'constructionUnits', params: {} });
  // Before Thunder's Edge this primary lifts a token off the board; the one gained is distributed like any other.
  if (primary && entry.card === CARD.warfare && effects.systemId && !game.expansions.includes('te')) {
    state.tokensOnMap = state.tokensOnMap.filter(id => id !== effects.systemId);
  }
  for (const { kind, planetId } of effects.structures ?? []) {
    if (kind === 'pds') state.pds[planetId] = (state.pds[planetId] ?? 0) + 1;
    else if (!state.docks.includes(planetId)) state.docks.push(planetId);
  }
  if (effects.production) {
    placeProduction(game, state, effects.production.systemId, effects.production.units, pack, effects.production.ground);
    checkSystem(game, state, effects.production.systemId, pack, warnings);
  }
}

function applyExpedition(
  game: Game, state: GameState, entry: Extract<Entry, { type: 'expedition' }>, pack: DataPack,
  taken: Set<string>, warnings: Warning[],
): void {
  const slice = EXPEDITION_SLICES.find(s => s.id === entry.sliceId);
  if (slice) {
    if (taken.has(slice.id) || game.expedition.slices[slice.id] === 'other') {
      warnings.push({ code: 'sliceTaken', params: { sliceId: slice.id } });
    }
    taken.add(slice.id);
  }
  const cost = slice?.cost;
  if (cost?.kind === 'tradeGoods') {
    // The cost is paid in trade goods only; the payment's planets are not used.
    if (state.tradeGoods < cost.amount) {
      warnings.push({ code: 'shortTradeGoods', params: { needed: cost.amount, have: state.tradeGoods } });
    }
    state.tradeGoods -= Math.min(cost.amount, state.tradeGoods);
    return;
  }
  const kind = cost?.kind ?? 'resources';
  const paid = pay(state, entry.payment, kind, pack, warnings);
  if (cost && paid < cost.amount) {
    warnings.push({ code: kind === 'influence' ? 'shortInfluence' : 'shortResources', params: { needed: cost.amount, paid } });
  }
}

/** A signed change of counts; a stack stops at nothing (the shortfall is reported) and an empty one leaves the record. */
function shiftUnits(target: Record<string, UnitCounts>, key: string, units: UnitCounts, warnings: Warning[]): void {
  const bucket = (target[key] ??= {});
  for (const id of Object.keys(units) as UnitId[]) {
    const sum = (bucket[id] ?? 0) + (units[id] ?? 0);
    if (sum < 0) warnings.push({ code: 'unitsMissing', params: { where: key, unit: id, missing: -sum } });
    const next = Math.max(0, sum);
    if (next > 0) bucket[id] = next;
    else delete bucket[id];
  }
}

function addUpgrades(state: GameState, upgrades: UnitId[] = []): void {
  for (const id of upgrades) if (!state.upgrades.includes(id)) state.upgrades.push(id);
}

function applyEntry(game: Game, state: GameState, entry: Entry, pack: DataPack, taken: Set<string>, primaries: (number | undefined)[]): Warning[] {
  const warnings: Warning[] = [];
  switch (entry.type) {
    case 'tactical':
      applyTactical(game, state, entry, pack, warnings);
      break;
    case 'strategic':
    case 'secondary':
      applyCard(game, state, entry, pack, primaries, warnings);
      break;
    case 'expedition':
      applyExpedition(game, state, entry, pack, taken, warnings);
      break;
    case 'statusTokens':
      checkTokensGiven(entry.tactic + entry.fleet + entry.strategy, STATUS_TOKENS, warnings);
      state.tactic += entry.tactic;
      state.fleet += entry.fleet;
      state.strategy += entry.strategy;
      state.vp += entry.vp ?? 0;
      for (const [id, points] of Object.entries(entry.opponentVp ?? {})) {
        if (id in state.opponentVp) state.opponentVp[id] += points;
      }
      break;
    case 'adjustment': {
      const d = entry.delta;
      state.tradeGoods += d.tradeGoods ?? 0;
      state.tactic += d.tactic ?? 0;
      state.fleet += d.fleet ?? 0;
      state.strategy += d.strategy ?? 0;
      state.vp += d.vp ?? 0;
      if (d.units) shiftUnits(state.systems, d.units.systemId, d.units.units, warnings);
      for (const [planetId, units] of Object.entries(d.ground ?? {})) shiftUnits(state.ground, planetId, units, warnings);
      break;
    }
    case 'component':
    case 'pass':
      break;
  }
  return warnings;
}

/** An opponent counted like me: what stands on the map for them is where they begin. */
function rivalState(game: Game, view: Game, id: string, pack: DataPack): GameState {
  const pick = (record: Game['enemyUnits']) => Object.fromEntries(Object.entries(record).flatMap(([place, byOwner]) => (byOwner[id] ? [[place, { ...byOwner[id] }]] : [])));
  return { ...initialState(view, pack), systems: pick(game.enemyUnits), ground: pick(game.enemyGround) };
}

function replay(game: Game, plan: Plan, filter: 'now' | 'forecast', pack: DataPack, stopBefore?: string): Projection {
  const state = initialState(game, pack);
  const warningsByEntry: Record<string, Warning[]> = {};
  const takenSlices = new Set<string>();
  const views = new Map(game.opponents.map(o => [o.id, gameAs(game, o.id)]));
  const rivals: Record<string, GameState> = Object.fromEntries(game.opponents.map(o => [o.id, rivalState(game, views.get(o.id)!, o.id, pack)]));
  if (game.opponents.length > 0) {
    state.rivals = rivals;
    state.rivalHolds = {};
  }
  const rounds = [...plan.rounds].sort((a, b) => a.number - b.number);
  for (const round of rounds) {
    state.exhausted = [];
    state.tokensOnMap = [];
    for (const rival of Object.values(rivals)) {
      rival.exhausted = [];
      rival.tokensOnMap = [];
    }
    const primaries: (number | undefined)[] = [];
    const rivalPrimaries: Record<string, (number | undefined)[]> = {};
    for (const phase of PHASE_ORDER) {
      for (const entry of round.entries) {
        if (entry.phase !== phase) continue;
        if (entry.id === stopBefore) return { state, warningsByEntry };
        if (entry.status === 'cancelled' || (filter === 'now' && entry.status !== 'done')) continue;
        const rival = entry.owner ? rivals[entry.owner] : undefined;
        if (rival && entry.owner) {
          warningsByEntry[entry.id] = applyEntry(views.get(entry.owner)!, rival, entry, pack, takenSlices, (rivalPrimaries[entry.owner] ??= []));
          if (entry.type === 'tactical') {
            for (const { planetId } of entry.landings) {
              state.control[planetId] = 'enemy';
              if (state.rivalHolds) state.rivalHolds[planetId] = entry.owner;
            }
          }
        } else {
          warningsByEntry[entry.id] = applyEntry(game, state, entry, pack, takenSlices, primaries);
        }
      }
    }
  }
  return { state, warningsByEntry };
}

export const project = (game: Game, plan: Plan, filter: 'now' | 'forecast', pack: DataPack): Projection =>
  replay(game, plan, filter, pack);

/** The state just before an entry applies: by default the forecast, what that entry can move and pay with. */
export const stateBeforeEntry = (game: Game, plan: Plan, entryId: string, pack: DataPack, filter: 'now' | 'forecast' = 'forecast'): GameState => {
  const { state } = replay(game, plan, filter, pack, entryId);
  const owner = plan.rounds.flatMap(r => r.entries).find(e => e.id === entryId)?.owner;
  return (owner && state.rivals?.[owner]) || state;
};
