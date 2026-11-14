import { playerOfKey } from '../../game/keys';
import type { Board, PlayerId, Table } from '../../game/types';

/** What the kernel keeps of the game at the place an editor or a row stands: the table, and the board just before the entry. */
export interface KernelView {
  table: Table;
  board: Board;
}

/** The player an entry's owner key (`me`, a rival's id; none is mine) stands for at the table. */
export const playerOfEntry = (view: KernelView, owner: string | undefined): PlayerId => playerOfKey(view.table, owner ?? 'me') ?? view.table.viewer;
