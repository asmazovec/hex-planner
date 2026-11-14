import type { CardEntry } from '../../../../../domain/strategy';
import type { DataPack, Game, Warning } from '../../../../../domain/types';
import type { GameState } from '../../types';
/** One card entry being replayed. */
export interface CardTurn {
  game: Game;
  state: GameState;
  entry: CardEntry;
  pack: DataPack;
  round: CardRound;
  /** `me` or the opponent whose entry this is. */
  player: string;
  primary: boolean;
  warnings: Warning[];
}

/** What the round knows of the cards while it is replayed. Players are `me` and the opponents' ids. */
export interface CardRound {
  /** The cards a player holds this round; only mine are planned, so a rival holds none known. */
  held: Record<string, number[]>;
  /** The primaries of held cards resolved so far, by player. */
  primaries: Record<string, number[]>;
  /** The secondaries resolved so far, by player. */
  secondaries: Record<string, number[]>;
  /** The players whose secondary of a card spends no token, by card: Trade's primary chooses them (92.4). */
  freeSecondary: Record<number, string[]>;
  /** Every player's state, by player. */
  states: Record<string, GameState>;
}

declare module '../../../../../domain/effects/types' {
  interface EffectTurn {
    /** The round's cards: who holds and has played which, and `freeSecondary` and `states` of every player. Set on the entries of a round. */
    cards?: CardRound;
  }
}
