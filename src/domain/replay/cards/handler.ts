/** What one strategy card does: its cost, the tokens it gives, its own effects and checks. The replay calls these; so does the editor. */
import type { PaymentKind } from '../../payment';
import type { CardEntry } from '../../strategy';
import type { TokensOn } from '../../readers';
import type { DataPack, ExpansionId, GameState } from '../../types';
import type { Shelf } from '../../shelf';

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

/** Whose play it is, for a card whose numbers a component of the player changes (Brilliant, research cost). */
export interface CardWho { pack: DataPack; faction: string }

export interface CardCost { kind: PaymentKind; amount: number }

export interface CardHandler {
  /** Its secondary spends no strategy token (Leadership, 20.5.1). */
  freeSecondary?: boolean;
  /** What it owes in resources or influence, given what the player already holds; without it, what its production costs. */
  cost?: (entry: CardEntry, held: Shelf, who?: CardWho) => CardCost;
  /** What it places is placed, not produced: the units entered on it are paid for with nothing (Titans, Hecatoncheires). */
  placesFree?: (entry: CardEntry, who: CardWho) => boolean;
  /** The tokens it gives to distribute; `before`, the state before the entry, when the board is known. */
  freeTokens?: (entry: CardEntry, expansions: ExpansionId[], before?: TokensOn) => number;
}
