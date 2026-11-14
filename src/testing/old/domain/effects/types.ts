import type { DataPack, Warning } from '../../../../domain/types';
import type { Game, Entry } from '../types';
import type { GameState } from '../types';

/** One component being played by an entry, with what the player chose for it. */
export interface EffectTurn {
  game: Game;
  /** The state of the player whose entry this is. */
  state: GameState;
  /** My state, which holds what belongs to the whole game: laws, revealed objectives, attachments. */
  shared: GameState;
  /** The entry that plays it: a component action, or any entry that names it in `uses`. */
  entry: Entry;
  /** The component being played, by id as the entry names it (a note under its address). */
  id: string;
  /** Whose entry: `me` or an opponent id. */
  player: string;
  /**
   * Every player's state by `me` or opponent id, the owner's among them (the same object as `state`): what moves a
   * card or a token from another player (Spy Net, Insubordination) reads and changes them here.
   */
  states: Record<string, GameState>;
  /** What the player chose for this component: the entry's `choices` for its component action, then its `useChoices[id]` (`choicesFor`). */
  choices: Record<string, string | number>;
  /** False when the replay already warned that the owner does not hold the component or that it is exhausted: a play may then do nothing. */
  held: boolean;
  pack: DataPack;
  warnings: Warning[];
  /** Set by the game kernel: the strategy tokens this play spent, told to the components in force when the play is done. */
  spent?: { count: number; secondary: boolean }[];
}
