/**
 * What a component of one player asks about the entry of another, added to the contract of `../types` by declaration
 * merging. The reference is docs/phase4/infra/rivals.md.
 *
 *  - `stopsPassage`: the systems where other players' ships may not pass (Aerie Hololattice), asked of the components in
 *    force of every player but the mover, whenever a route is counted;
 *  - `onLanding`: a cost or a check asked of the components in force of every other player when a player lands on a
 *    planet (Keleres mech): it may change the lander's state and push warnings.
 */
import type { MapSource } from '../../replay/board';
import type { DataPack, Game, GameState, Warning } from '../../types';
import type { Shelf } from '../../shelf';

/** What a component that bars systems to other players' ships is asked with. */
export interface PassageTurn {
  /** The component, as held. */
  id: string;
  pack: DataPack;
  /** The map as the movement code reads it. */
  map: MapSource;
  /** The player whose component it is, and the player whose ships move. */
  owner: string;
  mover: string;
  /** The planets of the owner that hold a structure. */
  structures: readonly string[];
}

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

declare module '../types' {
  interface Ability {
    /** Slots of systems where the mover's ships may not pass: they end a route like other players' ships (58.3.2). */
    stopsPassage?: (turn: PassageTurn) => string[];
    /** Asked of every player's components in force when someone lands on a planet. */
    onLanding?: (turn: LandingTurn) => void;
  }
}

declare module '../../shelf' {
  interface Shelf {
    /** The promissory notes held that lie in the play area, faceup, not in hand (69.3): a subset of `promissory`. A note in hand does nothing, one in play does what its text says until it is returned. */
    inPlay?: string[];
  }
}

/** The notes of the holdings that lie in the play area: those still held. */
export const notesInPlay = (holdings: Shelf): string[] => (holdings.inPlay ?? []).filter(id => holdings.promissory.includes(id));
