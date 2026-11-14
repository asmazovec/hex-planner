/** The table and the board the kernel keeps for a game of the old shape, for the tests that render an editor or a block over a `Game`. */
import { boardAtRound, timelineOf } from '../../testing/projection';
import type { DataPack, Game, Warning } from '../../domain/types';
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

/** What the plan list takes of a game of the old shape: the kernel's turns of a round, the board just before an entry and the board at the end of the round. */
export function listOf(game: Game, pack: DataPack, roundIndex = 0, warnings: Record<string, Warning[]> = {}) {
  const line = timelineOf(game, game.plans[0], 'forecast', pack);
  const round = game.plans[0].rounds[roundIndex];
  return {
    pack, viewOf: (id: string) => kernelViewOf(game, pack, id), roundNo: round.number, warnings,
    turns: line.kernel.rounds.find(r => r.number === round.number)?.turns ?? [],
    end: { table: line.kernel.table, board: boardAtRound(line, round.number) },
  };
}
