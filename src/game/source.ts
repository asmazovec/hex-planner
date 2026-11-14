import type { TableFacts } from '../domain/facts';
import type { StartEdits } from './save';
import type { Table } from './types';

/** The game a table came from, kept for the fields the table and board have no place for yet (ingress, the Thunder's Edge system). */
export const SOURCES = new WeakMap<Table, TableFacts>();

/** The hand-placed start of the saved game a table was made for: the Fracture and the Thunder's Edge slot that the map source reads, as `SOURCES` gives them for a table made from an old game. */
export const STARTS = new WeakMap<Table, StartEdits>();
