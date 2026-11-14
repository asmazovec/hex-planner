/** The table and the board the kernel keeps for a game of the old shape, for the tests that render an editor or a block over a `Game`. */
import { timelineOf } from '../../state/projection';
import type { DataPack, Game } from '../../domain/types';
import type { KernelView } from '../plan/kernelView';

/** The table, and the board at the end of the first plan, as it stands now or in the forecast. */
export function kernelEndOf(game: Game, pack: DataPack, filter: 'now' | 'forecast') {
  const { kernel } = timelineOf(game, game.plans[0], filter, pack);
  return { table: kernel.table, board: kernel.end };
}

/** The view just before an entry of the first plan (the end of the plan without one), in the forecast. */
export function kernelViewOf(game: Game, pack: DataPack, entryId?: string): KernelView {
  const { kernel } = timelineOf(game, game.plans[0], 'forecast', pack);
  return { table: kernel.table, board: (entryId === undefined ? undefined : kernel.byTurn.get(entryId)?.before) ?? kernel.end };
}
