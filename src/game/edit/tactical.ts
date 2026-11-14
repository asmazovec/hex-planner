/**
 * The edits of a tactical action's body, over `Turn.action`: the route of each source, the units it takes, the landings,
 * the production, the losses, the payment. Pure functions `Turn -> Turn` (a turn that is not tactical comes back as it is),
 * the same rules as the `with*` family of `src/domain/tactical.ts` over the old entry; each is tested against its old twin.
 */
import { hasStructures, hasUnits, withCount, countOf } from '../../domain/tactical';
import { sourceSlot, type MapSource } from '../../domain/replay/board';
import type { Turn, Tactical, Flight, Landing, Payment } from '../actions';
import type { Place } from '../events';
import type { DataPack, PlanetId, PlayerId, Slot, StructureCounts, StructureKind, UnitCounts, UnitId } from '../types';
/** What the editors count a place by: the table's map and the pack. */
export interface At { map: MapSource; pack: DataPack }

const EMPTY: Tactical = { kind: 'tactical', system: null, movement: [], invasion: [] };

/** The tactical action of a turn; an empty one for any other. */
export const tacticalOf = (turn: Turn): Tactical => (turn.action.kind === 'tactical' ? turn.action : EMPTY);

/** The turn with its tactical action changed; one of another kind is returned as it is. */
export function onTactical(turn: Turn, change: (action: Tactical) => Tactical): Turn {
  return turn.action.kind === 'tactical' ? { ...turn, action: change(turn.action) } : turn;
}

const idOf = (place: Place): string => ('planet' in place ? place.planet : place.slot);
const placeOf = (at: At, id: string): Place => (id in at.pack.planets ? { planet: id } : { slot: id });
const slotOf = (at: At, place: Place): Slot | null => sourceSlot(at.map, at.pack, idOf(place));

// ---------------------------------------------------------------------------------------------------------------------
// Reading the flights.

/** Whether a flight carries anything: units, or structures taken on board. */
export const hasCargo = (flight: { units: UnitCounts; structures?: StructureCounts }): boolean => hasUnits(flight.units) || hasStructures(flight.structures);

/** The source systems of an action, in the order of their flights. */
export function sourcesOf(at: At, action: Tactical): Slot[] {
  const slots = action.movement.filter(f => f.pickupOf === undefined).map(f => slotOf(at, f.from));
  return [...new Set(slots)].filter((s): s is string => s !== null);
}

/** The flights of one source: its space area, its planets, and what it picks up on the way. */
export function groupOf(at: At, flights: Flight[], source: Slot): Flight[] {
  return flights.filter(f => (f.pickupOf === undefined ? slotOf(at, f.from) === source : f.pickupOf === source));
}

const mainOf = (flights: Flight[], source: Slot): Flight | undefined => flights.find(f => idOf(f.from) === source && f.pickupOf === undefined);

export const viaOf = (action: Tactical, source: Slot): Slot[] => mainOf(action.movement, source)?.via ?? [];

/** The sources with nothing chosen: no ship flies from them, nothing rides on board and nothing is picked up on their way. */
export const emptySources = (at: At, action: Tactical): Slot[] =>
  sourcesOf(at, action).filter(source => !groupOf(at, action.movement, source).some(hasCargo));

export interface RouteArrow { from: Slot; via: Slot[]; to: Slot; pickups: { slot: Slot; count: number }[] }

/** One arrow per source system. */
export function arrowsOf(at: At, action: Tactical): RouteArrow[] {
  const to = action.system;
  if (to === null) return [];
  return sourcesOf(at, action).filter(from => from !== to).map(from => {
    const taken = new Map<string, number>();
    for (const flight of groupOf(at, action.movement, from)) {
      const slot = flight.pickupOf === undefined ? null : slotOf(at, flight.from);
      if (slot !== null) taken.set(slot, (taken.get(slot) ?? 0) + countOf(flight.units));
    }
    return { from, to, via: viaOf(action, from), pickups: [...taken].filter(([, count]) => count > 0).map(([slot, count]) => ({ slot, count })) };
  });
}

/** What the battle of an action cost the player: each kept as a negative count. */
export function lossesOf(turn: Turn): { unit: UnitId; planetId: string | null; count: number }[] {
  const action = tacticalOf(turn);
  const of = (units: UnitCounts | undefined, planetId: string | null) =>
    (Object.keys(units ?? {}) as UnitId[]).filter(unit => (units?.[unit] ?? 0) > 0).map(unit => ({ unit, planetId, count: -(units?.[unit] ?? 0) }));
  return [
    ...of(action.spaceCombat?.[turn.player], null),
    ...Object.entries(action.groundCombat ?? {}).flatMap(([planetId, by]) => of(by[turn.player], planetId)),
  ];
}

/** Nothing of the action is filled in yet, so its system can still change. */
export const isUntouched = (turn: Turn): boolean => {
  const a = tacticalOf(turn);
  const mine = Object.values(a.groundCombat ?? {}).some(by => hasUnits(by[turn.player]));
  return a.movement.length === 0 && a.invasion.length === 0 && !hasUnits(a.production?.units) && !hasUnits(a.spaceCombat?.[turn.player]) && !mine
    && (a.production?.payment.planets.length ?? 0) === 0 && (a.production?.payment.tradeGoods ?? 0) === 0;
};

// ---------------------------------------------------------------------------------------------------------------------
// Editing the route.

/** Sets one structure count of a kind in a record of structures; none left leaves nothing. */
const withStructure = (structures: StructureCounts | undefined, kind: StructureKind, count: number): StructureCounts | undefined => {
  const { [kind]: gone, ...rest } = structures ?? {};
  void gone;
  const next: StructureCounts = count > 0 ? { ...rest, [kind]: count } : rest;
  return Object.keys(next).length > 0 ? next : undefined;
};

const withFlights = (turn: Turn, change: (flights: Flight[]) => Flight[]): Turn => onTactical(turn, a => ({ ...a, movement: change(a.movement) }));

/** Sets the way of a source, adding the source if it is new. What it picked up in systems no longer on the way goes. */
export function withRoute(at: At, turn: Turn, source: Slot, via: Slot[]): Turn {
  return withFlights(turn, flights => {
    const kept = flights.filter(f => f.pickupOf !== source || via.includes(slotOf(at, f.from) ?? ''));
    const known = mainOf(flights, source);
    const { via: old, ...rest } = known ?? { from: placeOf(at, source), units: {} };
    void old;
    const main: Flight = { ...rest, ...(via.length > 0 ? { via } : {}) };
    return known ? kept.map(f => (idOf(f.from) === source && f.pickupOf === undefined ? main : f)) : [...kept, main];
  });
}

export const withoutSource = (at: At, turn: Turn, source: Slot): Turn =>
  withFlights(turn, flights => { const group = groupOf(at, flights, source); return flights.filter(f => !group.includes(f)); });

/** Sets a count in a source's group. `from` is the source, one of its planets, or a system or planet on its way. */
export function withUnitCount(at: At, turn: Turn, source: Slot, from: string, unit: UnitId, count: number): Turn {
  return withFlights(turn, flights => {
    const pickup = slotOf(at, placeOf(at, from)) !== source;
    const same = (f: Flight) => idOf(f.from) === from && (pickup ? f.pickupOf === source : f.pickupOf === undefined);
    const known = flights.find(same);
    const units = withCount(known?.units ?? {}, unit, count);
    const item: Flight = known ? { ...known, units } : { from: placeOf(at, from), units, ...(pickup ? { pickupOf: source } : {}) };
    const next = known ? flights.map(f => (f === known ? item : f)) : [...flights, item];
    // The source's own flight stays even when empty: it holds the arrow and the way.
    return next.filter(f => f !== item || hasCargo(f) || (idOf(f.from) === source && f.pickupOf === undefined));
  });
}

/** Sets how many structures of a kind a source's group takes on board at `from`. */
export function withStructureCount(at: At, turn: Turn, source: Slot, from: string, kind: StructureKind, count: number): Turn {
  return withFlights(turn, flights => {
    const pickup = slotOf(at, placeOf(at, from)) !== source;
    const same = (f: Flight) => idOf(f.from) === from && (pickup ? f.pickupOf === source : f.pickupOf === undefined);
    const known = flights.find(same);
    const { structures: old, ...kept } = known ?? { from: placeOf(at, from), units: {}, ...(pickup ? { pickupOf: source } : {}) };
    const structures = withStructure(old, kind, count);
    const item: Flight = { ...kept, ...(structures ? { structures } : {}) };
    const next = known ? flights.map(f => (f === known ? item : f)) : [...flights, item];
    return next.filter(f => f !== item || hasCargo(f) || (idOf(f.from) === source && f.pickupOf === undefined));
  });
}

/** When the editor closes: a source with nothing chosen goes, and with it the empty flights. */
export function withoutEmptySources(at: At, turn: Turn): Turn {
  return withFlights(turn, flights => flights.filter(f => {
    if (hasCargo(f)) return true;
    return f.pickupOf === undefined && groupOf(at, flights, idOf(f.from)).some(hasCargo);
  }));
}

// ---------------------------------------------------------------------------------------------------------------------
// Editing the landings and the battle.

const withLandings = (turn: Turn, change: (landings: Landing[]) => Landing[]): Turn => onTactical(turn, a => ({ ...a, invasion: change(a.invasion) }));

/** Sets how many of a unit land on a planet; a planet with nothing left to land leaves the landing. */
export function withLanding(turn: Turn, planet: PlanetId, unit: UnitId, count: number): Turn {
  return withLandings(turn, landings => {
    const known = landings.find(l => l.planet === planet && l.from === undefined);
    const rest = landings.filter(l => l !== known);
    const units = withCount(known?.units ?? {}, unit, count);
    return hasUnits(units) || hasStructures(known?.structures) ? [...rest, { ...known, planet, units }] : rest;
  });
}

/** How many of a unit are committed to land on `planet` from the planet `from` (49.2). */
export const landedFrom = (action: Tactical, planet: PlanetId, from: PlanetId, unit: UnitId): number =>
  action.invasion.find(l => l.planet === planet && l.from === from)?.units[unit] ?? 0;

/** Sets how many of a unit are committed to land on `planet` from the planet `from`; a landing with nothing left goes. */
export function withLandingFrom(turn: Turn, planet: PlanetId, from: PlanetId, unit: UnitId, count: number): Turn {
  return withLandings(turn, landings => {
    const known = landings.find(l => l.planet === planet && l.from === from);
    const rest = landings.filter(l => l !== known);
    const units = withCount(known?.units ?? {}, unit, count);
    return hasUnits(units) ? [...rest, { planet, units, from }] : rest;
  });
}

/** Sets how many structures of a kind an action puts on a planet from the space area of its system. */
export function withLandedStructure(turn: Turn, planet: PlanetId, kind: StructureKind, count: number): Turn {
  return withLandings(turn, landings => {
    const known = landings.find(l => l.planet === planet && l.from === undefined);
    const rest = landings.filter(l => l !== known);
    const { structures: old, ...kept } = known ?? { planet, units: {} };
    const structures = withStructure(old, kind, count);
    return hasUnits(kept.units) || structures ? [...rest, { ...kept, ...(structures ? { structures } : {}) }] : rest;
  });
}

/** Units that land, so a ground force lost in space can only have been on its way to a landing. */
const LANDERS: UnitId[] = ['infantry', 'mech'];

const without = <T>(record: Record<string, T> | undefined, key: string): Record<string, T> | undefined => {
  const { [key]: gone, ...rest } = record ?? {};
  void gone;
  return Object.keys(rest).length > 0 ? rest : undefined;
};

/** The player's losses in space, set; none left removes them, and with them the record when nobody else has any. */
function withSpaceLosses(action: Tactical, player: PlayerId, units: UnitCounts | undefined): Tactical {
  const spaceCombat = hasUnits(units) ? { ...action.spaceCombat, [player]: units! } : without(action.spaceCombat, player);
  return { ...action, spaceCombat };
}

/** The player's losses on a planet, set; none left removes them. */
function withGroundLosses(action: Tactical, player: PlayerId, planet: PlanetId, units: UnitCounts | undefined): Tactical {
  const here = { ...action.groundCombat?.[planet] };
  if (hasUnits(units)) here[player] = units!;
  else delete here[player];
  const groundCombat = Object.keys(here).length > 0 ? { ...action.groundCombat, [planet]: here } : without(action.groundCombat, planet);
  return { ...action, groundCombat };
}

/**
 * One more lost (-1) or given back (1), in space or on a planet. A unit this action lands that falls in its battle never
 * makes the landing: it leaves the landing and counts as lost on the way; giving it back lands it there again.
 */
export function withLoss(turn: Turn, unit: UnitId, planet: PlanetId | null, amount: number): Turn {
  return onTactical(turn, action => {
    const player = turn.player;
    const lost = action.spaceCombat?.[player] ?? {};
    const landing = action.invasion.find(l => l.planet === planet);
    if (planet !== null && amount < 0 && landing && (landing.units[unit] ?? 0) > 0) {
      const units = withCount(landing.units, unit, (landing.units[unit] ?? 0) + amount);
      return withSpaceLosses({ ...action, invasion: action.invasion.map(l => (l === landing ? { ...l, units } : l)) }, player, withCount(lost, unit, (lost[unit] ?? 0) - amount));
    }
    const back = action.invasion[0];
    if (planet === null && amount > 0 && back && LANDERS.includes(unit) && (lost[unit] ?? 0) > 0) {
      const losses = withCount(lost, unit, (lost[unit] ?? 0) - amount);
      const units = withCount(back.units, unit, (back.units[unit] ?? 0) + amount);
      return withSpaceLosses({ ...action, invasion: action.invasion.map(l => (l === back ? { ...l, units } : l)) }, player, losses);
    }
    if (planet === null) return withSpaceLosses(action, player, withCount(lost, unit, (lost[unit] ?? 0) - amount));
    const here = action.groundCombat?.[planet]?.[player] ?? {};
    return withGroundLosses(action, player, planet, withCount(here, unit, (here[unit] ?? 0) - amount));
  });
}

/** One more (or fewer) ship of a type removed beyond the fleet pool (37.3); nothing left removes the field. */
export function withFleetRemoval(turn: Turn, unit: UnitId, amount: number): Turn {
  return onTactical(turn, a => {
    const units = withCount(a.fleetRemovals ?? {}, unit, (a.fleetRemovals?.[unit] ?? 0) + amount);
    return { ...a, fleetRemovals: hasUnits(units) ? units : undefined };
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// Editing the production and its payment.

/**
 * One more built (1) or taken back (-1), in space or on a planet. A ground force built on a planet is kept by planet.
 * `due` is what a set of units owes (the editor asks the board for it); unless the payment was chosen by hand, a change of
 * the price pays anew with `pay`.
 */
export function withProduction(
  turn: Turn, unit: UnitId, planet: PlanetId | null, amount: 1 | -1, isGround: (unit: UnitId) => boolean,
  due: (units: UnitCounts) => number, pay: (cost: number) => Payment, manualPayment: boolean,
): Turn {
  return onTactical(turn, action => {
    const build = action.production ?? { units: {}, payment: { planets: [], tradeGoods: 0 } };
    const units = withCount(build.units, unit, (build.units[unit] ?? 0) + amount);
    const cost = due(units);
    const seed = !manualPayment && cost !== due(build.units);
    const { [planet ?? '']: onPlanet = {}, ...others } = build.ground ?? {};
    const here = withCount(onPlanet, unit, (onPlanet[unit] ?? 0) + amount);
    const ground = Object.keys(here).length > 0 ? { ...others, [planet ?? '']: here } : others;
    const next: typeof build = { ...build, units, ...(seed ? { payment: pay(cost) } : {}) };
    if (planet !== null && isGround(unit)) {
      if (Object.keys(ground).length > 0) next.ground = ground;
      else delete next.ground;
    }
    return { ...action, production: next };
  });
}

/** The payment of the action's production, set by hand. */
export const withProductionPayment = (turn: Turn, payment: Payment): Turn =>
  onTactical(turn, a => ({ ...a, production: { ...(a.production ?? { units: {} }), payment } }));

/** The custodians payment seeded or dropped to follow the landing: automatic unless the ability frees the price (`landing` says whether the action lands on Mecatol Rex while the token stands). */
export function withCustodiansPayment(turn: Turn, landing: boolean, free: boolean, pay: () => Payment): Turn {
  return onTactical(turn, action => {
    if (!landing) return action.custodians ? { ...action, custodians: undefined } : action;
    if (action.custodians !== undefined || free) return action;
    return { ...action, custodians: pay() };
  });
}

/** The active system of the action, chosen on the map. */
export const withSystem = (turn: Turn, system: Slot): Turn => onTactical(turn, a => ({ ...a, system }));
