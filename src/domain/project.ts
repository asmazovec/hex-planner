import { EXPEDITION_SLICES, readyPlanetIds, type PaymentKind } from './payment';
import type {
  DataPack, Entry, Game, GameState, Payment, Phase, Plan, PlanetDef, Projection, UnitCounts, UnitId, Warning,
} from './types';

const PHASE_ORDER: Phase[] = ['strategy', 'action', 'status', 'agenda'];
const THUNDERS_EDGE_PLANET = 'thundersedge';

const unitIds = (units: UnitCounts): UnitId[] =>
  (Object.keys(units) as UnitId[]).filter(id => (units[id] ?? 0) > 0);

/** Fighters and infantry cost 0.5, so each unit type is rounded up to whole resources on its own. */
export function productionCost(units: UnitCounts, pack: DataPack): number {
  let total = 0;
  for (const id of unitIds(units)) total += Math.ceil((units[id] ?? 0) * (pack.units[id]?.cost ?? 0));
  return total;
}

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

function capacity(units: UnitCounts, pack: DataPack): { load: number; capacity: number } {
  let load = 0;
  let cap = 0;
  for (const id of unitIds(units)) {
    const def = pack.units[id];
    if (!def) continue;
    const n = units[id] ?? 0;
    if (def.fighter || def.ground) load += n * def.capacityUsed;
    else cap += n * def.capacity;
  }
  return { load, capacity: cap };
}

const shipCount = (units: UnitCounts, pack: DataPack): number =>
  unitIds(units).reduce((sum, id) => {
    const def = pack.units[id];
    return def && !def.fighter && !def.ground ? sum + (units[id] ?? 0) : sum;
  }, 0);

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
    tradeGoods: 0, tactic: 3, fleet: 3, strategy: 2, vp: 0,
  };
}

function applyTactical(
  game: Game, state: GameState, entry: Extract<Entry, { type: 'tactical' }>, pack: DataPack, warnings: Warning[],
): void {
  const target = entry.systemId;
  if (target === null) return;
  state.tactic -= 1;
  if (!state.tokensOnMap.includes(target)) state.tokensOnMap.push(target);
  for (const move of entry.moves) {
    const fromPlanet = move.from in pack.planets;
    const taken = take(fromPlanet ? state.ground : state.systems, move.from, move.units, warnings);
    add(state.systems, target, taken);
    if (!fromPlanet) {
      const group = capacity(taken, pack);
      if (group.load > group.capacity) {
        warnings.push({ code: 'capacityGroup', params: { from: move.from, load: group.load, capacity: group.capacity } });
      }
    }
  }
  for (const landing of entry.landings) {
    const landed = take(state.systems, target, landing.units, warnings);
    if (unitIds(landed).length === 0) continue;
    add(state.ground, landing.planetId, landed);
    // A planet newly taken enters exhausted, so it cannot pay within this entry.
    if (state.control[landing.planetId] !== 'me' && !state.exhausted.includes(landing.planetId)) {
      state.exhausted.push(landing.planetId);
    }
    state.control[landing.planetId] = 'me';
  }
  const produced = unitIds(entry.production);
  const shipsPart: UnitCounts = {};
  const groundPart: UnitCounts = {};
  for (const id of produced) (pack.units[id]?.ground ? groundPart : shipsPart)[id] = entry.production[id];
  add(state.systems, target, shipsPart);
  if (unitIds(groundPart).length > 0) {
    // Produced ground forces start on one of the player's planets in the system, else they stay in space.
    const planet = planetsOf(game, target, pack).find(p => state.control[p] === 'me');
    if (planet) add(state.ground, planet, groundPart);
    else add(state.systems, target, groundPart);
  }
  const cost = productionCost(entry.production, pack);
  const paid = pay(state, entry.payment, 'resources', pack, warnings);
  if (cost > paid) warnings.push({ code: 'shortResources', params: { needed: cost, paid } });
  if (entry.moves.length > 0 || produced.length > 0) {
    const here = state.systems[target] ?? {};
    const load = capacity(here, pack);
    if (load.load > load.capacity) {
      warnings.push({ code: 'capacitySystem', params: { systemId: target, load: load.load, capacity: load.capacity } });
    }
    const ships = shipCount(here, pack);
    if (ships > state.fleet) warnings.push({ code: 'fleetPool', params: { systemId: target, ships, fleet: state.fleet } });
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

function applyEntry(game: Game, state: GameState, entry: Entry, pack: DataPack, taken: Set<string>): Warning[] {
  const warnings: Warning[] = [];
  switch (entry.type) {
    case 'tactical':
      applyTactical(game, state, entry, pack, warnings);
      break;
    case 'secondary':
      state.strategy -= 1;
      break;
    case 'expedition':
      applyExpedition(game, state, entry, pack, taken, warnings);
      break;
    case 'statusTokens':
      state.tactic += entry.tactic;
      state.fleet += entry.fleet;
      state.strategy += entry.strategy;
      break;
    case 'adjustment': {
      const d = entry.delta;
      state.tradeGoods += d.tradeGoods ?? 0;
      state.tactic += d.tactic ?? 0;
      state.fleet += d.fleet ?? 0;
      state.strategy += d.strategy ?? 0;
      state.vp += d.vp ?? 0;
      if (d.units) {
        const { systemId, units } = d.units;
        const bucket = (state.systems[systemId] ??= {});
        for (const id of Object.keys(units) as UnitId[]) {
          const next = Math.max(0, (bucket[id] ?? 0) + (units[id] ?? 0));
          if (next > 0) bucket[id] = next;
          else delete bucket[id];
        }
      }
      break;
    }
    case 'strategic':
    case 'component':
    case 'pass':
      break;
  }
  return warnings;
}

export function project(game: Game, plan: Plan, filter: 'now' | 'forecast', pack: DataPack): Projection {
  const state = initialState(game, pack);
  const warningsByEntry: Record<string, Warning[]> = {};
  const takenSlices = new Set<string>();
  const rounds = [...plan.rounds].sort((a, b) => a.number - b.number);
  for (const round of rounds) {
    state.exhausted = [];
    state.tokensOnMap = [];
    for (const phase of PHASE_ORDER) {
      for (const entry of round.entries) {
        if (entry.phase !== phase) continue;
        if (entry.status === 'cancelled' || (filter === 'now' && entry.status !== 'done')) continue;
        warningsByEntry[entry.id] = applyEntry(game, state, entry, pack, takenSlices);
      }
    }
  }
  return { state, warningsByEntry };
}
