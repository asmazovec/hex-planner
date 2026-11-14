/**
 * The saved game, as the kernel holds a game: the table, what the user placed by hand before the plan (`StartEdits`),
 * and the plans as rounds of turns. The format of the file and of the saves in the browser (`ti4-planner/3`).
 * The types are plain JSON.
 */
import type { StartHoldings } from '../domain/types';
import type { Round } from './round';
import type { PlanetId, PlayerId, Slot, Table, UnitCounts } from './types';

export const SAVED_FORMAT = 'ti4-planner/3';

/**
 * What stands on the board before the first round beyond the faction sheets, written by hand: the points, what the
 * players hold, the units and planets of the others, structures, the expedition and the Fracture. Applied after `setup(table)`.
 */
export interface StartEdits {
  /** Starting victory points, by player. */
  points: Record<PlayerId, number>;
  /** What each player holds before the plan: the technologies of the faction sheet and the rest set by hand. */
  holdings: Record<PlayerId, StartHoldings>;
  /** The units of the other players in the space of a system, by slot, then player; ground forces only in a system without planets. */
  units: Record<Slot, Record<PlayerId, UnitCounts>>;
  /** The ground forces of the other players on a planet, by planet, then player. */
  ground: Record<PlanetId, Record<PlayerId, UnitCounts>>;
  /** Who controls the planets someone has taken at the start. */
  control: Record<PlanetId, PlayerId>;
  /** Planets with a space dock, and the number of PDS on a planet: owned by whoever controls the planet. */
  docks: PlanetId[];
  pds: Record<PlanetId, number>;
  /** The slices of the expedition by who took them (null: free), and the slot of Thunder's Edge. */
  expedition: { slices: Record<string, PlayerId | null>; thundersEdgeSystem: Slot | null };
  /** The Fracture: whether it is open, where its ingress is and its seat; while open, its tiles by slot. */
  fracture: { active: boolean; ingress: Slot[]; seat: number | null; tiles?: Record<Slot, string> };
}

export interface SavedPlan { id: string; name: string; rounds: Round[] }

export interface SavedGame {
  id: string;
  name?: string;
  format: typeof SAVED_FORMAT;
  /** Counts the changes of the save within the format, from 1. */
  schemaVersion: number;
  dataVersion: string;
  table: Table;
  start: StartEdits;
  plans: SavedPlan[];
  activePlanId: string;
}
