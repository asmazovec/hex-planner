import type { Board, Table } from '../../game/types';

/** What the kernel keeps of the game at the place an editor or a row stands: the table, and the board just before the entry. */
export interface KernelView {
  table: Table;
  board: Board;
}
