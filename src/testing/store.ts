/**
 * The open game and the setup of the store read and written as the old `Game`, for the tests that still build or inspect
 * one: the store itself holds only the kernel's `SavedGame`.
 */
import { useGame } from '../state/gameStore';
import type { Game } from './old/domain/types';
import { draftOf, gameOf, savedFor } from './legacySave';

/** Opens a game of the old shape in the store, or closes the open one with `null`. */
export const seedGame = (game: Game | null): void => useGame.setState({ saved: game === null ? null : savedFor(game) });

/** Sets the draft of the store from a game of the old shape: a game still being set up, with no sheet written yet. */
export const seedDraft = (game: Game): void => useGame.setState({ draftSaved: draftOf(game) });

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

const tableNow = () => {
  const state = useGame.getState();
  return (state.saved ?? state.draftSaved).table;
};

/** The player at the tablet of the store, in the open game or else in the draft: the old model calls them `me`. */
export const viewerNow = (): string => tableNow().viewer;

/** The player an old test names by position among the opponents: the seated players other than the one at the tablet, in the order of the table. */
export const opponentAt = (index: number): string => tableNow().players.filter(p => p.seat < 100 && p.id !== tableNow().viewer)[index]?.id ?? '';

/** The player an old test names by position in the old list: the one at the tablet first, then the opponents. */
export const playerAt = (index: number): string => (index === 0 ? viewerNow() : opponentAt(index - 1));
