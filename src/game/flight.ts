/**
 * A tactical turn's flight as the editors and the map read it: the board at the stages of the action (activated, after the
 * flights, after the landing, after the production), the meters of a source against it, where the production stands,
 * and the map while the ships are on their way. One implementation: what the resolver does, stopped at a stage.
 */
import type { Turn } from './actions';
import { apply } from './apply';
import { placesOn, type ProductionPlace } from '../domain/replay/production';
import { fleetLimit, groundIn, stacksOn } from './queries';
import { playTactical } from './resolve';
import type { Board, DataPack, PlayerId, Slot, Table, UnitCounts } from './types';

export interface FlightRead {
  /** The active system; none while the action is not filled in. */
  target: Slot | null;
  /** The board as the turn found it. */
  before: Board;
  /** After the activation: the token spent and what the components answer to it. */
  activated: Board;
  /** After the flights arrived. */
  moved: Board;
  /** After the landing and the battles, before the production. */
  landed: Board;
  /** After the production, before it is paid: what the fleet pool counts. */
  built: Board;
  /** What each source sent, by source slot. */
  groups: Record<Slot, UnitCounts>;
}

/** The numbers behind `capacityGroup` and `fleetPool`, for the source being edited. */
export interface Meters { group: { load: number; capacity: number }; ships: number; fleet: number }

export function flightOf(table: Table, board: Board, pack: DataPack, turn: Turn): FlightRead {
  const seen = playTactical(table, board, turn, pack);
  const target = turn.action.kind === 'tactical' ? turn.action.system : null;
  return {
    target, before: board, activated: seen.activated ?? board, moved: seen.moved ?? board, landed: seen.landed ?? board, built: seen.built ?? board,
    groups: seen.flown?.groups ?? {},
  };
}

/** The meters of a source: its group's load against the capacity of its ships, the ships the active system holds at the end of the action, and the fleet pool. */
export function metersOf(table: Table, pack: DataPack, flight: FlightRead, player: PlayerId, source: Slot): Meters {
  const stacks = stacksOn(table, flight.before, pack, player);
  const target = flight.target;
  const end = stacksOn(table, flight.built, pack, player);
  return {
    group: stacks.capacityOf(flight.groups[source] ?? {}, null),
    // A moving group keeps its fighters on board (79 note 2): the docks keep fighters only in the system after the move.
    ships: end.fleetOf(flight.built.systems[target ?? '']?.ships[player] ?? {}, target),
    fleet: fleetLimit(table, flight.before, pack, player),
  };
}

/** Where a tactical turn's production stands, as the replay places it: after the turn's own moves and landings. */
export function productionSites(table: Table, board: Board, pack: DataPack, turn: Turn): ProductionPlace[] {
  const action = turn.action;
  if (action.kind !== 'tactical' || action.system === null) return [];
  const landed = flightOf(table, board, pack, turn).landed;
  return placesOn(groundIn(table, landed, pack, turn.player), action.system, action.production?.units ?? {}, pack, action.production?.ground);
}

/** How the active system stands against the fleet pool at the end of the action, in the numbers the meters give (the pool and the ships there). */
export const fleetEnd = (table: Table, pack: DataPack, flight: FlightRead, player: PlayerId): { ships: number; fleet: number } => {
  const meters = metersOf(table, pack, flight, player, '');
  return { ships: meters.ships, fleet: meters.fleet };
};

/** Whether a flight of this turn would show anything: a destination and a unit in its moves. What was entered flies, whether or not it stands at the source. */
export function flies(turn: Turn): boolean {
  const action = turn.action;
  return action.kind === 'tactical' && action.system !== null && action.movement.some(f => Object.values(f.units).some(n => (n ?? 0) > 0));
}

/** The map during a flight: what flies has left its tile, what is picked up on the way leaves when the leader passes; the token of the action stands. It lands with the end of the flight. */
export function inFlight(board: Board, turn: Turn, passed: number[]): Board {
  const action = turn.action;
  if (action.kind !== 'tactical') return board;
  let next = board;
  action.movement.forEach((flight, index) => {
    if (flight.pickupOf !== undefined && !passed.includes(index)) return;
    next = apply(next, { type: 'UnitsRemoved', player: turn.player, at: flight.from, units: flight.units, reason: 'combat' });
  });
  if (!action.free && action.system !== null && !(next.systems[action.system]?.tokens.includes(turn.player) ?? false)) {
    next = apply(next, { type: 'SystemActivated', player: turn.player, system: action.system });
  }
  return next;
}

