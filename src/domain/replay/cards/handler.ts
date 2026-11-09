/** What one strategy card does: its cost, the tokens it gives, its own effects and checks. The replay calls these; so does the editor. */
import type { PaymentKind } from '../../payment';
import type { CardEntry } from '../../strategy';
import type { DataPack, ExpansionId, Game, GameState, UpgradeId, Warning } from '../../types';

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

export interface CardCost { kind: PaymentKind; amount: number }

export interface CardHandler {
  /** Its secondary spends no strategy token (Leadership, 20.5.1). */
  freeSecondary?: boolean;
  /** What it owes in resources or influence, given the upgrades already owned; without it, what its production costs. */
  cost?: (entry: CardEntry, owned: UpgradeId[]) => CardCost;
  /** The tokens it gives to distribute; `before`, the state before the entry, when the board is known. */
  freeTokens?: (entry: CardEntry, expansions: ExpansionId[], before?: GameState) => number;
  /** Its own effects and checks, after the common steps (token, payment, distribution, readying, upgrades). */
  apply?: (turn: CardTurn) => void;
}
