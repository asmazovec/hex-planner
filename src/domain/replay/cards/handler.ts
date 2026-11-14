/** What one strategy card does: its cost, the tokens it gives, its own effects and checks. The replay calls these; so does the editor. */
import type { PaymentKind } from '../../payment';
import type { CardEntry } from '../../strategy';
import type { TokensOn } from '../../readers';
import type { DataPack, ExpansionId } from '../../types';
import type { Shelf } from '../../shelf';

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
