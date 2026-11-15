import type { StartEdits } from './save';
import type { Slot, Table } from './types';

/**
 * What the game of a table says beside the table itself, which the map and the count of players read: the Fracture as it
 * is set up, the slot of Thunder's Edge, and how many players the game began with when that is not the number seated.
 */
export interface TableStart {
  fracture: StartEdits['fracture'];
  expedition: { thundersEdgeSystem: Slot | null };
  playerCount?: number;
}

/** The start of the game a table was made for: the saved game's hand-placed start (`startOfSaved`), or what a test gives. */
export const STARTS = new WeakMap<Table, TableStart>();
