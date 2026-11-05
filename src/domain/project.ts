import { EXPEDITION_SLICES, readyPlanetIds, type PaymentKind } from './payment';
import { CARD, cardCost, cardsHeld, type CardEntry } from './strategy';
import { productionCost, unitStats } from './unitStats';
import type {
  DataPack, Entry, Game, GameState, Payment, Phase, Plan, PlanetDef, Projection, UnitCounts, UnitId, Warning,
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

export const tileIdOf = (game: Game, systemId: string): string => (game.map[systemId] ?? systemId).split('@')[0];

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
const fightersFly = (game: Game, upgrades: UnitId[], pack: DataPack): boolean =>
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

/** All ships and flying fighters, then as much cargo as they carry: other fighters first, then mechs, then infantry. */
export function suggestUnits(game: Game, upgrades: UnitId[], available: UnitCounts, pack: DataPack): UnitCounts {
  const flying = fightersFly(game, upgrades, pack);
  const suggestion: UnitCounts = {};
  for (const id of unitIds(available)) {
    const def = pack.units[id];
    if (def && !def.ground && (!def.fighter || flying)) suggestion[id] = available[id];
  }
  let room = capacity(game, suggestion, upgrades, pack).capacity;
  for (const id of ['fighter', 'mech', 'infantry'] as const) {
    if (id === 'fighter' && flying) continue;
    const size = pack.units[id]?.capacityUsed ?? 1;
    const count = Math.min(available[id] ?? 0, Math.floor(room / size));
    if (count > 0) suggestion[id] = count;
    room -= count * size;
  }
  return suggestion;
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
    const homeSlot = Object.keys(game.map).find(slot => tileIdOf(game, slot) === faction.homeTile) ?? faction.homeTile;
    add(systems, homeSlot, faction.startUnits);
    for (const planetId of pack.tiles[faction.homeTile]?.planetIds ?? []) control[planetId] = 'me';
  }
  Object.assign(control, game.planetControl);
  return {
    systems, ground: {}, exhausted: [], control, tokensOnMap: [],
    tradeGoods: 0, tactic: 3, fleet: 3, strategy: 2, vp: game.vp, opponentVp: Object.fromEntries(game.opponents.map(o => [o.id, o.vp])), upgrades: [...game.upgrades.me],
    docks: [...game.docks], pds: { ...game.pds },
  };
}

type TacticalEntry = Extract<Entry, { type: 'tactical' }>;

/** The system a move leaves: its `from`, or for a planet pickup the system holding that planet. */
export function sourceSlot(game: Game, pack: DataPack, from: string): string | null {
  if (!(from in pack.planets)) return from;
  return Object.keys(game.map).find(slot => planetsOf(game, slot, pack).includes(from)) ?? null;
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
    const slot = sourceSlot(game, pack, move.from);
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
export const productionPlanet = (game: Game, state: GameState, systemId: string, pack: DataPack): string | null =>
  planetsOf(game, systemId, pack).find(p => state.control[p] === 'me') ?? null;

/** What happens in the target after the moves: ground units land, then what was built is placed. */
function landAndBuild(
  game: Game, state: GameState, target: string, entry: TacticalEntry, pack: DataPack, warnings: Warning[],
): void {
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
  placeProduction(game, state, target, entry.production, pack);
}

/** Ships go to the space area; ground forces to one of my planets there, or to space if I have none. */
function placeProduction(game: Game, state: GameState, target: string, units: UnitCounts, pack: DataPack): void {
  const shipsPart: UnitCounts = {};
  const groundPart: UnitCounts = {};
  for (const id of unitIds(units)) (pack.units[id]?.ground ? groundPart : shipsPart)[id] = units[id];
  add(state.systems, target, shipsPart);
  if (unitIds(groundPart).length > 0) {
    const planet = productionPlanet(game, state, target, pack);
    if (planet) add(state.ground, planet, groundPart);
    else add(state.systems, target, groundPart);
  }
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
  if (!entry.free) state.tactic -= 1;
  if (!state.tokensOnMap.includes(target)) state.tokensOnMap.push(target);
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

/** Applies what a strategy card can track; everything else about it is shown only. `primaries` counts this round's so far. */
function applyCard(game: Game, state: GameState, entry: CardEntry, pack: DataPack, primaries: { count: number }, warnings: Warning[]): void {
  const primary = entry.type === 'strategic';
  if (!primary || entry.forToken) {
    if (state.strategy < 1) warnings.push({ code: 'shortStrategy', params: { have: state.strategy } });
    state.strategy -= 1;
  } else {
    primaries.count += 1;
    const held = cardsHeld(game.playerCount);
    if (primaries.count > held) warnings.push({ code: 'primaryRepeated', params: { held } });
  }
  const effects = entry.effects ?? {};
  const cost = cardCost(entry, game.faction, state.upgrades, pack);
  const paid = pay(state, effects.payment ?? { planets: [], tradeGoods: 0 }, cost.kind, pack, warnings);
  if (cost.amount > paid) {
    warnings.push({ code: cost.kind === 'influence' ? 'shortInfluence' : 'shortResources', params: { needed: cost.amount, paid } });
  }
  state.tactic += effects.tokens?.tactic ?? 0;
  state.fleet += effects.tokens?.fleet ?? 0;
  state.strategy += effects.tokens?.strategy ?? 0;
  state.exhausted = state.exhausted.filter(id => !effects.readied?.includes(id));
  addUpgrades(state, entry.upgrades);
  if (primary && entry.card === CARD.trade) state.tradeGoods += 3;
  if (primary && entry.card === CARD.imperial && effects.mecatol) state.vp += 1;
  // The card itself says so: before Thunder's Edge this secondary leaves its token in the chosen system.
  if (!primary && entry.card === CARD.construction && effects.systemId && !game.expansions.includes('te') && !state.tokensOnMap.includes(effects.systemId)) {
    state.tokensOnMap.push(effects.systemId);
  }
  for (const { kind, planetId } of effects.structures ?? []) {
    if (kind === 'pds') state.pds[planetId] = (state.pds[planetId] ?? 0) + 1;
    else if (!state.docks.includes(planetId)) state.docks.push(planetId);
  }
  if (effects.production) {
    placeProduction(game, state, effects.production.systemId, effects.production.units, pack);
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

/** A signed change of counts; a stack stops at nothing and an empty one leaves the record. */
function shiftUnits(target: Record<string, UnitCounts>, key: string, units: UnitCounts): void {
  const bucket = (target[key] ??= {});
  for (const id of Object.keys(units) as UnitId[]) {
    const next = Math.max(0, (bucket[id] ?? 0) + (units[id] ?? 0));
    if (next > 0) bucket[id] = next;
    else delete bucket[id];
  }
}

function addUpgrades(state: GameState, upgrades: UnitId[] = []): void {
  for (const id of upgrades) if (!state.upgrades.includes(id)) state.upgrades.push(id);
}

function applyEntry(game: Game, state: GameState, entry: Entry, pack: DataPack, taken: Set<string>, primaries: { count: number }): Warning[] {
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
      if (d.units) shiftUnits(state.systems, d.units.systemId, d.units.units);
      for (const [planetId, units] of Object.entries(d.ground ?? {})) shiftUnits(state.ground, planetId, units);
      break;
    }
    case 'component':
    case 'pass':
      break;
  }
  return warnings;
}

function replay(game: Game, plan: Plan, filter: 'now' | 'forecast', pack: DataPack, stopBefore?: string): Projection {
  const state = initialState(game, pack);
  const warningsByEntry: Record<string, Warning[]> = {};
  const takenSlices = new Set<string>();
  const rounds = [...plan.rounds].sort((a, b) => a.number - b.number);
  for (const round of rounds) {
    state.exhausted = [];
    state.tokensOnMap = [];
    const primaries = { count: 0 };
    for (const phase of PHASE_ORDER) {
      for (const entry of round.entries) {
        if (entry.phase !== phase) continue;
        if (entry.id === stopBefore) return { state, warningsByEntry };
        if (entry.status === 'cancelled' || (filter === 'now' && entry.status !== 'done')) continue;
        warningsByEntry[entry.id] = applyEntry(game, state, entry, pack, takenSlices, primaries);
      }
    }
  }
  return { state, warningsByEntry };
}

export const project = (game: Game, plan: Plan, filter: 'now' | 'forecast', pack: DataPack): Projection =>
  replay(game, plan, filter, pack);

/** The forecast state just before an entry applies: what that entry can move and pay with. */
export const stateBeforeEntry = (game: Game, plan: Plan, entryId: string, pack: DataPack): GameState =>
  replay(game, plan, 'forecast', pack, entryId).state;
