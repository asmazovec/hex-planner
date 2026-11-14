/**
 * What the editors of a tactical action read of the board before it, and the edits that need the board: who stands where,
 * what a flight can take, what stands after the battle, what can land, the production with its price and payment.
 * The same answers as the old `Game`/`GameState` functions of `src/domain/tactical.ts`, over the table, the board and the turn.
 */
import { addUnits, hasUnits, isGround, unitsIn } from '../../domain/tactical';
import { CUSTODIANS_COST, MECATOL_PLANETS } from '../../domain/mecatol';
import { adjacentTo, boardSlots, shipSpeed } from '../../domain/movement';
import { isOnMap, planetsOf, sourceSlot, systemSlots, tileIdOf } from '../../domain/replay/board';
import { holderIn } from '../abilities/registry';
import { autoPayOn, productionDueOnBoard } from '../planQueries';
import { groundOn, shipsIn, tokensOnMapOf } from '../queries';
import { mapSource } from '../space';
import { inForceOf } from '../../domain/effects/registry';
import type { Turn, Flight, Payment, Tactical } from '../actions';
import type { Board, DataPack, PlanetId, PlayerId, Slot, StructureCounts, StructureKind, Table, UnitCounts, UnitId } from '../types';
import { groupOf, onTactical, sourcesOf, tacticalOf, withCustodiansPayment, withProduction, type At } from './tactical';

const idOf = (place: Flight['from']): string => ('planet' in place ? place.planet : place.slot);

/** The shipping of the action's production to another system, or back to the active one (`undefined`). */
export const withShipsTo = (turn: Turn, slot: Slot | undefined): Turn =>
  onTactical(turn, a => {
    const { shipsTo: gone, ...rest } = a.production ?? { units: {}, payment: { planets: [], tradeGoods: 0 } };
    void gone;
    return { ...a, production: slot === undefined ? rest : { ...rest, shipsTo: slot } };
  });

/** `withProduction` with the price and the payment the board gives: the price the check asks, the planets that pay it. */
export const withProductionOn = (
  table: Table, board: Board, pack: DataPack, turn: Turn, unit: UnitId, planet: PlanetId | null, amount: 1 | -1, manualPayment: boolean,
): Turn =>
  withProduction(
    turn, unit, planet, amount, u => isGround(pack, u),
    units => productionDueOnBoard(table, board, pack, turn.player, units, turn),
    cost => autoPayOn(table, board, pack, turn.player, cost, 'resources'), manualPayment,
  );

/** The custodians payment as the landing makes it: seeded from the influence of the board, dropped without a landing. */
export const withCustodiansOn = (table: Table, board: Board, pack: DataPack, turn: Turn, free: boolean): Turn =>
  withCustodiansPayment(turn, custodiansLanding(board, turn, pack) !== undefined, free, () => autoPayOn(table, board, pack, turn.player, CUSTODIANS_COST, 'influence'));

/** What the editors count a place by: the map the table and the board give, and the pack. */
export const atOf = (table: Table, board: Board, pack: DataPack): At => ({ map: mapSource(table, board), pack });

/** The units of a player at a place of the board: ground forces of a planet, or everything standing in the space of a system. */
export const poolAt = (board: Board, pack: DataPack, player: PlayerId, from: string): UnitCounts =>
  from in pack.planets ? groundOn(board, from, player) : shipsIn(board, from, player);

/** How many structures of a kind stand at a place before the action: on a planet of the player, or in the space area of a system. */
export const structuresAt = (board: Board, pack: DataPack, player: PlayerId, from: string, kind: StructureKind): number =>
  (from in pack.planets
    ? (board.planets[from]?.owner === player ? board.planets[from].structures[kind] ?? 0 : 0)
    : board.systems[from]?.afloat[player]?.[kind] ?? 0);

/** How many of a unit a source's group takes from one place: its space, one of its planets, or a place on its way. */
export const pickedFrom = (group: Flight[], from: string, unit: UnitId): number =>
  group.filter(f => idOf(f.from) === from).reduce((sum, f) => sum + (f.units[unit] ?? 0), 0);

/** How many structures of a kind a source's group takes from one place. */
export const pickedStructures = (group: Flight[], from: string, kind: StructureKind): number =>
  group.filter(f => idOf(f.from) === from).reduce((sum, f) => sum + (f.structures?.[kind] ?? 0), 0);

/** What stands at a place before the action, less what the other routes of the action take from it. */
export function availableFor(at: At, board: Board, turn: Turn, source: Slot, from: string, unit: UnitId): number {
  const action = tacticalOf(turn);
  const group = groupOf(at, action.movement, source);
  const elsewhere = action.movement.filter(f => idOf(f.from) === from && !group.includes(f)).reduce((sum, f) => sum + (f.units[unit] ?? 0), 0);
  return (poolAt(board, at.pack, turn.player, from)[unit] ?? 0) - elsewhere;
}

/** The structures of a kind at a place before the action, less what the other routes of the action take from it. */
export function structuresFor(at: At, board: Board, turn: Turn, source: Slot, from: string, kind: StructureKind): number {
  const action = tacticalOf(turn);
  const group = groupOf(at, action.movement, source);
  const elsewhere = action.movement.filter(f => idOf(f.from) === from && !group.includes(f)).reduce((sum, f) => sum + (f.structures?.[kind] ?? 0), 0);
  return structuresAt(board, at.pack, turn.player, from, kind) - elsewhere;
}

/** Whether a unit flies by itself at this point of the plan; everything else rides as cargo. */
export function fliesOn(table: Table, board: Board, pack: DataPack, player: PlayerId, unit: UnitId): boolean {
  const def = pack.units[unit];
  if (!def || def.ground) return false;
  const faction = table.players.find(p => p.id === player)?.faction ?? '';
  return !def.fighter || shipSpeed({ faction }, 'fighter', holderIn(table, board, player), pack) !== null;
}

/** Splits units into the ships that fly by themselves and what rides on board. */
export function splitFlightOn(table: Table, board: Board, pack: DataPack, player: PlayerId, units: UnitCounts): { ships: UnitCounts; cargo: UnitCounts } {
  const ships: UnitCounts = {};
  const cargo: UnitCounts = {};
  for (const unit of Object.keys(units) as UnitId[]) (fliesOn(table, board, pack, player, unit) ? ships : cargo)[unit] = units[unit];
  return { ships, cargo };
}

/**
 * The active system after the flight and the battle, before the landing (89.3, 89.4): what arrived, what the battle
 * left, and the ground forces that can land, those still assigned to a landing among them.
 */
export function afterBattle(pack: DataPack, turn: Turn, board: Board, order: UnitId[]): { fighting: UnitId[]; left: UnitCounts; landable: UnitId[] } {
  const action = tacticalOf(turn);
  const arrived = addUnits(shipsIn(board, action.system ?? '', turn.player), unitsIn(action.movement));
  const lost = action.spaceCombat?.[turn.player] ?? {};
  const fighting = order.filter(u => pack.units[u] && ((arrived[u] ?? 0) > 0 || (lost[u] ?? 0) > 0));
  const left = Object.fromEntries(fighting.map(u => [u, Math.max(0, (arrived[u] ?? 0) - (lost[u] ?? 0))])) as UnitCounts;
  const landed = unitsIn(action.invasion.filter(l => l.from === undefined));
  const landable = order.filter(u => isGround(pack, u) && ((left[u] ?? 0) > 0 || (landed[u] ?? 0) > 0));
  return { fighting, left, landable };
}

/** The structures that stand in the space area of the active system once the flights arrived: those already there and those they bring. */
export function structuresArrived(turn: Turn, board: Board): StructureCounts {
  const action = tacticalOf(turn);
  const sum: StructureCounts = { ...board.systems[action.system ?? '']?.afloat[turn.player] };
  for (const flight of action.movement) {
    if (idOf(flight.from) === action.system) continue;
    for (const kind of Object.keys(flight.structures ?? {}) as StructureKind[]) sum[kind] = (sum[kind] ?? 0) + (flight.structures?.[kind] ?? 0);
  }
  return sum;
}

/** The Mecatol Rex planet the action lands ground forces on while the custodians token still stands on it, or undefined. */
export function custodiansLanding(board: Board, turn: Turn, pack: DataPack): string | undefined {
  if (!board.common.custodians) return undefined;
  return tacticalOf(turn).invasion.find(l => MECATOL_PLANETS.includes(l.planet) && board.planets[l.planet]?.owner === undefined
    && (Object.keys(l.units) as UnitId[]).some(unit => l.units[unit] && isGround(pack, unit)))?.planet;
}

/** The planets whose ground forces a component lets the player commit to land: those of the active system and of adjacent systems without their token that hold ground forces of theirs. */
export function commitSourcesOn(table: Table, board: Board, pack: DataPack, player: PlayerId, target: Slot): { planetId: string; units: UnitCounts }[] {
  const map = mapSource(table, board);
  const tokens = tokensOnMapOf(board, player);
  const slots = new Set([target, ...adjacentTo(map, target, pack).filter(slot => !tokens.includes(slot))]);
  return systemSlots(map).filter(slot => slots.has(slot)).flatMap(slot => planetsOf(map, slot, pack))
    .map(planetId => {
      const units: UnitCounts = {};
      for (const [unit, count] of Object.entries(groundOn(board, planetId, player)) as [UnitId, number][]) if (count > 0 && pack.units[unit]?.ground) units[unit] = count;
      return { planetId, units };
    })
    .filter(source => Object.keys(source.units).length > 0);
}

/** Whether a system can be the source of a route: it has units of the player's, in space or on its planets. */
export const isValidSource = (table: Table, board: Board, pack: DataPack, player: PlayerId, slot: Slot): boolean =>
  hasUnits(shipsIn(board, slot, player)) || planetsOf(mapSource(table, board), slot, pack).some(id => hasUnits(groundOn(board, id, player)));

/** The systems that can start a route. */
export const sourceSystemsOn = (table: Table, board: Board, pack: DataPack, player: PlayerId): Slot[] =>
  boardSlots(mapSource(table, board), pack).filter(slot => isValidSource(table, board, pack, player, slot));

/** The systems a tap can make the system of an action: any tile on the map. */
export const tileSystemsOn = (table: Table, board: Board, pack: DataPack): Slot[] => {
  const map = mapSource(table, board);
  return boardSlots(map, pack).filter(slot => Boolean(pack.tiles[tileIdOf(map, slot)]));
};

/** Whether units may be picked up in a system: not where the player's command token lies, unless it is the active system (95.3). */
export const pickupAllowedOn = (board: Board, player: PlayerId, target: Slot, slot: Slot): boolean =>
  slot === target || !(board.systems[slot]?.tokens.includes(player) ?? false);

/** The systems a tactical turn touches, for the camera: its active system, its sources and the ways between them, kept to those on the board. */
export function tacticalSystems(at: At, turn: Turn): Slot[] {
  const action = tacticalOf(turn);
  const slots: (string | null | undefined)[] = [action.system, ...sourcesOf(at, action)];
  for (const flight of action.movement) slots.push(...(flight.via ?? []), sourceSlot(at.map, at.pack, idOf(flight.from)));
  const known = new Set(boardSlots(at.map, at.pack));
  return [...new Set(slots)].filter((s): s is string => Boolean(s) && (isOnMap(at.map, s as string) || known.has(s as string)));
}

/** What the battles on planets cost the acting player: planet, then units. */
export function groundLossesOf(turn: Turn): Record<PlanetId, UnitCounts> {
  const lost: Record<PlanetId, UnitCounts> = {};
  for (const [planet, by] of Object.entries(tacticalOf(turn).groundCombat ?? {})) if (by[turn.player]) lost[planet] = by[turn.player];
  return lost;
}

/** What the battle in space cost the acting player. */
export const spaceLossesOf = (turn: Turn): UnitCounts => tacticalOf(turn).spaceCombat?.[turn.player] ?? {};

/** The payment of the custodians token, set by hand (nothing left removes it). */
export const withCustodiansSet = (turn: Turn, payment: Payment | undefined): Turn => onTactical(turn, a => ({ ...a, custodians: payment }));

/** Whether a component in force lets the player land on Mecatol Rex without paying the custodians token (Blood Ties): the payment is then not seeded. */
export const custodiansFreeOn = (table: Table, board: Board, pack: DataPack, player: PlayerId): boolean =>
  inForceOf(pack, holderIn(table, board, player), effect => effect.permit?.some(w => w.code === 'custodians') ?? false).length > 0;

/** The flights as the places of a warning name them: the source or planet each takes from. */
export const movesOf = (action: Tactical): { from: string; units: UnitCounts; pickupOf?: Slot }[] =>
  action.movement.map(f => ({ from: idOf(f.from), units: f.units, ...(f.pickupOf !== undefined ? { pickupOf: f.pickupOf } : {}) }));

/**
 * A source's flight as it reads: the ships that leave it, what rides on board from the source itself, and what is picked
 * up in each system on the way.
 */
export function flightLineOf(table: Table, board: Board, pack: DataPack, turn: Turn, source: Slot): { ships: UnitCounts; board: UnitCounts; stops: Map<Slot, UnitCounts> } {
  const at = atOf(table, board, pack);
  const group = groupOf(at, tacticalOf(turn).movement, source);
  const own = group.filter(f => f.pickupOf === undefined);
  const leaving = own.filter(f => idOf(f.from) === source).reduce((sum, f) => ({ ...sum, ...f.units }), {} as UnitCounts);
  const { ships } = splitFlightOn(table, board, pack, turn.player, leaving);
  const { cargo } = splitFlightOn(table, board, pack, turn.player, unitsIn(own));
  const stops = new Map<Slot, UnitCounts>();
  for (const flight of group) {
    const slot = flight.pickupOf === undefined ? null : sourceSlot(at.map, pack, idOf(flight.from));
    if (slot !== null) stops.set(slot, addUnits(stops.get(slot) ?? {}, flight.units));
  }
  return { ships, board: cargo, stops };
}

/** The systems a turn touches, for the camera and the lit systems: what the same function of the old entry answers (`entrySystems`). */
export function systemsOfTurn(table: Table, board: Board, pack: DataPack, turn: Turn): Slot[] {
  const at = atOf(table, board, pack);
  const slots: (string | null | undefined)[] = [];
  const action = turn.action;
  if (action.kind === 'tactical') {
    slots.push(action.system, ...sourcesOf(at, action));
    for (const flight of action.movement) slots.push(...(flight.via ?? []), sourceSlot(at.map, pack, idOf(flight.from)));
  } else if (action.kind === 'strategic' || action.kind === 'secondary') {
    const { effects } = action;
    slots.push(effects?.systemId, effects?.production?.systemId, ...(effects?.structures ?? []).map(s => sourceSlot(at.map, pack, s.planetId)));
    slots.push(...(effects?.readied ?? []).map(id => sourceSlot(at.map, pack, id)));
  } else if (action.kind === 'correction' || action.kind === 'agenda') {
    slots.push(action.delta.units?.systemId, ...Object.keys(action.delta.ground ?? {}).map(id => sourceSlot(at.map, pack, id)));
  }
  const known = new Set(boardSlots(at.map, pack));
  return [...new Set(slots)].filter((s): s is string => Boolean(s) && (isOnMap(at.map, s as string) || known.has(s as string)));
}
