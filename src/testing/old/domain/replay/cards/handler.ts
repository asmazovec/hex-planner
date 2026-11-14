import type { CardEntry } from '../../../../../domain/strategy';
import type { DataPack, Game, GameState, Warning } from '../../../../../domain/types';
import { type CardRound } from '../../../../../domain/replay/cards/handler';
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
