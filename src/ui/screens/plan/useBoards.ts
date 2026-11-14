import { useMemo } from 'react';
import { timelineOf } from '../../../state/projection';
import type { DataPack } from '../../../domain/types';
import type { SavedGame } from '../../../game/save';
import type { Board } from '../../../game/types';
import type { KernelView } from '../../plan/kernelView';

type Filter = 'now' | 'forecast';

export interface Boards {
  /** The kernel's board just before an entry, whoever it belongs to: the whole table. */
  boardOf: (entryId: string, filter?: Filter) => Board;
  /** The table and the board of the kernel just before an entry: what the editors read names, notes, reminders and warnings from. */
  view: (entryId: string, filter?: Filter) => KernelView;
}

/**
 * The boards of the plan before each entry, each entry and filter counted once for a version of the saved game and plan:
 * the editors, the map, the flight and the list ask for the same entry many times a render.
 */
export function useBoards(saved: SavedGame | null, planId: string | undefined, pack: DataPack): Boards {
  return useMemo(() => {
    const boardOf = (entryId: string, filter: Filter = 'forecast'): Board => {
      const line = timelineOf(saved!, planId!, filter, pack);
      return line.byTurn.get(entryId)?.before ?? line.end;
    };
    const views = new Map<string, KernelView>();
    const view = (entryId: string, filter: Filter = 'forecast'): KernelView => {
      const at = boardOf(entryId, filter);
      const kept = views.get(`${filter}:${entryId}`);
      if (kept && kept.board === at) return kept;
      const made = { table: timelineOf(saved!, planId!, filter, pack).table, board: at };
      views.set(`${filter}:${entryId}`, made);
      return made;
    };
    return { boardOf, view };
  }, [saved, planId, pack]);
}
