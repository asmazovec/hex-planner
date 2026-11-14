/** The queue of saves of the open game: writes run one after another, so an older state can never overwrite a newer one. */
import type { SavedGame } from '../game/save';
import { gameOf } from '../storage/legacySave';
import { saveGame } from '../storage/db';

let pending: Promise<void> = Promise.resolve();

/** Saves the game after every save queued before it; `onResult` gets null, or why the save failed. */
export function queueSave(saved: SavedGame, onResult: (error: string | null) => void): void {
  pending = pending.then(async () => {
    try {
      await saveGame(gameOf(saved));
      onResult(null);
    } catch (error) {
      onResult(error instanceof Error ? error.message : String(error));
    }
  });
}

/** Resolves once every save queued so far has finished. */
export const flushSaves = (): Promise<void> => pending;
