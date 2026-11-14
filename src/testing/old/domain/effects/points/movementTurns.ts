import type { DataPack, Entry, Game, Warning } from '../../../../../domain/types';
import type { GameState } from '../../types';

/** What a component is asked with when a system is activated: the owner of the component may be any player. */
export interface ActivationTurn {
  /** The component, as held (a note under its address). */
  id: string;
  /** The game as the owner of the component sees it. */
  game: Game;
  pack: DataPack;
  /** The player whose component it is, and the player who activates (`me` or an opponent's id). */
  owner: string;
  activator: string;
  /** The entry that activates, and the system. */
  entry: Entry;
  systemId: string;
  /** The owner's state, and the activator's (the same object when they are one). */
  state: GameState;
  activeState: GameState;
  /** My state. */
  shared: GameState;
  warnings: Warning[];
}
declare module '../../../../../domain/effects/types' {
  interface Ability {
    /** Asked of every player's components in force when a system is activated. */
    onActivate?: (turn: ActivationTurn) => void;
  }
}

declare module '../../types' {
  interface GameState {
/** Wormhole tokens put on the map during the plan (Creuss tokens, Gamma Wormhole): the token's type, then the slot. Kept on my state, which holds what belongs to the whole game. */
    wormholeTokens?: Record<string, string>;
  }
}

