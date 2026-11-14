/**
 * The open game and the setup of the store read and written as the old `Game`, for the tests that still build or inspect
 * one: the store itself holds only the kernel's `SavedGame`.
 */
import { useGame } from '../state/gameStore';
import type { Game } from '../domain/types';
import { gameOf, savedFor } from './legacySave';

/** Opens a game of the old shape in the store, or closes the open one with `null`. */
export const seedGame = (game: Game | null): void => useGame.setState({ saved: game === null ? null : savedFor(game) });

/** Sets the draft of the store from a game of the old shape. */
export const seedDraft = (game: Game): void => useGame.setState({ draftSaved: savedFor(game) });

/** The open game read as the old `Game`; the same object for the same saved game. */
export const gameNow = (): Game | null => {
  const { saved } = useGame.getState();
  return saved ? gameOf(saved) : null;
};

/** The draft read as the old `Game`. */
export const draftNow = (): Game => gameOf(useGame.getState().draftSaved);

/** For a component under test: the open game as the old `Game`, drawn again when the saved game changes. */
export const useOldGame = (): Game | null => {
  const saved = useGame(s => s.saved);
  return saved ? gameOf(saved) : null;
};
