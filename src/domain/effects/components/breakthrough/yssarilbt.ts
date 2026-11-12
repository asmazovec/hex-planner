/**
 * Deepgloom Executable (Yssaril, breakthrough): "You can allow other players to use your STALL TACTICS or SCHEMING
 * faction abilities; when you do, you may resolve a transaction with that player. During the action phase, that
 * transaction does not count against the once-per-player transaction limit for that turn."
 *
 * Pass 2: a waiver of `transactionRepeated` (94.1) and of `notNeighbor` (ruling 1) for the turn of another player
 * who uses Stall Tactics or Scheming, named in that entry's `uses`. Today a hint.
 */
import type { ComponentEffect } from '../../types';

export const id = 'breakthrough:yssarilbt';

export const effect: ComponentEffect = {
  tier: 'hint',
  rule: id,
};
