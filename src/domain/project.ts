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
// TODO(P2-049) #ws:thunders-edge #type:model #rule:fracture-5 #test:te-fracture #dep:P2-054 #size:m #fracture — Входы Излома (game.fracture.ingress) не смежны с его выходами: в Излом нельзя проложить маршрут
export const systemsAdjacent = (game: Game): Adjacency => (a, b) =>
  areAdjacent(a, b) && Boolean(game.fracture.tiles?.[a]) === Boolean(game.fracture.tiles?.[b]);

/** Every slot holding a system. */
export const systemSlots = (game: Game): string[] => [...Object.keys(game.map), ...Object.keys(game.fracture.tiles ?? {})];

// TODO(P2-006) #ws:movement #type:arch #size:m #srp #route-graph — Граф маршрутов и аномалии (180 строк) живут в модуле расчёта состояния: вынести в src/domain/movement.ts
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
// TODO(P2-012) #ws:movement #type:check #rule:44.2 #test:044-hyperlanes #size:s #hyperlane — Гиперпуть не система: его нельзя выбрать активной системой и в нём нельзя закончить ход — нет нарушения
const closedToRoute = (game: Game, slot: string, pack: DataPack): boolean =>
  hasAnomaly(game, slot, 'asteroid', pack) || hasAnomaly(game, slot, 'supernova', pack);

/** A ship can enter only to end its move, so only as the active system: a nebula, or a system holding other players' ships. */
// TODO(P2-043) #ws:rivals #type:bug #rule:58.3.2 #test:058-movement #size:l #rivals #route — Блокировка берётся из game.enemyUnits (расставлено вручную), а не из состояния соперников при повторе: приведённые соперником корабли не мешают, уведённые мешают; маршруты соперника не видят моих кораблей
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
// TODO(P2-008) #ws:movement #type:bug #rule:58.3.2 #test:058-movement #size:m #route #skipped-stop — Шаги между отмеченными точками считаются поиском, который не видит аномалий и чужих кораблей: системы между точками не проверяются. Восстанавливать весь путь или требовать соседние точки (tapStep)
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
// TODO(P2-007) #ws:movement #type:bug #rule:41.3 #rule:41-note-6 #test:041-gravity-rift #size:s #gravity-rift — Разлом даёт +1 один раз на корабль; по примечанию 6 к 41 — +1 за каждый разлом и каждое прохождение. Ключ seen в routeReach тоже булев
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
  // TODO(P2-009) #ws:movement #type:bug #rule:58.3.5 #test:058-movement #size:s #route-highlight — Удаляет из подсветки и активную систему, если путь начался в ней: 58.3.5 разрешает вылететь и вернуться
  for (const slot of path) reached.delete(slot);
  return reached;
}

/** Warns about what a route cannot do by the rules: abilities and technologies may still allow it. */
function checkRoutes(game: Game, state: GameState, target: string, entry: TacticalEntry, pack: DataPack, warnings: Warning[]): void {
  for (const move of entry.moves) {
    // TODO(P2-013) #ws:transport #type:check #rule:95.1 #rule:95.3 #test:095-transport #size:m #pickup #token — Подборы пропускаются целиком: нет проверки, что подбор из старта, пути или активной системы (95.1), и что в системе подбора нет моего жетона (95.3). Тот баг, что нашёл пользователь
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
// TODO(P2-048) #ws:thunders-edge #type:model #rule:space-stations-2 #rule:space-stations-4 #test:te-space-stations #size:m #space-station — Станция — обычная планета: контроль берётся высадкой, пехота и строения ставятся на неё. Нужен признак станции и контроль присутствием кораблей
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
// TODO(P2-031) #ws:payment #type:check #rule:34-note-2 #rule:64-note-5 #test:034-exhausted #test:064-planets #size:s #payment — Чужая планета в оплате молча истощается и стоит 0: нарушение planetNotControlled
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
    // TODO(P2-059) #ws:domain-purity #type:arch #size:s #magic-number — Стартовые жетоны 3/3/2 числами: константа START_TOKENS рядом с STATUS_TOKENS
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
// TODO(P2-027) #ws:production #type:bug #rule:68.3 #rule:67.4.1 #test:068-production #test:067-producing-units #size:m #placement — Пехота идёт на первую свою планету системы (в том числе только что захваченную), а не на планету с базой; productionGround принимается и на чужую планету (placesOf)
const productionPlanet = (game: Game, state: GameState, systemId: string, pack: DataPack): string | null =>
  planetsOf(game, systemId, pack).find(p => state.control[p] === 'me') ?? null;

/** Ground units land in the target after the moves. */
// TODO(P2-021) #ws:invasion #type:bug #rule:76.1 #rule:49.2 #rule:89.4 #test:076-ships #test:049-invasion #test:089-tactical-action #size:s #landing — Высаживает любой тип юнита, в том числе корабли, и на любую планету: только наземные войска и только планеты активной системы
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
    // TODO(P2-020) #ws:invasion #type:bug #rule:49.5 #rule:42.4.4 #test:049-invasion #test:042-ground-combat #size:s #control — Контроль ставится до снятия groundLosses: если все высадившиеся погибли, контроль всё равно мой. Устанавливать контроль после потерь на планете
    state.control[landing.planetId] = 'me';
  }
}

// TODO(P2-047) #ws:thunders-edge #type:check #rule:entropic-scars-2 #test:te-entropic-scars #size:s #entropic-scar — Производство в энтропийном шраме (тактика и карты) без нарушения
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

// TODO(P2-028) #ws:production #type:check #rule:14.1 #rule:67.6 #rule:67-/-79 #test:014-blockaded #test:067-producing-units #test:079-space-dock #size:m #blockade #no-dock — Производство не проверяет базу (сейчас «нет дока» считается в UI), блокаду и чужие корабли в системе: нарушения noProduction и productionBlockaded в домене
function placeProduction(
  game: Game, state: GameState, target: string, units: UnitCounts, pack: DataPack, onPlanets?: Record<string, UnitCounts>,
): void {
  for (const { unit, planetId, count } of placesOf(game, state, target, units, pack, onPlanets)) {
    add(planetId === null ? state.systems : state.ground, planetId ?? target, { [unit]: count });
  }
}

/** What happens in the target after the moves: ground units land, then what was built is placed. */
// TODO(P2-023) #ws:invasion #type:model #rule:27.2 #rule:27.3 #rule:49-note-4 #rule:54.1 #test:027-custodians-token #test:049-invasion #test:054-mecatol-rex #size:m #needs:decision #custodians — Нет жетона custodians: высадка на Mecatol Rex без 6 влияния и без очка. Решить, моделировать ли
function landAndBuild(
  game: Game, state: GameState, target: string, entry: TacticalEntry, pack: DataPack, warnings: Warning[],
): void {
  // TODO(P2-019) #ws:combat-order #type:bug #rule:76.2 #rule:89.3 #test:076-ships #test:089-tactical-action #size:m #fleet-pool #capacity #battle — Потери снимаются до проверки флота и до высадки: флот надо проверять при прилёте (37.3), а высадку ограничивать местами на борту после боя (16.3.3). Порядок: прилёт → флот → бой → места на борту → высадка → производство
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
  // TODO(P2-015) #ws:command-tokens #type:check #rule:5.2 #rule:89.1 #rule:20.4 #test:005-active-system #test:089-tactical-action #test:020-command-tokens #size:s #activation — Активация системы со своим жетоном и тактика без жетона в тактическом резерве проходят молча: нарушения systemHasToken и poolNegative(tactic)
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
  // TODO(P2-029) #ws:production #type:model #rule:68.1 #rule:79.1 #rule:67.5 #rule:72.1 #rule:96.3 #test:068-production #test:079-space-dock #test:067-producing-units #test:072-reinforcements #test:096-units #dep:P2-050 #dep:P2-051 #size:m #needs:decision #production-limit #reinforcements — Нет лимита Production и запаса отрядов: нужны данные (P2-050, P2-051), затем нарушения productionOver и reinforcementsOut. Решить, нужно ли
  const cost = productionCost(entry.production, game.faction, state.upgrades, pack);
  const paid = pay(state, entry.payment, 'resources', pack, warnings);
  if (cost > paid) warnings.push({ code: 'shortResources', params: { needed: cost, paid } });
  // TODO(P2-014) #ws:transport #type:check #rule:16.3 #rule:16-note-4 #rule:43.1 #rule:55-note-1 #rule:95-note-4 #test:016-capacity #test:043-ground-forces #test:055-mechs #test:095-transport #size:m #capacity #left-behind — Места на борту проверяются только в активной системе: истребители и наземные войска, брошенные без мест на борту в системе, откуда улетели корабли, не дают нарушения
  if (entry.moves.length > 0 || unitIds(entry.production).length > 0) checkSystem(game, state, target, pack, warnings);
}

// TODO(P2-016) #ws:command-tokens #type:model #rule:20.3 #rule:23.2 #test:020-command-tokens #test:023-component-limitations #size:m #needs:decision #token-supply — Жетонов приказа 16: сумма в резервах и на карте не ограничена. Нужна модель снабжения жетонов (решить, нужна ли)
function checkTokensGiven(given: number, free: number, warnings: Warning[]): void {
  if (given > free) warnings.push({ code: 'tokensOver', params: { given, free } });
}

/** Applies what a strategy card can track; everything else about it is shown only. `primaries` holds the cards of this round's so far. */
// TODO(P2-033) #ws:strategy-cards #type:arch #size:l #ocp #card-handlers — Цепочка if (entry.card === CARD.x) по всей функции: обработчик на каждую карту (основное, второстепенное, стоимость, свободные жетоны, нарушения) в src/domain/cards/
function applyCard(game: Game, state: GameState, entry: CardEntry, pack: DataPack, primaries: (number | undefined)[], warnings: Warning[]): void {
  const primary = entry.type === 'strategic';
  // TODO(P2-036) #ws:strategy-cards #type:check #rule:20.5 #rule:82.1 #rule:83.4 #rule:83.7 #rule:92.4.2 #test:020-command-tokens #test:082-strategic-action #test:083-strategy-card #test:092-trade #size:m #secondary — Нет понятия «чья карта»: второстепенное своей карты и повтор второстепенного одной карты за раунд проходят молча
  if (costsStrategyToken(entry)) {
    if (state.strategy < 1) warnings.push({ code: 'shortStrategy', params: { have: state.strategy } });
    state.strategy -= 1;
  }
  // No card chosen yet is no repeat of anything.
  if (primary && !entry.forToken && entry.card !== undefined) {
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
  // TODO(P2-040) #ws:strategy-cards #type:bug #rule:32.2 #rule:32.3 #rule:32-note-3 #test:032-diplomacy #size:m #diplomacy #rivals — Diplomacy: соперники не получают жетон в выбранной системе; нет нарушений «больше двух планет», «Mecatol Rex», «система без моей планеты» (лимит 2 сейчас только в UI)
  const given = (effects.tokens?.tactic ?? 0) + (effects.tokens?.fleet ?? 0) + (effects.tokens?.strategy ?? 0);
  checkTokensGiven(given, freeTokens(entry, game.expansions), warnings);
  for (const pool of ['tactic', 'fleet', 'strategy'] as const) {
    const change = effects.tokens?.[pool] ?? 0;
    state[pool] += change;
    if (change < 0 && state[pool] < 0) warnings.push({ code: 'poolNegative', params: { pool, have: state[pool] } });
  }
  // TODO(P2-032) #ws:payment #type:check #rule:71-note-3 #test:071-readied #size:s #ready — Готовит любые перечисленные планеты, в том числе чужие
  state.exhausted = state.exhausted.filter(id => !effects.readied?.includes(id));
  addUpgrades(state, entry.upgrades);
  // TODO(P2-039) #ws:strategy-cards #type:bug #rule:92.4 #test:092-trade #size:s #trade #rivals — effects.freeSecondary хранится, но расчёт его не читает: выбранные соперники платят жетон за второстепенное
  if (primary && entry.card === CARD.trade) state.tradeGoods += 3;
  // TODO(P2-037) #ws:strategy-cards #type:bug #rule:45.2 #rule:45-note-3 #test:045-imperial #size:s #imperial #mecatol — Очко по флажку effects.mecatol, а не по контролю Mecatol Rex (mr/mrte) в состоянии
  if (primary && entry.card === CARD.imperial && effects.mecatol) state.vp += 1;
  // The card itself says so: before Thunder's Edge this secondary leaves its token in the chosen system.
  if (!primary && entry.card === CARD.construction && effects.systemId && !game.expansions.includes('te')) {
    // TODO(P2-018) #ws:command-tokens #type:bug #rule:20.6 #test:020-command-tokens #size:s #construction — Второстепенное Construction в систему с моим жетоном законно (жетон уходит в снабжение), а здесь предупреждение
    if (state.tokensOnMap.includes(effects.systemId)) warnings.push({ code: 'systemHasToken', params: { systemId: effects.systemId } });
    else state.tokensOnMap.push(effects.systemId);
  }
  // The secondary places a structure only and the editor no longer offers units; a plan saved with them keeps them, and is told.
  if (!primary && entry.card === CARD.construction && effects.production) warnings.push({ code: 'constructionUnits', params: {} });
  // Before Thunder's Edge this primary lifts a token off the board; the one gained is distributed like any other.
  if (primary && entry.card === CARD.warfare && effects.systemId && !game.expansions.includes('te')) {
    state.tokensOnMap = state.tokensOnMap.filter(id => id !== effects.systemId);
  }
  // TODO(P2-026) #ws:structures #type:check #rule:24.2 #rule:24.3 #rule:24-note-1 #rule:24-note-2 #rule:63.3 #rule:79.3 #rule:85.4 #rule:85.5 #rule:85.6 #test:024-construction #test:063-pds #test:079-space-dock #test:085-structures #size:m #construction #limits — Строения ставятся без проверок: 1 база и 2 PDS на планету, не больше двух на основное и одно на второстепенное Construction, только своя планета и планета системы второстепенного; второй док молча теряется
  for (const { kind, planetId } of effects.structures ?? []) {
    if (kind === 'pds') state.pds[planetId] = (state.pds[planetId] ?? 0) + 1;
    else if (!state.docks.includes(planetId)) state.docks.push(planetId);
  }
  // TODO(P2-030) #ws:production #type:check #rule:99.3 #test:099-warfare #size:s #warfare #card-production — Производство карты (второстепенное Warfare) не проверяет домашнюю систему, базу и её Production
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
    // TODO(P2-046) #ws:thunders-edge #type:check #rule:expedition-5 #test:te-expedition #size:s #expedition — Часть, отмеченная в партии как моя, берётся снова; две части за один ход не дают нарушения
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
  // TODO(P2-045) #ws:thunders-edge #type:bug #rule:expedition-4.5 #test:te-expedition #size:s #expedition — Часть «технология» без cost: оплата без планеты считается оплаченной, нет проверки специализации и контроля планеты
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

// TODO(P2-002) #ws:rule-engine #type:arch #size:l #warning-channel #srp — Проверки правил пишут warnings.push вперемешку с изменением состояния: вынести каждую проверку в правило реестра (функция контекста шага → нарушения), эффект шага оставить чистым
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
    // TODO(P2-017) #ws:command-tokens #type:check #rule:81.5 #rule:37.3 #test:081-status-phase #test:037-fleet-pool #size:s #fleet-pool #redistribute — Перераспределение не проверяет минус в резерве и флот меньше кораблей в системах (после статуса и после перестановки Warfare): poolNegative и fleetPool по всем системам
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
    // TODO(P2-042) #ws:round-flow #type:check #rule:3.3 #rule:3.4 #rule:82.2 #rule:40.2 #test:003-action-phase #test:082-strategic-action #test:040-game-round #size:m #pass — Пас ничего не проверяет: пас до своих стратегических действий, действия после паса, действие не в своей фазе
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

// TODO(P2-004) #ws:replay-steps #type:arch #size:l #srp #phases — Повтор — одна функция на фазы, соперников и остановки: разложить на фазы раунда и шаги тактического действия 89.1-89.5 и карт, каждый шаг = проверки до шага + чистый эффект
function replay(game: Game, plan: Plan, filter: 'now' | 'forecast', pack: DataPack, stopBefore?: string, stopAfter?: string): Projection {
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
    // TODO(P2-005) #ws:replay-steps #type:bug #rule:34.2 #rule:40 #rule:81.4 #rule:81.6 #test:034-exhausted #test:040-game-round #test:081-status-phase #size:m #status-phase #phase-order — Планеты готовятся и жетоны снимаются только в начале следующего раунда; по правилам это шаги 4 и 6 фазы статуса, до фазы политики. Перенести в фазу статуса этого раунда, у соперников тоже
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
            // TODO(P2-022) #ws:invasion #type:bug #rule:49.5 #rule:25.5 #test:049-invasion #test:025-control #size:m #rivals #control — Высадка соперника переворачивает контроль по одному списку landings: без проверки, что кто-то высадился и выжил; планета, взятая мной у соперника, остаётся его в state.rivals
            for (const { planetId } of entry.landings) {
              state.control[planetId] = 'enemy';
              if (state.rivalHolds) state.rivalHolds[planetId] = entry.owner;
            }
          }
        } else {
          warningsByEntry[entry.id] = applyEntry(game, state, entry, pack, takenSlices, primaries);
        }
        if (entry.id === stopAfter) return { state, warningsByEntry };
      }
    }
  }
  return { state, warningsByEntry };
}

export const project = (game: Game, plan: Plan, filter: 'now' | 'forecast', pack: DataPack): Projection =>
  replay(game, plan, filter, pack);

/** The forecast right after an entry, without what comes later: the map between the repeats of its flight. */
export const stateAfterEntry = (game: Game, plan: Plan, entryId: string, pack: DataPack): GameState => {
  const { state } = replay(game, plan, 'forecast', pack, undefined, entryId);
  const owner = plan.rounds.flatMap(r => r.entries).find(e => e.id === entryId)?.owner;
  return (owner && state.rivals?.[owner]) || state;
};

/** The state just before an entry applies: by default the forecast, what that entry can move and pay with. */
export const stateBeforeEntry = (game: Game, plan: Plan, entryId: string, pack: DataPack, filter: 'now' | 'forecast' = 'forecast'): GameState => {
  const { state } = replay(game, plan, filter, pack, entryId);
  const owner = plan.rounds.flatMap(r => r.entries).find(e => e.id === entryId)?.owner;
  return (owner && state.rivals?.[owner]) || state;
};
