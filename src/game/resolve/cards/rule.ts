/**
 * What one strategy card is to the kernel: its numbers (cost, token cost, the tokens it gives, what it places free)
 * are the pure ones of `domain/replay/cards` and `domain/strategy`, imported; its own effects and checks are `apply`,
 * which reads the board through queries and emits events. `play.ts` runs the steps every card has (the play, the token,
 * the payment, the tokens given, the planets readied) and calls `apply` where the card's own effect belongs.
 */
import type { CardEntry } from '../../../domain/strategy';
import type { CardEffects } from '../../../domain/types';
import type { Ctx } from '../context';

export interface CardPlay {
  ctx: Ctx;
  entry: CardEntry;
  /** The effects the player entered for the card. */
  effects: CardEffects;
  primary: boolean;
}

export interface CardRule {
  /** The card's own effects and checks, after the common steps (token, payment, tokens given, planets readied). */
  apply?: (play: CardPlay) => void;
}
