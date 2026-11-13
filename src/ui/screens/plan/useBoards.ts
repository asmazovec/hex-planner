import { useMemo } from 'react';
import { boardBefore, timelineOf } from '../../../state/projection';
import { playerState } from '../../../domain/stacks';
import type { DataPack, Game, GameState, Plan } from '../../../domain/types';

type Filter = 'now' | 'forecast';

export interface Boards {
  /** The whole board just before an entry, every opponent in `rivals`. */
  board: (entryId: string, filter?: Filter) => GameState;
  /** The state of the entry's owner just before it: what that entry can move and pay with. */
  before: (entryId: string, filter?: Filter) => GameState;
}

/**
 * The replay up to an entry, each entry and filter counted once for a version of the game and plan: the editors, the
 * map, the flight and the list ask for the same entry many times a render.
 */
export function useBoards(game: Game | null, plan: Plan | undefined, pack: DataPack): Boards {
  return useMemo(() => {
    const boards = new Map<string, GameState>();
    const board = (entryId: string, filter: Filter = 'forecast'): GameState => {
      const key = `${filter}:${entryId}`;
      let found = boards.get(key);
      if (!found) {
        found = boardBefore(timelineOf(game!, plan!, filter, pack), entryId);
        boards.set(key, found);
      }
      return found;
    };
    const ownerOf = (entryId: string) => plan?.rounds.flatMap(r => r.entries).find(e => e.id === entryId)?.owner;
    return { board, before: (entryId, filter) => playerState(board(entryId, filter), ownerOf(entryId)) };
  }, [game, plan, pack]);
}
