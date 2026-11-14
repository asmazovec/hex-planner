import type { DataPack, Warning } from '../../../../../domain/types';
import type { Game } from '../../types';
import type { GameState } from '../../types';

/** What a component is asked with when a player lands ground forces on a planet. */
export interface LandingTurn {
  id: string;
  /** The game as the owner of the component sees it. */
  game: Game;
  pack: DataPack;
  owner: string;
  /** The player who lands, `me` or an opponent's id. */
  lander: string;
  planetId: string;
  /** How many ground forces of the lander are set on the planet by this landing. */
  landed: number;
  /** The owner's state, and the lander's (the same object when they are one). */
  state: GameState;
  landerState: GameState;
  shared: GameState;
  warnings: Warning[];
}


declare module '../../../../../domain/effects/types' {
  interface Ability {
    /** Asked of every player's components in force when someone lands on a planet. */
    onLanding?: (turn: LandingTurn) => void;
  }
}
